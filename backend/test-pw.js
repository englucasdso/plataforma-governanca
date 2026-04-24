import { chromium } from 'playwright';

(async () => {
  try {
    const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent('<h1>Hello</h1>');
    console.log(await page.title());
    await browser.close();
    console.log('Playwright successful!');
  } catch (e) {
    console.error('Playwright failed:', e);
  }
})();
