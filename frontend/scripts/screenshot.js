// Simple Puppeteer script to screenshot the voice demo page.
// Usage: npm run screenshot (ensure frontend is running on :3001)

const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 });
  await page.goto('http://localhost:3001/voice-demo', { waitUntil: 'networkidle2' });

  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: 'voice-demo.png' });
  console.log('Saved screenshot: voice-demo.png');
  await browser.close();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

