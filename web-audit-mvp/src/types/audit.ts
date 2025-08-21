export interface AuditMetric {
  name: string;
  score: number;
  value: any;
  threshold: any;
  impact: 'high' | 'medium' | 'low';
  description: string;
}

export interface PillarResult {
  score: number; // 0-5
  metrics: AuditMetric[];
  insights: string[];
}

export interface AuditInsights {
  generatedAt: Date;
  insights: string[];
  recommendations: string[];
  summary?: string;
}

export interface AuditResults {
  id: string;
  url: string;
  timestamp: Date;
  pillars: {
    accessibility: PillarResult;
    trust: PillarResult;
    performance: PillarResult;
    agentReadiness: PillarResult;
  };
  overallScore: number;
  recommendations: string[];
  aiAnalysis: AuditInsights;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface AuditRequest {
  url: string;
  options?: {
    device?: 'mobile' | 'desktop';
    throttling?: boolean;
  };
}
