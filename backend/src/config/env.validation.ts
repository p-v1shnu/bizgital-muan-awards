/**
 * Fail fast on a bad environment: the process should refuse to start rather
 * than surface a confusing runtime error on the first request.
 */
const REQUIRED = [
  'DATABASE_URL',
  'JWT_SECRET',
  'REFRESH_TOKEN_SECRET',
  // What makes a stored ipHash unreadable. Required rather than defaulted: a
  // default would be the same on every install and therefore no salt at all.
  'IP_HASH_SALT',
] as const;

export function envValidationSchema(config: Record<string, unknown>) {
  const missing = REQUIRED.filter((key) => !config[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  for (const key of ['JWT_SECRET', 'REFRESH_TOKEN_SECRET', 'IP_HASH_SALT'] as const) {
    if (String(config[key]).length < 32) {
      throw new Error(`${key} must be at least 32 characters`);
    }
  }

  // Three separate jobs, so three separate values: reusing one means a rotation
  // done for one reason silently does the other two as well.
  const secrets = ['JWT_SECRET', 'REFRESH_TOKEN_SECRET', 'IP_HASH_SALT'] as const;
  const values = secrets.map((key) => String(config[key]));
  if (new Set(values).size !== values.length) {
    throw new Error(`${secrets.join(', ')} must each be a different value`);
  }

  return config;
}
