import OpenAI from 'openai';

let openai: OpenAI | null = null;

// Initialize OpenAI client if not in browser environment
if (typeof window === 'undefined') {
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not set in environment variables');
  } else {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
}

export const generateAuditInsights = async (auditResults: any): Promise<{
  insights: string[];
  recommendations: string[];
}> => {
  // Default error response
  const errorResponse = {
    insights: ['Failed to generate insights due to server error'],
    recommendations: ['Please check your OpenAI API key and try again']
  };

  try {
    if (!openai) {
      console.error('OpenAI client is not initialized');
      return errorResponse;
    }

    const prompt = `You are a web performance expert. Analyze these audit results and provide:
1. 3-5 key insights about the website's performance
2. 3-5 actionable recommendations for improvement

Audit Results:
${JSON.stringify(auditResults, null, 2)}

Format the response as JSON with 'insights' and 'recommendations' arrays.`;

    console.log('Sending request to OpenAI API...');
    const completion = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a helpful web performance expert.' },
        { role: 'user', content: prompt }
      ],
      model: 'gpt-4-turbo-preview',
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    console.log('Received response from OpenAI API');
    const content = completion.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    try {
      const parsed = JSON.parse(content);
      if (!parsed.insights || !parsed.recommendations) {
        throw new Error('Invalid response format from OpenAI');
      }
      return parsed;
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      console.error('Response content:', content);
      return errorResponse;
    }
  } catch (error: any) {
    console.error('Error generating AI insights:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    if (error.response) {
      console.error('Error status:', error.response.status);
      console.error('Error data:', error.response.data);
    }
    
    return errorResponse;
  }
};
