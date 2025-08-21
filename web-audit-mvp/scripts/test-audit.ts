const { launchChrome, getLighthouseConfig } = require('../src/lib/lighthouse');
const lighthouse = require('lighthouse');

async function runTest() {
  console.log('Starting test audit...');
  
  try {
    // Launch Chrome
    const chrome = await launchChrome({
      chromePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      chromeFlags: [
        '--headless',
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage'
      ]
    });
    
    console.log('Chrome launched on port:', chrome.port);
    
    try {
      // Run Lighthouse
      const url = 'https://example.com';
      const options = {
        port: chrome.port,
        output: 'json',
        logLevel: 'info',
      };
      
      const config = getLighthouseConfig({ device: 'desktop' });
      
      console.log('Running Lighthouse audit...');
      const result = await (lighthouse as any).default(url, options, config);
      
      console.log('Audit completed successfully!');
      console.log('Performance score:', result.lhr.categories.performance.score * 100);
      
    } finally {
      // Kill Chrome process
      await chrome.kill();
      console.log('Chrome process terminated');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

runTest();
