import { AuditRequest, AuditResults } from '@/types/audit';

const API_BASE_URL = '/api/audit';

export const auditService = {
  async runAudit(request: AuditRequest): Promise<AuditResults> {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to run audit');
    }

    return response.json();
  },

  async getAuditResults(auditId: string): Promise<AuditResults> {
    const response = await fetch(`${API_BASE_URL}/${auditId}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch audit results');
    }

    return response.json();
  },

  // Helper function to calculate overall score from pillar scores
  calculateOverallScore(results: AuditResults): number {
    const { pillars } = results;
    const scores = [
      pillars.accessibility.score,
      pillars.trust.score,
      pillars.performance.score,
      pillars.agentReadiness.score
    ];
    
    // Simple average for now, could be weighted in the future
    return parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1));
  }
};
