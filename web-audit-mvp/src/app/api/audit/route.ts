import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import { AuditRequest, AuditResults } from '@/types/audit';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { url, options }: AuditRequest = await request.json();
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Launch Chrome
    const chrome = await chromeLauncher.launch({
      chromeFlags: [
        '--headless',
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-software-rasterizer',
        '--mute-audio',
        '--remote-debugging-port=9222',
      ],
    });

    try {
      // Run Lighthouse
      const result = await lighthouse(
        url,
        {
          port: chrome.port,
          output: 'json',
          logLevel: 'info',
        },
        {
          extends: 'lighthouse:default',
          settings: {
            formFactor: options?.device === 'mobile' ? 'mobile' : 'desktop',
            throttling: options?.throttling
              ? {
                  rttMs: 40,
                  throughputKbps: 10240,
                  cpuSlowdownMultiplier: 1,
                  requestLatencyMs: 0,
                  downloadThroughputKbps: 0,
                  uploadThroughputKbps: 0,
                }
              : {},
            screenEmulation: {
              mobile: options?.device === 'mobile',
              width: options?.device === 'mobile' ? 375 : 1350,
              height: options?.device === 'mobile' ? 667 : 940,
              deviceScaleFactor: 1,
              disabled: false,
            },
          },
        }
      );

      // Process Lighthouse results
      const lhr = result?.lhr;
      if (!lhr) {
        throw new Error('No Lighthouse results returned');
      }

      // Process metrics into our format
      const processMetrics = (category: any) => {
        if (!category || !category.auditRefs) return [];
        
        return category.auditRefs
          .filter((ref: any) => ref.weight >= 1) // Only include audits with weight
          .map((ref: any) => {
            const audit = lhr.audits[ref.id];
            if (!audit) return null;
            
            // Convert score to 0-5 scale
            const score = audit.score !== null ? audit.score * 5 : 0;
            
            return {
              name: audit.title,
              score,
              value: audit.numericValue || audit.displayValue || audit.score,
              threshold: 0.9, // Default threshold
              impact: score >= 4 ? 'low' : score >= 2.5 ? 'medium' : 'high',
              description: audit.description,
            };
          })
          .filter(Boolean); // Remove any null entries
      };

      // Generate mock insights (in a real app, this would use AI or more complex logic)
      const generateInsights = (category: any, metrics: any[]) => {
        const insights: string[] = [];
        
        // Add overall score insight
        const avgScore = metrics.reduce((sum, m) => sum + m.score, 0) / metrics.length;
        insights.push(
          avgScore >= 4
            ? `Excellent ${category} performance!`
            : avgScore >= 2.5
            ? `Good ${category} performance, but there's room for improvement.`
            : `Needs improvement in ${category} performance.`
        );

        // Add specific insights based on metrics
        metrics.forEach((metric) => {
          if (metric.score < 2.5) {
            insights.push(`Low score for ${metric.name}: ${metric.description}`);
          }
        });

        return insights;
      };

      // Process each category
      const processCategory = (categoryId: string, name: string) => {
        const category = lhr.categories[categoryId];
        const metrics = processMetrics(category);
        const score = category?.score ? category.score * 5 : 0;
        
        return {
          score,
          metrics,
          insights: generateInsights(name, metrics),
        };
      };

      // Create audit results
      const auditResults: AuditResults = {
        id: Date.now().toString(),
        url,
        timestamp: new Date(),
        pillars: {
          accessibility: processCategory('accessibility', 'accessibility'),
          performance: processCategory('performance', 'performance'),
          trust: processCategory('best-practices', 'trust'), // Using best-practices for trust
          agentReadiness: processCategory('seo', 'agent readiness'), // Using SEO for agent readiness
        },
        overallScore: 0, // Will be calculated by the service
        recommendations: [],
      };

      // Calculate overall score
      const pillarScores = Object.values(auditResults.pillars).map(p => p.score);
      auditResults.overallScore = parseFloat((pillarScores.reduce((a, b) => a + b, 0) / pillarScores.length).toFixed(1));

      return NextResponse.json(auditResults);
    } finally {
      // Always close Chrome
      await chrome.kill();
    }
  } catch (error) {
    console.error('Audit error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unknown error occurred' },
      { status: 500 }
    );
  }
}
