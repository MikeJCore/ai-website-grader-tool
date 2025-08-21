import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { RunnerResult } from 'lighthouse/types/externs';
import type { AuditResults } from '@/types/audit';
import { launchChrome, getLighthouseConfig, processCategory, calculateOverallScore } from '@/lib/lighthouse';
import { validateAuditRequest, sanitizeUrl } from '@/lib/validation';

// Dynamically import lighthouse to avoid ES modules issues
const dynamicImport = new Function('modulePath', 'return import(modulePath)');
let lighthouse: any;
const loadLighthouse = async () => {
  if (!lighthouse) {
    const module = await dynamicImport('lighthouse');
    lighthouse = module.default || module;
  }
  return lighthouse;
};

// Maximum time to wait for Lighthouse to complete (in milliseconds)
const LIGHTHOUSE_TIMEOUT = 120000; // 2 minutes

// Check if Chrome is installed
const isChromeInstalled = async (): Promise<boolean> => {
  const { execSync } = require('child_process');
  const platform = process.platform;
  
  if (platform === 'win32') {
    try {
      // Windows
      execSync('where chrome');
      return true;
    } catch (error) {
      console.error('Chrome not found in Windows PATH');
      return false;
    }
  } else if (platform === 'darwin') {
    // macOS - check common locations
    const chromePath = '/Applications/Google Chrome.app';
    try {
      // Verify Chrome is in the expected location
      execSync(`test -d "${chromePath}"`);
      
      // Add Chrome to PATH if not already there
      const chromeBinPath = '/Applications/Google Chrome.app/Contents/MacOS';
      const currentPath = process.env.PATH || '';
      if (!currentPath.includes(chromeBinPath)) {
        process.env.PATH = `${currentPath}:${chromeBinPath}`;
      }
      
      // Verify the Chrome binary is executable
      execSync('test -x "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"');
      
      console.log(`Found Chrome at: ${chromePath}`);
      return true;
    } catch (e) {
      console.error(`Error accessing Chrome at ${chromePath}:`, e);
      console.error('Please ensure Google Chrome is installed from https://www.google.com/chrome/');
      return false;
    }
  } else {
    // Linux
    try {
      execSync('which google-chrome');
      return true;
    } catch (error) {
      console.error('Chrome not found in Linux PATH');
      return false;
    }
  }
};

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Check if Chrome is installed
  if (!(await isChromeInstalled())) {
    return NextResponse.json(
      { 
        error: 'Chrome is required but not found. Please install Chrome browser on your system.' 
      },
      { status: 500 }
    );
  }

  try {
    // Parse and validate request body
    const body = await request.json().catch(() => {
      throw new Error('Invalid JSON in request body');
    });
    
    const { url, options } = validateAuditRequest(body);
    
    // Sanitize URL and ensure it has a protocol
    const sanitizedUrl = sanitizeUrl(url);
    
    console.log(`Starting audit for URL: ${sanitizedUrl}`);
    
    // Launch Chrome with explicit path
    let chrome;
    try {
      console.log('Attempting to launch Chrome...');
      const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
      console.log(`Using Chrome path: ${chromePath}`);
      
      // Verify Chrome exists and is executable
      const { execSync } = require('child_process');
      let chromeVersion = '';
      try {
        chromeVersion = execSync(`"${chromePath}" --version`).toString().trim();
        console.log('Chrome version:', chromeVersion);
      } catch (e) {
        const error = e as Error;
        console.error('Failed to get Chrome version:', error);
        throw new Error(`Chrome not found or not executable at ${chromePath}. Please ensure Chrome is installed. Error: ${error.message}`);
      }
      
      try {
        console.log('Launching Chrome with flags...');
        chrome = await launchChrome({
          chromePath,
          chromeFlags: [
            '--headless=new',
            '--no-sandbox',
            '--disable-gpu',
            '--disable-dev-shm-usage',
            '--remote-debugging-port=0',
            '--remote-debugging-address=0.0.0.0',
            '--disable-setuid-sandbox',
            '--no-zygote',
            '--single-process',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-software-rasterizer',
            '--disable-breakpad',
            '--disable-client-side-phishing-detection',
            '--disable-default-apps',
            '--disable-extensions',
            '--disable-hang-monitor',
            '--disable-popup-blocking',
            '--disable-prompt-on-repost',
            '--disable-sync',
            '--disable-translate',
            '--metrics-recording-only',
            '--no-first-run',
            '--safebrowsing-disable-auto-update',
            '--enable-automation',
            '--password-store=basic',
            '--use-mock-keychain',
            '--mute-audio',
            '--no-default-browser-check',
            '--no-sandbox-and-elevated',
            '--window-size=1280,1696'  // Set a default window size
          ]
        });
        console.log('Chrome launched successfully');
      } catch (launchError) {
        console.error('Chrome launch error details:', {
          error: launchError,
          chromePath,
          chromeVersion,
          env: process.env.PATH
        });
        throw launchError;
      }
      console.log('Chrome launched successfully');
    } catch (chromeError) {
      console.error('Failed to launch Chrome:', chromeError);
      return NextResponse.json(
        { 
          error: `Failed to launch Chrome: ${chromeError instanceof Error ? chromeError.message : 'Unknown error'}`,
          details: process.env.NODE_ENV === 'development' ? chromeError : undefined
        },
        { status: 500 }
      );
    }
    
    try {
      // Load Lighthouse dynamically
      const lighthouse = await loadLighthouse();
      
      // Configure Lighthouse
      const config = getLighthouseConfig(options);
      
      // Run Lighthouse with timeout
      const result = await Promise.race([
        lighthouse(sanitizedUrl, {
          port: chrome.port,
          output: 'json',
          logLevel: 'info',
        }, config) as Promise<RunnerResult>,
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Lighthouse audit timed out')), LIGHTHOUSE_TIMEOUT)
        )
      ]);

      // Process Lighthouse results
      const lhr = result?.lhr;
      if (!lhr) {
        throw new Error('No Lighthouse results returned');
      }

      // Process each category
      const accessibility = processCategory('accessibility', 'Accessibility', lhr);
      const performance = processCategory('performance', 'Performance', lhr);
      const trust = processCategory('best-practices', 'Best Practices', lhr);
      const agentReadiness = processCategory('seo', 'SEO', lhr);

      if (!accessibility || !performance || !trust || !agentReadiness) {
        throw new Error('Failed to process one or more audit categories');
      }

      const pillars = {
        accessibility,
        performance,
        trust,
        agentReadiness,
      };

      // Create audit results
      const auditResults: AuditResults = {
        id: Date.now().toString(),
        url: sanitizedUrl,
        timestamp: new Date(),
        pillars,
        overallScore: calculateOverallScore(pillars),
        recommendations: [],
        status: 'completed',
        aiAnalysis: {
          generatedAt: new Date(),
          insights: [],
          recommendations: [],
        },
      };

      return NextResponse.json(auditResults);
    } catch (error) {
      console.error('Audit error:', error);
      const status = error instanceof Error && error.message.includes('timed out') ? 504 : 500;
      return NextResponse.json(
        { 
          error: error instanceof Error ? error.message : 'An unknown error occurred',
          ...(process.env.NODE_ENV === 'development' && { stack: error instanceof Error ? error.stack : undefined })
        },
        { status }
      );
    } finally {
      // Always close Chrome, even if there was an error
      try {
        await chrome.kill();
      } catch (killError) {
        console.error('Error killing Chrome process:', killError);
      }
    }
  } catch (error) {
    console.error('Request validation error:', error);
    
    // Handle validation errors
    if (error instanceof Error && error.message.includes('Validation failed')) {
      try {
        const validationError = JSON.parse(error.message);
        return NextResponse.json(
          { 
            error: 'Validation failed',
            details: validationError.errors 
          },
          { status: 400 }
        );
      } catch {
        // Fall through to default error handling
      }
    }
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        ...(process.env.NODE_ENV === 'development' && { stack: error instanceof Error ? error.stack : undefined })
      },
      { status: 500 }
    );
  }
}
