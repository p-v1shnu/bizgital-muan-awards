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

/**
 * Production only. Without INTERNAL_API_SECRET the site's server is rate
 * limited as a single visitor, which is an outage anyone can cause. Without the
 * storage settings the API used to start happily and fail on the first picture
 * an admin uploaded — or, for S3_PUBLIC_URL, save it and hand back a link to
 * nowhere. Development has no proxy in front and falls back to local MinIO.
 */
const REQUIRED_IN_PRODUCTION = [
  'INTERNAL_API_SECRET',
  'S3_ENDPOINT',
  'S3_BUCKET',
  'S3_ACCESS_KEY',
  'S3_SECRET_KEY',
  'S3_PUBLIC_URL',
] as const;

export function envValidationSchema(config: Record<string, unknown>) {
  const required = [
    ...REQUIRED,
    ...(config.NODE_ENV === 'production' ? REQUIRED_IN_PRODUCTION : []),
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

  // A typo here would not fail on its own: Number('1O') is NaN, no count is ever
  // >= NaN, and /health/errors would answer ok through any spike — the alarm
  // switched off with nothing to say so. Empty means unset, as it does in
  // Compose. 0 is allowed on purpose: monitoring.md §12 sets it to prove the
  // alarm rings.
  const threshold = config.ERROR_SPIKE_THRESHOLD;
  if (threshold !== undefined && threshold !== '' && !/^\d+$/.test(String(threshold))) {
    throw new Error('ERROR_SPIKE_THRESHOLD must be a whole number, 0 or more');
  }

  return config;
}
