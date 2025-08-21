import puppeteer from 'puppeteer';

async function testChrome() {
  let browser;
  try {
    console.log('Launching Chrome...');
    const options = {
      headless: 'new',
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080'
      ],
      ignoreHTTPSErrors: true,
      defaultViewport: null,
      timeout: 30000
    };
    console.log('Launch options:', JSON.stringify(options, null, 2));
    browser = await puppeteer.launch(options);
    
    const page = await browser.newPage();
    await page.goto('https://example.com');
    const title = await page.title();
    console.log(`Success! Page title: ${title}`);
    
  } catch (error) {
    console.error('Error during test:', error);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testChrome();
