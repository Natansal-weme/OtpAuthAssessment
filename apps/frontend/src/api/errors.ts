import { isAxiosError } from 'axios';

const FALLBACK_MESSAGE = 'Something went wrong. Please try again.';

/**
 * User-facing message for a failed request. Nest exceptions carry `message` as a string, or as
 * a list of validation issues.
 */
export function getErrorMessage(error: unknown): string {
  if (!isAxiosError(error)) return FALLBACK_MESSAGE;
  if (!error.response) return 'Unable to reach the server. Check your connection and try again.';

  const message: unknown = error.response.data?.message;
  if (Array.isArray(message)) return message.join('. ');
  if (typeof message === 'string') return message;
  return FALLBACK_MESSAGE;
}

export function getErrorStatus(error: unknown): number | undefined {
  return isAxiosError(error) ? error.response?.status : undefined;
}
