const puppeteer = require('puppeteer');

async function testVoiceSession() {
  console.log('Testing Voice Session UI');
  console.log('=' + '='.repeat(40));
  
  const browser = await puppeteer.launch({ 
    headless: true,
    executablePath: require('puppeteer').executablePath()
  });
  
  try {
    const page = await browser.newPage();
    
    // 1. Login as student
    console.log('\n1. Logging in as student...');
    await page.goto('http://localhost:3001/login');
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', 'student@test.com');
    await page.type('input[type="password"]', 'student123');
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    console.log('   Current URL:', page.url());
    
    // 2. Go to student dashboard
    console.log('\n2. Navigating to student dashboard...');
    await page.goto('http://localhost:3001/student');
    await page.waitForSelector('#coursePicker', { timeout: 5000 });
    console.log('   Student dashboard loaded');
    
    // 3. Select course and week
    console.log('\n3. Selecting course and week...');
    await page.select('#coursePicker', 'LAW101');
    await page.waitForSelector('#weekPicker');
    await page.select('#weekPicker', '1');
    await page.waitForSelector('#voicePicker');
    await page.select('#voicePicker', 'voice1');
    console.log('   Selections made');
    
    // 4. Start voice session
    console.log('\n4. Starting voice session...');
    const startButton = await page.$('#startButton');
    if (startButton) {
      await startButton.click();
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
      console.log('   Navigated to:', page.url());
    } else {
      console.log('   Start button not found');
    }
    
    // 5. Test voice session page
    if (page.url().includes('/voice/')) {
      console.log('\n5. Testing voice session page...');
      await page.waitForTimeout(2000);
      
      // Check for the Start Session button
      const sessionButton = await page.$('button');
      if (sessionButton) {
        const buttonText = await page.evaluate(el => el.textContent, sessionButton);
        console.log('   Found button:', buttonText);
        
        if (buttonText.includes('Start Session')) {
          console.log('   Clicking Start Session...');
          await sessionButton.click();
          await page.waitForTimeout(3000);
          
          // Check for error or success
          const error = await page.$('div[style*="background: #2a1111"]');
          if (error) {
            const errorText = await page.evaluate(el => el.textContent, error);
            console.log('   Error:', errorText);
          } else {
            const status = await page.$('div[style*="opacity: 0.8"]');
            if (status) {
              const statusText = await page.evaluate(el => el.textContent, status);
              console.log('   Status:', statusText);
            }
          }
        }
      }
      
      // Take screenshot
      await page.screenshot({ path: 'voice-session-test.png' });
      console.log('   Screenshot saved: voice-session-test.png');
    }
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testVoiceSession();