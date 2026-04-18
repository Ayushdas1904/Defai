export const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function sanitizeRecipientInput(value) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/^["']|["']$/g, '');
}

export function isQuotaOrRateLimitError(error) {
  const message = (error && error.message) ? error.message : '';
  return message.includes('429') || /quota|rate limit/i.test(message);
}

export function extractRetryDelaySeconds(error) {
  const message = (error && error.message) ? error.message : '';
  const retryInfoMatch = message.match(/retryDelay":"(\d+)s"/i);
  if (retryInfoMatch?.[1]) return Number(retryInfoMatch[1]);
  const plainTextMatch = message.match(/retry in\s+([\d.]+)s/i);
  if (plainTextMatch?.[1]) return Math.ceil(Number(plainTextMatch[1]));
  return null;
}
