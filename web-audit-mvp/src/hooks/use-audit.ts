import { useState } from 'react';
import { AuditRequest, AuditResults } from '@/types/audit';
import { auditService } from '@/services/audit.service';

export const useAudit = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<AuditResults | null>(null);

  const runAudit = async (url: string) => {
    if (!url) {
      setError('Please enter a valid URL');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Normalize URL
      const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
      
      const request: AuditRequest = {
        url: normalizedUrl,
        options: {
          device: 'mobile', // Default to mobile for now
          throttling: true,
        },
      };

      const response = await auditService.runAudit(request);
      setResults(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Audit error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    runAudit,
    isLoading,
    error,
    results,
  };
};
