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

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {

  try {
    // Parse and validate request body
    const body = await request.json().catch(() => {
      throw new Error('Invalid JSON in request body');
    });
    
    const { url, options } = validateAuditRequest(body);
    
    // Sanitize URL and ensure it has a protocol
    const sanitizedUrl = sanitizeUrl(url);
    
    console.log(`Starting audit for URL: ${sanitizedUrl}`);
    
    let chrome: Awaited<ReturnType<typeof launchChrome>> | undefined;
    try {
      console.log('Attempting to launch Chrome...');
      chrome = await launchChrome();
      console.log('Chrome launched successfully');
    } catch (chromeError) {
      console.error('Failed to launch Chrome:', chromeError);
      return NextResponse.json(
        { 
          error: `Failed to launch Chrome: ${chromeError instanceof Error ? chromeError.message : 'Unknown error'}`,
          details: process.env.NODE_ENV === 'development' ? { 
            message: chromeError instanceof Error ? chromeError.message : String(chromeError),
            stack: chromeError instanceof Error ? chromeError.stack : undefined
          } : undefined
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
          port: chrome!.port,
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
      if (chrome) {
        try {
          await chrome.kill();
        } catch (killError) {
          console.error('Error killing Chrome process:', killError);
        }
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
      } catch (parseError) {
        // Fall through to default error handling
        console.error('Failed to parse validation error:', parseError);
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
