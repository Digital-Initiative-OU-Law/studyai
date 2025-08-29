// Comprehensive Puppeteer test for StudyAI application
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Test data
const TEST_USERS = {
  student: {
    email: 'student@test.com',
    password: 'student123'
  },
  professor: {
    email: 'professor@test.com',
    password: 'professor123'
  },
  admin: {
    email: 'admin@test.com',
    password: 'admin123'
  }
};

// Ensure screenshots directory exists
const screenshotsDir = path.join(__dirname, '..', 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

class TestRunner {
  constructor() {
    this.browser = null;
    this.page = null;
    this.testResults = [];
    this.currentTest = '';
  }

  async initialize() {
    console.log('🚀 Initializing browser...');
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1280, height: 800 }
    });
    this.page = await this.browser.newPage();
    
    // Set up console and error logging
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        this.logError(`Console error: ${msg.text()}`);
      }
    });
    
    this.page.on('pageerror', error => {
      this.logError(`Page error: ${error.message}`);
    });
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
    this.testResults.push({ timestamp, type, message, test: this.currentTest });
  }

  logError(message) {
    this.log(message, 'error');
  }

  logSuccess(message) {
    this.log(message, 'success');
  }

  async screenshot(name) {
    const filepath = path.join(screenshotsDir, `${name}.png`);
    await this.page.screenshot({ path: filepath, fullPage: true });
    this.log(`Screenshot saved: ${name}.png`);
  }

  async testLogin(userType = 'student') {
    this.currentTest = `Login as ${userType}`;
    this.log(`Testing login for ${userType}...`);
    
    try {
      // Navigate to login page
      await this.page.goto('http://localhost:3001/login', { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      await this.screenshot(`01-login-page-${userType}`);
      
      // Check if login form exists
      const emailInput = await this.page.$('input[type="email"]');
      const passwordInput = await this.page.$('input[type="password"]');
      
      if (!emailInput || !passwordInput) {
        this.logError('Login form not found');
        return false;
      }
      
      // Fill in login credentials
      const user = TEST_USERS[userType];
      await this.page.type('input[type="email"]', user.email);
      await this.page.type('input[type="password"]', user.password);
      
      await this.screenshot(`02-login-filled-${userType}`);
      
      // Click submit button
      const submitButton = await this.page.$('button[type="submit"]');
      if (!submitButton) {
        this.logError('Submit button not found');
        return false;
      }
      
      // Click and wait for navigation
      await Promise.all([
        this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {}),
        submitButton.click()
      ]);
      
      await new Promise(r => setTimeout(r, 2000)); // Wait for any redirects
      
      const currentUrl = this.page.url();
      await this.screenshot(`03-after-login-${userType}`);
      
      // Check if login was successful
      if (currentUrl.includes('/role') || currentUrl.includes('/student') || currentUrl.includes('/professor')) {
        this.logSuccess(`Login successful for ${userType}`);
        return true;
      } else if (currentUrl.includes('/login')) {
        // Check for error message
        const errorMessage = await this.page.$eval('.text-red-500, .error, .alert-danger', 
          el => el ? el.textContent : null).catch(() => null);
        if (errorMessage) {
          this.logError(`Login failed with error: ${errorMessage}`);
        } else {
          this.logError('Login failed - still on login page');
        }
        return false;
      }
      
      this.log(`Redirected to: ${currentUrl}`);
      return true;
      
    } catch (error) {
      this.logError(`Login test failed: ${error.message}`);
      return false;
    }
  }

  async testRoleSelection() {
    this.currentTest = 'Role Selection';
    this.log('Testing role selection page...');
    
    try {
      const currentUrl = this.page.url();
      
      // If not on role page, navigate to it
      if (!currentUrl.includes('/role')) {
        await this.page.goto('http://localhost:3001/role', { 
          waitUntil: 'networkidle2',
          timeout: 30000 
        });
      }
      
      await this.screenshot('04-role-selection');
      
      // Check for role buttons
      const studentButton = await this.page.$('button:has-text("Student"), button:has-text("student")').catch(() => null);
      const professorButton = await this.page.$('button:has-text("Professor"), button:has-text("professor")').catch(() => null);
      
      if (studentButton) {
        this.logSuccess('Student role button found');
      }
      if (professorButton) {
        this.logSuccess('Professor role button found');
      }
      
      // Try clicking student role
      if (studentButton) {
        await Promise.all([
          this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {}),
          studentButton.click()
        ]);
        
        await new Promise(r => setTimeout(r, 1000));
        const newUrl = this.page.url();
        
        if (newUrl.includes('/student')) {
          this.logSuccess('Successfully navigated to student dashboard');
          return true;
        }
      }
      
      return false;
      
    } catch (error) {
      this.logError(`Role selection test failed: ${error.message}`);
      return false;
    }
  }

  async testStudentDashboard() {
    this.currentTest = 'Student Dashboard';
    this.log('Testing student dashboard...');
    
    try {
      const currentUrl = this.page.url();
      
      // Navigate to student dashboard if not there
      if (!currentUrl.includes('/student')) {
        await this.page.goto('http://localhost:3001/student', { 
          waitUntil: 'networkidle2',
          timeout: 30000 
        });
      }
      
      await this.screenshot('05-student-dashboard');
      
      // Check for dashboard elements
      const elements = {
        coursePicker: await this.page.$('[class*="course"], select, [data-testid*="course"]').catch(() => null),
        weekPicker: await this.page.$('[class*="week"], [data-testid*="week"]').catch(() => null),
        voicePicker: await this.page.$('[class*="voice"], [data-testid*="voice"]').catch(() => null),
        startButton: await this.page.$('button:has-text("Start"), button:has-text("Begin")').catch(() => null),
        logoutButton: await this.page.$('button:has-text("Logout"), button:has-text("Sign Out")').catch(() => null)
      };
      
      for (const [name, element] of Object.entries(elements)) {
        if (element) {
          this.logSuccess(`Found ${name} element`);
        } else {
          this.log(`${name} element not found`);
        }
      }
      
      // Test logout functionality
      if (elements.logoutButton) {
        await Promise.all([
          this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {}),
          elements.logoutButton.click()
        ]);
        
        await new Promise(r => setTimeout(r, 1000));
        const afterLogoutUrl = this.page.url();
        
        if (afterLogoutUrl.includes('/login') || afterLogoutUrl === 'http://localhost:3001/') {
          this.logSuccess('Logout successful');
          await this.screenshot('06-after-logout');
        }
      }
      
      return true;
      
    } catch (error) {
      this.logError(`Student dashboard test failed: ${error.message}`);
      return false;
    }
  }

  async testProfessorDashboard() {
    this.currentTest = 'Professor Dashboard';
    this.log('Testing professor dashboard...');
    
    try {
      // First login as professor
      await this.testLogin('professor');
      
      // Navigate to professor dashboard
      await this.page.goto('http://localhost:3001/professor', { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      await this.screenshot('07-professor-dashboard');
      
      // Check for dashboard elements
      const elements = {
        weekSelector: await this.page.$('[class*="week"], select').catch(() => null),
        uploadArea: await this.page.$('[class*="upload"], [class*="drop"]').catch(() => null),
        statsCards: await this.page.$$('[class*="card"]').catch(() => []),
        logoutButton: await this.page.$('button:has-text("Logout"), button:has-text("Sign Out")').catch(() => null)
      };
      
      if (elements.weekSelector) {
        this.logSuccess('Found week selector');
      }
      
      if (elements.uploadArea) {
        this.logSuccess('Found upload area');
      }
      
      if (elements.statsCards.length > 0) {
        this.logSuccess(`Found ${elements.statsCards.length} stat cards`);
      }
      
      // Test file upload UI (without actual file)
      if (elements.uploadArea) {
        await elements.uploadArea.click();
        await new Promise(r => setTimeout(r, 500));
        await this.screenshot('08-upload-area-clicked');
      }
      
      return true;
      
    } catch (error) {
      this.logError(`Professor dashboard test failed: ${error.message}`);
      return false;
    }
  }

  async testAPIConnectivity() {
    this.currentTest = 'API Connectivity';
    this.log('Testing API connectivity...');
    
    try {
      // Test health endpoint
      const healthResponse = await this.page.evaluate(async () => {
        try {
          const response = await fetch('http://localhost:8000/health');
          const data = await response.json();
          return { status: response.status, ok: response.ok, data };
        } catch (error) {
          return { error: error.message };
        }
      });
      
      if (healthResponse.ok) {
        this.logSuccess(`Health endpoint working: ${JSON.stringify(healthResponse.data)}`);
      } else {
        this.logError(`Health endpoint failed: ${JSON.stringify(healthResponse)}`);
      }
      
      // Test login API
      const loginResponse = await this.page.evaluate(async () => {
        try {
          const response = await fetch('http://localhost:8000/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'student@test.com',
              password: 'student123'
            })
          });
          return { 
            status: response.status, 
            ok: response.ok,
            headers: {
              contentType: response.headers.get('content-type'),
              cors: response.headers.get('access-control-allow-origin')
            }
          };
        } catch (error) {
          return { error: error.message };
        }
      });
      
      if (loginResponse.ok) {
        this.logSuccess('Login API working');
      } else {
        this.log(`Login API response: ${JSON.stringify(loginResponse)}`);
      }
      
      return true;
      
    } catch (error) {
      this.logError(`API connectivity test failed: ${error.message}`);
      return false;
    }
  }

  async runAllTests() {
    console.log('\n' + '='.repeat(60));
    console.log('Starting Comprehensive Test Suite');
    console.log('='.repeat(60) + '\n');
    
    try {
      await this.initialize();
      
      // Test API connectivity first
      await this.testAPIConnectivity();
      
      // Test login as student
      await this.testLogin('student');
      
      // Test role selection
      await this.testRoleSelection();
      
      // Test student dashboard
      await this.testStudentDashboard();
      
      // Test professor dashboard
      await this.testProfessorDashboard();
      
    } catch (error) {
      this.logError(`Test suite failed: ${error.message}`);
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
      
      // Print summary
      this.printSummary();
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('TEST SUMMARY');
    console.log('='.repeat(60) + '\n');
    
    const errors = this.testResults.filter(r => r.type === 'error');
    const successes = this.testResults.filter(r => r.type === 'success');
    
    console.log(`✅ Successful tests: ${successes.length}`);
    console.log(`❌ Failed tests: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\nErrors encountered:');
      errors.forEach((error, index) => {
        console.log(`${index + 1}. [${error.test}] ${error.message}`);
      });
    }
    
    // Save results to file
    const resultsPath = path.join(screenshotsDir, 'test-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(this.testResults, null, 2));
    console.log(`\n📄 Full results saved to: ${resultsPath}`);
  }
}

// Run tests
const runner = new TestRunner();
runner.runAllTests().catch(console.error);