import type { AuditRequest, AuditResults } from '@/types/audit';
import { generateAuditInsights } from './openai.service';

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

    const results: AuditResults = await response.json();
  
    // Add AI analysis in the background
    this.addAIAnalysis(results.id, results);
  
    return results;
  },

  async addAIAnalysis(auditId: string, results: AuditResults): Promise<void> {
    try {
      // Update status to processing
      await fetch(`${API_BASE_URL}/${auditId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'processing' })
      });

      // Generate AI insights
      const aiAnalysis = await generateAuditInsights(results);
      
      // Update with AI analysis
      await fetch(`${API_BASE_URL}/${auditId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'completed',
          aiAnalysis: {
            ...aiAnalysis,
            generatedAt: new Date().toISOString()
          }
        })
      });
    } catch (error) {
      console.error('Error in AI analysis:', error);
      // Update status to failed
      await fetch(`${API_BASE_URL}/${auditId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'failed',
          error: 'Failed to generate AI insights'
        })
      });
    }
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
