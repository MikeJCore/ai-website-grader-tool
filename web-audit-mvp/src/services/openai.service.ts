import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const generateAuditInsights = async (auditResults: any): Promise<{
  insights: string[];
  recommendations: string[];
}> => {
  try {
    const prompt = `You are a web performance expert. Analyze these audit results and provide:
1. 3-5 key insights about the website's performance
2. 3-5 actionable recommendations for improvement

Audit Results:
${JSON.stringify(auditResults, null, 2)}

Format the response as JSON with 'insights' and 'recommendations' arrays.`;

    const completion = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a helpful web performance expert.' },
        { role: 'user', content: prompt }
      ],
      model: 'gpt-4-turbo-preview',
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    return JSON.parse(content);
  } catch (error) {
    console.error('Error generating AI insights:', error);
    return {
      insights: [],
      recommendations: []
    };
  }
};
