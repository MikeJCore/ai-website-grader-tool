import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  console.warn('OPENAI_API_KEY is not set. AI features will be disabled.');
}

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

export const generateAuditInsights = async (auditResults: any): Promise<{
  insights: string[];
  recommendations: string[];
}> => {
  if (!openai) {
    throw new Error('OpenAI client is not initialized. Check OPENAI_API_KEY.');
  }

  const prompt = `You are a web performance expert. Analyze these audit results and provide:
1. 3-5 key insights about the website's performance
2. 3-5 actionable recommendations for improvement

Audit Results:
${JSON.stringify(auditResults, null, 2)}

Format the response as JSON with 'insights' and 'recommendations' arrays.`;

  try {
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

    const parsed = JSON.parse(content);
    if (!parsed.insights || !parsed.recommendations) {
      throw new Error('Invalid response format from OpenAI');
    }
    return parsed;
  } catch (error) {
    console.error('Error communicating with OpenAI:', error);
    throw new Error('Failed to generate AI insights.');
  }
};
