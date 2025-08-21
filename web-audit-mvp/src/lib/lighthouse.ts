import type * as Lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import type { AuditRequest, AuditResults } from '@/types/audit';

export const DEFAULT_THROTTLING = {
  rttMs: 40,
  throughputKbps: 10240,
  cpuSlowdownMultiplier: 1,
  requestLatencyMs: 0,
  downloadThroughputKbps: 0,
  uploadThroughputKbps: 0,
};

export async function launchChrome() {
  return await chromeLauncher.launch({
    chromeFlags: [
      '--headless',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-software-rasterizer',
      '--mute-audio',
      '--remote-debugging-port=0',
      '--remote-debugging-address=0.0.0.0',
    ],
  });
}

export function getLighthouseConfig(options: AuditRequest['options'] = {}) {
  const formFactor = options?.device === 'mobile' ? 'mobile' as const : 'desktop' as const;
  
  return {
    extends: 'lighthouse:default',
    settings: {
      formFactor,
      throttling: options?.throttling ? DEFAULT_THROTTLING : {},
      screenEmulation: {
        mobile: options?.device === 'mobile',
        width: options?.device === 'mobile' ? 375 : 1350,
        height: options?.device === 'mobile' ? 667 : 940,
        deviceScaleFactor: 1,
        disabled: false,
      },
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    },
  };
}

export function processMetrics(category: any, lhr: any) {
  if (!category?.auditRefs) return [];
  
  return category.auditRefs
    .filter((ref: any) => ref.weight >= 1)
    .map((ref: any) => {
      const audit = lhr.audits[ref.id];
      if (!audit) return null;
      
      const score = audit.score !== null ? audit.score * 5 : 0;
      
      return {
        id: ref.id,
        name: audit.title,
        score,
        value: audit.numericValue ?? audit.displayValue ?? audit.score,
        threshold: 0.9,
        impact: score >= 4 ? 'low' : score >= 2.5 ? 'medium' : 'high',
        description: audit.description,
      };
    })
    .filter(Boolean);
}

export function generateInsights(category: string, metrics: any[]) {
  const insights: string[] = [];
  const avgScore = metrics.reduce((sum, m) => sum + m.score, 0) / metrics.length || 0;
  
  insights.push(
    avgScore >= 4
      ? `Excellent ${category} performance!`
      : avgScore >= 2.5
      ? `Good ${category} performance, but there's room for improvement.`
      : `Needs improvement in ${category} performance.`
  );

  metrics.forEach((metric) => {
    if (metric.score < 2.5) {
      insights.push(`Low score for ${metric.name}: ${metric.description}`);
    }
  });

  return insights;
}

export function processCategory(categoryId: string, name: string, lhr: any) {
  const category = lhr.categories[categoryId];
  if (!category) return null;
  
  const metrics = processMetrics(category, lhr);
  const score = category?.score ? category.score * 5 : 0;
  
  return {
    score,
    metrics,
    insights: generateInsights(name, metrics),
  };
}

export function calculateOverallScore(pillars: AuditResults['pillars']) {
  const pillarScores = Object.values(pillars)
    .filter(Boolean)
    .map(p => p?.score || 0);
    
  return parseFloat((pillarScores.reduce((a, b) => a + b, 0) / Math.max(1, pillarScores.length)).toFixed(1));
}
