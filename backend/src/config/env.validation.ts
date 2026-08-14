/**
 * Fail fast on a bad environment: the process should refuse to start rather
 * than surface a confusing runtime error on the first request.
 */
const REQUIRED = [
  'DATABASE_URL',
  'JWT_SECRET',
  'REFRESH_TOKEN_SECRET',
] as const;

export function envValidationSchema(config: Record<string, unknown>) {
  const missing = REQUIRED.filter((key) => !config[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  for (const key of ['JWT_SECRET', 'REFRESH_TOKEN_SECRET'] as const) {
    if (String(config[key]).length < 32) {
      throw new Error(`${key} must be at least 32 characters`);
    }
  }

  return config;
}
