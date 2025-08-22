import type { AuditRequest, AuditResults } from '@/types/audit';

// Use absolute URL in production, relative in development
const getApiBaseUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    return `${window.location.origin}/api/audit`;
  }
  return '/api/audit';
};

export const auditService = {
  async runAudit(request: AuditRequest): Promise<AuditResults> {
    try {
      const response = await fetch(getApiBaseUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      // Handle non-JSON responses (like HTML error pages)
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text.substring(0, 500));
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!response.ok) {
        console.error('API Error:', data);
        throw new Error(data.error || data.message || 'Failed to run audit');
      }

      // Validate the response matches our expected format
      if (!data.id || !data.pillars) {
        console.error('Invalid response format:', data);
        throw new Error('Invalid server response');
      }
      
      return data;
    } catch (error) {
      console.error('Audit failed:', error);
      throw error instanceof Error ? error : new Error('Unknown error occurred');
    }
  },

  async getAuditResults(auditId: string): Promise<AuditResults> {
    try {
      const response = await fetch(`${getApiBaseUrl()}/${auditId}`);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to fetch audit results');
      }

      return response.json();
    } catch (error) {
      console.error('Error fetching audit results:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch audit results');
    }
  },

  calculateOverallScore(results: AuditResults): number {
    if (!results.pillars) return 0;
    
    const { accessibility, performance, trust, agentReadiness } = results.pillars;
    const scores = [
      accessibility?.score || 0,
      performance?.score || 0,
      trust?.score || 0,
      agentReadiness?.score || 0
    ].filter(score => typeof score === 'number');
    
    if (scores.length === 0) return 0;
    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  }
};
