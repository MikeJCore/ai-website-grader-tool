// Import required modules
const { execSync } = require('child_process');
const { writeFileSync, unlinkSync } = require('fs');
const { join } = require('path');

// Install required dependencies if not already installed
const installDependencies = () => {
  try {
    require('lighthouse');
  } catch (e) {
    console.log('Installing dependencies...');
    execSync('npm install lighthouse chrome-aws-lambda', { stdio: 'inherit' });
  }
};

// Install dependencies if needed
installDependencies();

// Import dependencies
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-aws-lambda');

// Main handler function
exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    // Parse request body
    const { url, options = {} } = JSON.parse(event.body);
    
    if (!url) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'URL is required' }),
      };
    }

    // Launch Chrome
    const chrome = await chromeLauncher.launch({
      args: chromeLauncher.args,
      defaultViewport: chromeLauncher.defaultViewport,
      executablePath: await chromeLauncher.executablePath,
      headless: true,
      ignoreHTTPSErrors: true,
    });

    // Run Lighthouse
    const result = await lighthouse(url, {
      port: chrome.port,
      output: 'json',
      logLevel: 'info',
    }, {
      extends: 'lighthouse:default',
      settings: {
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        ...options
      },
    });

    // Clean up
    await chrome.kill();

    // Return the results
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        report: result.lhr,
      }),
    };
  } catch (error) {
    console.error('Error running audit:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      }),
    };
  }
};
