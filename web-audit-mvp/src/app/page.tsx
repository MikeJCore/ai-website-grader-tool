'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { useAudit } from '@/hooks/use-audit';
import { AIAnalysis } from '@/components/AIAnalysis';

const PILLARS = [
  { id: 'accessibility', name: 'Accessibility', description: 'WCAG 2.1 AA + EAA compliance' },
  { id: 'trust', name: 'Trust & Transparency', description: 'Security and privacy metrics' },
  { id: 'performance', name: 'UX & Performance', description: 'Core Web Vitals and more' },
  { id: 'agentReadiness', name: 'Agent Readiness', description: 'Structured data and metadata' },
] as const;

export default function Home() {
  const [url, setUrl] = useState('');
  const { 
    runAudit, 
    isLoading, 
    status,
    error, 
    results,
    reset 
  } = useAudit();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    
    try {
      await runAudit(url.trim());
    } catch (error) {
      console.error('Audit error:', error);
    }
  };

  const handleReset = () => {
    setUrl('');
    reset();
  };

  return (
    <main className="container mx-auto py-8 px-4 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            Web Performance Audit
          </h1>
          <p className="text-muted-foreground">
            Analyze your website across four key pillars: Accessibility, Trust & Transparency, 
            UX & Performance, and Agent Readiness
          </p>
        </div>

        <Card className="w-full shadow-lg">
          <CardHeader>
            <CardTitle>Start a New Audit</CardTitle>
            <CardDescription>
              Enter a website URL to analyze its performance and get actionable insights
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <Input 
                  type="url" 
                  placeholder="https://example.com" 
                  className="flex-1"
                  value={url}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const target = e.target as HTMLInputElement;
                    setUrl(target.value);
                  }}
                  disabled={isLoading}
                  required
                />
                <div className="flex gap-2">
                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="min-w-[120px]"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      'Run Audit'
                    )}
                  </Button>
                  {(status === 'success' || status === 'error') && (
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={handleReset}
                      disabled={isLoading}
                    >
                      New Audit
                    </Button>
                  )}
                </div>
              </div>
              
              {error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="ml-2">
                    {error}
                  </AlertDescription>
                </Alert>
              )}
            </form>
          </CardContent>
        </Card>

        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
            <p className="text-muted-foreground">Analyzing website, this may take a moment...</p>
          </div>
        )}

        {status === 'success' && results && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-semibold">Audit Results</h2>
              <p className="text-muted-foreground">
                Analysis for {new URL(results.url).hostname} • 
                {new Date(results.timestamp).toLocaleString()}
              </p>
              
              <div className="mt-6 p-4 bg-muted/50 rounded-lg inline-block">
                <div className="text-4xl font-bold">
                  {results.overallScore.toFixed(1)}
                  <span className="text-muted-foreground text-2xl">/5.0</span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">Overall Score</div>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {PILLARS.map((pillar) => {
                const pillarData = results.pillars[pillar.id as keyof typeof results.pillars];
                return (
                  <Card key={pillar.id} className="h-full">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">{pillar.name}</CardTitle>
                        <div className="text-2xl font-bold">
                          {pillarData.score.toFixed(1)}
                          <span className="text-muted-foreground text-sm ml-1">/5.0</span>
                        </div>
                      </div>
                      <CardDescription>{pillar.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {pillarData.insights.length > 0 && (
                        <div className="space-y-2 mt-2">
                          <h4 className="text-sm font-medium">Key Insights:</h4>
                          <ul className="text-sm space-y-1.5 text-muted-foreground">
                            {pillarData.insights.slice(0, 3).map((insight, i) => (
                              <li key={i} className="flex items-start">
                                <span className="text-primary mr-2">•</span>
                                {insight}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
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

            {/* AI Analysis Section */}
            <div className="mt-8">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-yellow-500" />
                <h2 className="text-xl font-semibold">AI-Powered Analysis</h2>
              </div>
              <AIAnalysis 
                insights={results.aiAnalysis} 
                status={results.status || 'pending'} 
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
