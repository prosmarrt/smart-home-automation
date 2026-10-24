/**
 * Utility for executing asynchronous operations with retry logic and exponential backoff.
 * Especially helpful for handling transient network drops, gateway timeouts, or cold-start delays.
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  backoffFactor?: number;
  shouldRetry?: (error: unknown) => boolean;
}

/**
 * Checks if an error represents a temporary network error or transient server blip
 */
export function isTransientError(error: unknown): boolean {
  if (!error) return false;

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes('failed to fetch') ||
      msg.includes('networkerror') ||
      msg.includes('network error') ||
      msg.includes('network request failed') ||
      msg.includes('timeout') ||
      msg.includes('connection') ||
      msg.includes('502') ||
      msg.includes('503') ||
      msg.includes('504') ||
      msg.includes('gateway') ||
      msg.includes('upstream') ||
      msg.includes('econnrefused') ||
      msg.includes('econnreset')
    );
  }

  // Handle Supabase PostgrestError objects
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = String((error as { code?: string }).code);
    // 57014 (query canceled), 08006 (connection failure), 08001, etc.
    return code.startsWith('08') || code === '57014' || code === 'PGRST000';
  }

  return false;
}

/**
 * Execute a promise-returning function with exponential backoff retries.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? 2;
  const initialDelayMs = options.initialDelayMs ?? 400;
  const backoffFactor = options.backoffFactor ?? 2;
  const shouldRetry = options.shouldRetry ?? isTransientError;

  let attempt = 0;
  let delay = initialDelayMs;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      if (attempt > maxRetries || !shouldRetry(error)) {
        throw error;
      }
      console.warn(`[Retry] Operation failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= backoffFactor;
    }
  }
}
