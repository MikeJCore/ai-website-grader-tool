import type { AuditRequest, AuditResults } from '@/types/audit';
import { generateAuditInsights } from './openai.service';

const API_BASE_URL = '/api/audit';

async function addAIAnalysis(auditId: string, results: AuditResults): Promise<void> {
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
    console.error('AI analysis failed:', error);
    
    // Update status to failed
    await fetch(`${API_BASE_URL}/${auditId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        status: 'failed',
        error: 'Failed to generate AI analysis'
      })
    });
  }
}

export const auditService = {
  async runAudit(request: AuditRequest): Promise<AuditResults> {
    try {
      const response = await fetch(API_BASE_URL, {
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
    
      // Start AI analysis in background
      addAIAnalysis(data.id, data).catch(console.error);
      
      return data;
    } catch (error) {
      console.error('Audit failed:', error);
      throw error instanceof Error ? error : new Error('Unknown error occurred');
    }
  },

  async getAuditResults(auditId: string): Promise<AuditResults> {
    try {
      const response = await fetch(`${API_BASE_URL}/${auditId}`);
      
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
