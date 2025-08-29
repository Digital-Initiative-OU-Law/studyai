// Puppeteer script to debug and test all pages for errors
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const errors = [];
  const consoleLogs = [];
  
  // Pages to test
  const pages = [
    '/',           // Home/Login page
    '/login',      // Login page
    '/role',       // Role selection
    '/student',    // Student dashboard
    '/professor',  // Professor dashboard
  ];
  
  for (const pagePath of pages) {
    console.log(`\nTesting page: ${pagePath}`);
    const page = await browser.newPage();
    
    // Capture console logs
    page.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'error') {
        errors.push({ page: pagePath, type: 'console', message: text });
        console.log(`  ❌ Console Error: ${text}`);
      } else if (msg.type() === 'warning') {
        console.log(`  ⚠️  Console Warning: ${text}`);
      }
    });
    
    // Capture page errors
    page.on('pageerror', error => {
      errors.push({ page: pagePath, type: 'page', message: error.message });
      console.log(`  ❌ Page Error: ${error.message}`);
    });
    
    // Capture response errors
    page.on('response', response => {
      if (response.status() >= 400) {
        const url = response.url();
        if (!url.includes('favicon')) { // Ignore favicon 404s
          errors.push({ 
            page: pagePath, 
            type: 'response', 
            message: `${response.status()} - ${url}` 
          });
          console.log(`  ❌ HTTP ${response.status()}: ${url}`);
        }
      }
    });
    
    await page.setViewport({ width: 1280, height: 800 });
    
    try {
      await page.goto(`http://localhost:3001${pagePath}`, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      // Wait a bit for any async errors
      await new Promise(r => setTimeout(r, 2000));
      
      // Try to capture screenshot
      const screenshotName = `screenshots/debug-${pagePath.replace(/\//g, '-') || 'home'}.png`;
      await page.screenshot({ path: screenshotName });
      console.log(`  ✅ Screenshot saved: ${screenshotName}`);
      
    } catch (error) {
      errors.push({ page: pagePath, type: 'navigation', message: error.message });
      console.log(`  ❌ Navigation Error: ${error.message}`);
    }
    
    await page.close();
  }
  
  await browser.close();
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('SUMMARY');
  console.log('='.repeat(50));
  
  if (errors.length === 0) {
    console.log('✅ No errors found!');
  } else {
    console.log(`❌ Found ${errors.length} error(s):\n`);
    errors.forEach((error, index) => {
      console.log(`${index + 1}. [${error.page}] ${error.type}: ${error.message}`);
    });
  }
  
  process.exit(errors.length > 0 ? 1 : 0);
})().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});