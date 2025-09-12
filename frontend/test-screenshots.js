const puppeteer = require('puppeteer');
const path = require('path');

async function takeScreenshots() {
  console.log('Starting Puppeteer screenshot capture...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Set viewport to desktop size
  await page.setViewport({ width: 1920, height: 1080 });
  
  const pages = [
    { name: 'home', path: '/', title: 'Home Page' },
    { name: 'login', path: '/login', title: 'Login Page' },
    { name: 'role', path: '/role', title: 'Role Selection' },
    { name: 'student', path: '/student', title: 'Student Dashboard' },
    { name: 'professor', path: '/professor', title: 'Professor Dashboard' },
  ];

  for (const pageInfo of pages) {
    try {
      console.log(`Capturing ${pageInfo.title}...`);
      await page.goto(`http://localhost:3001${pageInfo.path}`, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      // Wait a bit for any animations to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Take desktop screenshot
      const desktopPath = path.join(__dirname, '..', 'screenshots', `${pageInfo.name}-desktop.png`);
      await page.screenshot({ 
        path: desktopPath,
        fullPage: true 
      });
      console.log(`✓ Saved desktop screenshot: ${pageInfo.name}-desktop.png`);
      
      // Set viewport to mobile size
      await page.setViewport({ width: 375, height: 667 });
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Take mobile screenshot
      const mobilePath = path.join(__dirname, '..', 'screenshots', `${pageInfo.name}-mobile.png`);
      await page.screenshot({ 
        path: mobilePath,
        fullPage: true 
      });
      console.log(`✓ Saved mobile screenshot: ${pageInfo.name}-mobile.png`);
      
      // Reset to desktop viewport
      await page.setViewport({ width: 1920, height: 1080 });
      
    } catch (error) {
      console.error(`✗ Error capturing ${pageInfo.title}:`, error.message);
    }
  }
  
  // Test login flow with debugging
  try {
    console.log('\nTesting login flow with debugging...');
    
    // Set up console logging
    page.on('console', msg => console.log('Browser console:', msg.text()));
    page.on('pageerror', error => console.log('Browser error:', error.message));
    page.on('requestfailed', request => {
      console.log('Failed request:', request.url(), request.failure().errorText);
    });
    
    // Set up request/response monitoring
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (request.url().includes('/auth/login')) {
        console.log('Login request:', request.method(), request.url());
        console.log('Request body:', request.postData());
      }
      request.continue();
    });
    
    page.on('response', response => {
      if (response.url().includes('/auth/login')) {
        console.log('Login response status:', response.status());
        response.text().then(text => {
          console.log('Response body:', text);
        }).catch(() => {});
      }
    });
    
    await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle2' });
    
    // Clear any existing input first
    await page.evaluate(() => {
      document.querySelectorAll('input').forEach(input => input.value = '');
    });
    
    // Fill in login form with the correct test credentials
    await page.type('input[type="email"]', 'professor@test.com');
    await page.type('input[type="password"]', 'professor123');
    
    // Take screenshot with filled form
    const loginFilledPath = path.join(__dirname, '..', 'screenshots', 'login-filled.png');
    await page.screenshot({ 
      path: loginFilledPath,
      fullPage: true 
    });
    console.log('✓ Saved login form filled screenshot');
    
    // Click submit and wait for response
    console.log('Clicking submit button...');
    await page.click('button[type="submit"]');
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for any error messages
    
    // Take screenshot after submission
    const loginResultPath = path.join(__dirname, '..', 'screenshots', 'login-result.png');
    await page.screenshot({ 
      path: loginResultPath,
      fullPage: true 
    });
    console.log('✓ Saved login result screenshot');
    
    // Check for error messages
    const errorText = await page.evaluate(() => {
      const errorElements = document.querySelectorAll('.card');
      return Array.from(errorElements).map(el => el.textContent).join(' ');
    });
    
    if (errorText) {
      console.log('Error message found:', errorText);
    }
    
    console.log('Current URL:', page.url());
    
  } catch (error) {
    console.error('✗ Error during login flow test:', error.message);
  }  
  await browser.close();
  console.log('\n✅ Screenshot capture complete!');
  console.log('Screenshots saved to: screenshots/');
}

// Run the screenshot capture
takeScreenshots().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});