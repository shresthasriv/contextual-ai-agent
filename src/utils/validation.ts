import { z } from 'zod';
import { ValidationError } from './errorHandler';

export const AgentRequestSchema = z.object({
  message: z.string()
    .min(1, 'Message cannot be empty')
    .max(4000, 'Message too long (maximum 4000 characters)')
    .trim(),
  sessionId: z.string()
    .min(1, 'Session ID is required')
    .max(100, 'Session ID too long (maximum 100 characters)')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Session ID can only contain letters, numbers, underscores, and hyphens')
    .trim()
});

export const SearchRequestSchema = z.object({
  q: z.string()
    .min(1, 'Query parameter "q" is required')
    .max(200, 'Query too long (maximum 200 characters)')
    .trim(),
  limit: z.string()
    .optional()
    .transform(val => val ? parseInt(val, 10) : 5)
    .refine(val => val >= 1 && val <= 20, 'Limit must be between 1 and 20')
});

export const SessionIdSchema = z.string()
  .min(1, 'Session ID is required')
  .max(100, 'Session ID too long')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid session ID format');

export type ValidatedAgentRequest = z.infer<typeof AgentRequestSchema>;
export type ValidatedSearchRequest = z.infer<typeof SearchRequestSchema>;

export const validateAgentRequest = (data: unknown): ValidatedAgentRequest => {
  try {
    return AgentRequestSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      throw new ValidationError(`Validation failed: ${firstError.message}`);
    }
    throw new ValidationError('Invalid request format');
  }
};

export const validateSearchRequest = (data: unknown): ValidatedSearchRequest => {
  try {
    return SearchRequestSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      throw new ValidationError(`Validation failed: ${firstError.message}`);
    }
    throw new ValidationError('Invalid request format');
  }
};

export const validateSessionId = (sessionId: string): string => {
  try {
    return SessionIdSchema.parse(sessionId);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      throw new ValidationError(`Invalid session ID: ${firstError.message}`);
    }
    throw new ValidationError('Invalid session ID format');
  }
};
