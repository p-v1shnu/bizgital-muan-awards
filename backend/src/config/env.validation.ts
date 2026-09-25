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
  // Production only: without it the site's server is rate limited as a single
  // visitor, which is an outage anyone can cause. Development has no proxy in
  // front and can do without.
  const required = [
    ...REQUIRED,
    ...(config.NODE_ENV === 'production' ? (['INTERNAL_API_SECRET'] as const) : []),
  ];
  const missing = required.filter((key) => !config[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  const secrets = [
    'JWT_SECRET',
    'REFRESH_TOKEN_SECRET',
    'IP_HASH_SALT',
    ...(config.INTERNAL_API_SECRET ? (['INTERNAL_API_SECRET'] as const) : []),
  ];
  for (const key of secrets) {
    if (String(config[key]).length < 32) {
      throw new Error(`${key} must be at least 32 characters`);
    }
  }

  // Separate jobs, so separate values: reusing one means a rotation done for
  // one reason silently does the others as well.
  const values = secrets.map((key) => String(config[key]));
  if (new Set(values).size !== values.length) {
    throw new Error(`${secrets.join(', ')} must each be a different value`);
  }

  return config;
}
