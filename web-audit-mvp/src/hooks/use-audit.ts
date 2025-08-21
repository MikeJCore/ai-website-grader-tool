import { useState } from 'react';
import type { AuditRequest, AuditResults } from '@/types/audit';
import { auditService } from '@/services/audit.service';

type AuditStatus = 'idle' | 'loading' | 'success' | 'error';

interface UseAuditReturn {
  runAudit: (url: string) => Promise<void>;
  isLoading: boolean;
  status: AuditStatus;
  error: string | null;
  results: AuditResults | null;
  reset: () => void;
}

export const useAudit = (): UseAuditReturn => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<AuditStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<AuditResults | null>(null);

  const reset = () => {
    setStatus('idle');
    setError(null);
    setResults(null);
  };

  const runAudit = async (url: string) => {
    if (!url) {
      setError('Please enter a valid URL');
      setStatus('error');
      return;
    }

    setIsLoading(true);
    setStatus('loading');
    setError(null);
    setResults(null);

    try {
      // Validate URL format
      const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
      
      // Basic URL validation
      try {
        new URL(normalizedUrl);
      } catch (err) {
        throw new Error('Please enter a valid URL (e.g., example.com or https://example.com)');
      }
      
      const request: AuditRequest = {
        url: normalizedUrl,
        options: {
          device: 'mobile', // Default to mobile for now
          throttling: true,
        },
      };

      const response = await auditService.runAudit(request);
      setResults(response);
      setStatus('success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      setStatus('error');
      console.error('Audit error:', err);
      
      // Rethrow to allow component-level error boundaries to catch this
      if (process.env.NODE_ENV === 'development') {
        console.error('Full error object:', err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return {
    runAudit,
    isLoading,
    status,
    error,
    results,
    reset,
  };
};
