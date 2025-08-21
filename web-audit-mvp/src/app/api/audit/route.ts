import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import lighthouse from 'lighthouse';
import type { AuditResults } from '@/types/audit';
import { launchChrome, getLighthouseConfig, processCategory, calculateOverallScore } from '@/lib/lighthouse';
import { validateAuditRequest, sanitizeUrl } from '@/lib/validation';

// Maximum time to wait for Lighthouse to complete (in milliseconds)
const LIGHTHOUSE_TIMEOUT = 120000; // 2 minutes

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const { url, options } = validateAuditRequest(body);
    
    // Sanitize URL and ensure it has a protocol
    const sanitizedUrl = sanitizeUrl(url);
    
    // Launch Chrome
    const chrome = await launchChrome();
    
    try {
      // Configure Lighthouse
      const config = getLighthouseConfig(options);
      
      // Run Lighthouse with timeout
      const result = await Promise.race([
        lighthouse(sanitizedUrl, {
          port: chrome.port,
          output: 'json',
          logLevel: 'info',
        }, config),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Lighthouse audit timed out')), LIGHTHOUSE_TIMEOUT)
        )
      ]) as any; // Type assertion since Promise.race loses type info

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
