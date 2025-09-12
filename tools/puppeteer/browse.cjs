/*
  Minimal Puppeteer demo: navigates to a URL, extracts title,
  takes a screenshot, and saves the page HTML locally.
  Usage: node browse.cjs [url]
*/

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function main() {
  const url = process.argv[2] || 'https://example.com/';
  const outDir = path.join(__dirname, 'output');
  await ensureDir(outDir);

  let browser;
  try {
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // Set a reasonable default timeout
    page.setDefaultNavigationTimeout(30000);

    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const title = await page.title();
    console.log(`Title: ${title}`);

    // Save screenshot
    const screenshotPath = path.join(outDir, 'screenshot.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Saved screenshot -> ${screenshotPath}`);

    // Save HTML
    const html = await page.content();
    const htmlPath = path.join(outDir, 'page.html');
    await fs.promises.writeFile(htmlPath, html, 'utf8');
    console.log(`Saved HTML -> ${htmlPath}`);
  } finally {
    if (browser) await browser.close();
  }
}

main().catch((err) => {
  console.error('Error running Puppeteer demo:', err);
  process.exitCode = 1;
});

