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
  
  // Test login flow
  try {
    console.log('\nTesting login flow...');
   await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle2' });
    
    // Fill in login form
    await page.type('input[type="email"]', 'test@ou.edu');
    await page.type('input[type="password"]', 'testpassword');
    
    // Take screenshot with filled form
    const loginFilledPath = path.join(__dirname, '..', 'screenshots', 'login-filled.png');
    await page.screenshot({ 
      path: loginFilledPath,
      fullPage: true 
    });
    console.log('✓ Saved login form filled screenshot');
    
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