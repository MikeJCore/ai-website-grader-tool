import { z } from 'zod';

export const auditRequestSchema = z.object({
  url: z.string().url({ message: 'Please provide a valid URL' }),
  options: z.object({
    device: z.enum(['mobile', 'desktop']).optional().default('desktop'),
    throttling: z.boolean().optional().default(false),
  }).optional().default({}),
});

export function validateAuditRequest(data: unknown) {
  const result = auditRequestSchema.safeParse(data);
  if (!result.success) {
    const errorMessages = result.error.issues.map(issue => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    throw new Error(JSON.stringify({
      message: 'Validation failed',
      errors: errorMessages,
    }));
  }
  return result.data;
}

export function sanitizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Ensure we have a protocol
    if (!urlObj.protocol) {
      urlObj.protocol = 'https:';
    }
    return urlObj.toString();
  } catch (error) {
    throw new Error(`Invalid URL: ${url}`);
  }
}
