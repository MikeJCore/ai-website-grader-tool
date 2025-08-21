import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Sparkles } from 'lucide-react';
import type { AuditInsights } from '@/types/audit';

interface AIAnalysisProps {
  insights?: AuditInsights;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export function AIAnalysis({ insights, status }: AIAnalysisProps) {
  if (status === 'pending') return null;

  if (status === 'processing') {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Analyzing with AI...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (status === 'failed' || !insights) {
    return (
      <Alert variant="destructive" className="mt-6">
        <AlertTitle>AI Analysis Failed</AlertTitle>
        <AlertDescription>
          We couldn't generate AI insights for this audit. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 mt-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            AI-Powered Insights
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Generated on {new Date(insights.generatedAt).toLocaleString()}
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Key Findings</h3>
              <ul className="list-disc pl-5 space-y-1">
                {insights.insights.map((insight, i) => (
                  <li key={i} className="text-sm">
                    {insight}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-medium mb-2">Recommendations</h3>
              <ul className="list-disc pl-5 space-y-1">
                {insights.recommendations.map((rec, i) => (
                  <li key={i} className="text-sm">
                    {rec}
                  </li>
                ))}
              </ul>
            </div>

            {insights.summary && (
              <div className="mt-4 p-4 bg-muted/50 rounded-md">
                <p className="text-sm italic">{insights.summary}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
