const puppeteer = require('puppeteer');
const fs = require('fs');

async function run () {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: '/root/snap/chromium/',
    args: ['--no-sandbox'],
    defaultViewport: {width: 1920, height: 1080}
  });
  const page = await browser.newPage();
  await page.goto('https://www.google.com');
  await sleep(3000);

  await page.screenshot({path: 'screenshot.png'});
  const html = await page.content();
  fs.writeFileSync('source.htm', html);

  browser.close();
}
run();

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
} 