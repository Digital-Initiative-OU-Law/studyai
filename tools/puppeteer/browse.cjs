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
    // Prefer an explicit executable if provided, with sensible fallbacks.
    const candidates = [];
    if (process.env.PUPPETEER_EXECUTABLE_PATH) candidates.push(process.env.PUPPETEER_EXECUTABLE_PATH);
    // Common WSL -> Windows Chrome path
    candidates.push('/mnt/c/Program Files/Google/Chrome/Application/chrome.exe');
    candidates.push('/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe');
    // Common Linux Chrome/Chromium paths
    candidates.push('/usr/bin/google-chrome');
    candidates.push('/usr/bin/chromium');
    candidates.push('/usr/bin/chromium-browser');

    let executablePath = undefined;
    for (const p of candidates) {
      try { await fs.promises.access(p, fs.constants.X_OK); executablePath = p; break; } catch {}
    }

    browser = await puppeteer.launch({
      headless: true,
      executablePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });
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
