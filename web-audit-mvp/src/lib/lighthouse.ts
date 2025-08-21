import puppeteer from 'puppeteer-core';
import type { Browser } from 'puppeteer-core';
import type { AuditRequest, AuditResults } from '@/types/audit';
import { execSync } from 'child_process';
import * as path from 'path';

export const DEFAULT_THROTTLING = {
  rttMs: 40,
  throughputKbps: 10240,
  cpuSlowdownMultiplier: 1,
  requestLatencyMs: 0,
  downloadThroughputKbps: 0,
  uploadThroughputKbps: 0,
};

interface LaunchChromeOptions {
  chromePath?: string;
  chromeFlags?: string[];
}

async function findChromePath(): Promise<string> {
  const platform = process.platform;
  
  if (platform === 'darwin') {
    // Check default location on macOS
    const macPath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    try {
      execSync(`ls -l "${macPath}"`);
      return macPath;
    } catch (e) {
      throw new Error(`Chrome not found at ${macPath}. Please install Chrome or provide the correct path.`);
    }
  } else if (platform === 'win32') {
    // Windows paths to check
    const windowsPaths = [
      path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Google\\Chrome\\Application\\chrome.exe'),
      path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Google\\Chrome\\Application\\chrome.exe'),
    ];
    
    for (const winPath of windowsPaths) {
      try {
        execSync(`dir "${winPath}"`);
        return winPath;
      } catch (e) {
        continue;
      }
    }
    throw new Error('Chrome not found in default locations. Please install Chrome or provide the correct path.');
  } else {
    // Linux/Unix
    try {
      return execSync('which google-chrome').toString().trim();
    } catch (e) {
      throw new Error('Chrome not found in PATH. Please install Chrome or add it to your PATH.');
    }
  }
}

export async function launchChrome(options: LaunchChromeOptions = {}): Promise<{ port: number; kill: () => Promise<void>; browser: Browser }> {
  const defaultFlags = [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--disable-setuid-sandbox',
    '--no-zygote',
    '--disable-infobars',
    '--disable-background-networking',
    '--disable-default-apps',
    '--disable-extensions',
    '--disable-sync',
    '--disable-translate',
    '--disable-web-security',
    '--mute-audio',
    '--no-first-run',
    '--safebrowsing-disable-auto-update',
  ];

  if (process.platform === 'darwin') {
    defaultFlags.push('--use-mock-keychain');
  }

  try {
    const chromePath = options.chromePath || await findChromePath();
    console.log(`Using Chrome at: ${chromePath}`);

    const browser = await puppeteer.launch({
      executablePath: chromePath,
      args: [...new Set([...defaultFlags, ...(options.chromeFlags || [])])],
    });

    const wsEndpoint = browser.wsEndpoint();
    const port = parseInt(new URL(wsEndpoint).port, 10);

    if (isNaN(port)) {
      await browser.close();
      throw new Error('Failed to extract port from Puppeteer browser endpoint.');
    }

    console.log(`Chrome launched via Puppeteer on port: ${port}`);

    return {
      port,
      kill: async () => {
        await browser.close();
      },
      browser,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to launch Chrome with Puppeteer:', error);
    throw new Error(`Failed to launch Chrome: ${errorMessage}`);
  }
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
