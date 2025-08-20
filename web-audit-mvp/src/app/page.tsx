'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAudit } from '@/hooks/use-audit';

const PILLARS = [
  { id: 'accessibility', name: 'Accessibility', description: 'WCAG 2.1 AA + EAA compliance' },
  { id: 'trust', name: 'Trust & Transparency', description: 'Security and privacy metrics' },
  { id: 'performance', name: 'UX & Performance', description: 'Core Web Vitals and more' },
  { id: 'agentReadiness', name: 'Agent Readiness', description: 'Structured data and metadata' },
];

export default function Home() {
  const [url, setUrl] = useState('');
  const { runAudit, isLoading, error, results } = useAudit();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runAudit(url);
  };

  return (
    <main className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Web Performance Audit</h1>
          <p className="text-muted-foreground">
            Analyze your website across four key pillars: Accessibility, Trust & Transparency, UX & Performance, and Agent Readiness
          </p>
        </div>

        <Card className="w-full">
          <CardHeader>
            <CardTitle>Start a New Audit</CardTitle>
            <CardDescription>
              Enter a website URL to analyze its performance and get actionable insights
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
              <Input 
                type="url" 
                placeholder="https://example.com" 
                className="flex-1"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isLoading}
                required
              />
              <Button 
                type="submit" 
                className="whitespace-nowrap"
                disabled={isLoading}
              >
                {isLoading ? 'Analyzing...' : 'Analyze Website'}
              </Button>
            </form>
            {error && (
              <p className="mt-2 text-sm text-destructive">{error}</p>
            )}
          </CardContent>
        </Card>

        {results && (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {PILLARS.map((pillar) => {
                const score = results.pillars[pillar.id as keyof typeof results.pillars].score;
                const percentage = (score / 5) * 100;
                
                return (
                  <Card key={pillar.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-3xl font-bold">{score.toFixed(1)}</CardTitle>
                      <CardDescription>{pillar.name}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-2 bg-muted rounded-full">
                        <div 
                          className={`h-full rounded-full ${
                            score >= 4 ? 'bg-green-500' : 
                            score >= 2.5 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {pillar.description}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Audit Results</CardTitle>
                <CardDescription>
                  Detailed analysis for {results.url}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {PILLARS.map((pillar) => {
                    const pillarData = results.pillars[pillar.id as keyof typeof results.pillars];
                    
                    return (
                      <div key={pillar.id} className="space-y-2">
                        <h3 className="text-lg font-semibold">{pillar.name}</h3>
                        <div className="space-y-4">
                          {pillarData.metrics.map((metric, index) => (
                            <div key={index} className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span>{metric.name}</span>
                                <span className="font-medium">
                                  {metric.score.toFixed(1)} / 5
                                </span>
                              </div>
                              <div className="h-2 bg-muted rounded-full">
                                <div 
                                  className={`h-full rounded-full ${
                                    metric.score >= 4 ? 'bg-green-500' : 
                                    metric.score >= 2.5 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${(metric.score / 5) * 100}%` }}
                                ></div>
                              </div>
                            </div>
                          ))}
                        </div>
                        {pillarData.insights.length > 0 && (
                          <div className="mt-4 p-4 bg-muted/50 rounded-md">
                            <h4 className="text-sm font-medium mb-2">Key Insights</h4>
                            <ul className="space-y-1 text-sm">
                              {pillarData.insights.map((insight, i) => (
                                <li key={i} className="flex items-start">
                                  <span className="mr-2">•</span>
                                  <span>{insight}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
