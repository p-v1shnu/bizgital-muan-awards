import { envValidationSchema } from '../src/config/env.validation';

/**
 * The checks the process runs before it will start. No database here — these
 * are about which settings a server refuses to boot without.
 */
describe('environment validation', () => {
  const base = {
    DATABASE_URL: 'mysql://muan:x@127.0.0.1:3306/muan_awards',
    JWT_SECRET: 'jwt-secret-that-is-long-enough-0123456789',
    REFRESH_TOKEN_SECRET: 'refresh-secret-that-is-long-enough-0123456789',
    IP_HASH_SALT: 'ip-hash-salt-that-is-long-enough-0123456789',
  };

  const production = {
    ...base,
    NODE_ENV: 'production',
    INTERNAL_API_SECRET: 'internal-api-secret-that-is-long-enough-0123',
    S3_ENDPOINT: 'https://sgp1.digitaloceanspaces.com',
    S3_BUCKET: 'muan-awards',
    S3_ACCESS_KEY: 'access',
    S3_SECRET_KEY: 'secret',
    S3_PUBLIC_URL: 'https://muan-awards.sgp1.digitaloceanspaces.com',
  };

  it('starts in development without storage settings', () => {
    expect(() => envValidationSchema(base)).not.toThrow();
  });

  it('starts in production with every setting present', () => {
    expect(() => envValidationSchema(production)).not.toThrow();
  });

  it.each(['S3_ENDPOINT', 'S3_BUCKET', 'S3_ACCESS_KEY', 'S3_SECRET_KEY', 'S3_PUBLIC_URL'])(
    'refuses to start in production without %s',
    (key) => {
      expect(() => envValidationSchema({ ...production, [key]: '' })).toThrow(key);
    },
  );

  it.each(['0', '10', '30'])('accepts %s as the error spike threshold', (value) => {
    expect(() => envValidationSchema({ ...base, ERROR_SPIKE_THRESHOLD: value })).not.toThrow();
  });

  it('treats an empty threshold as unset', () => {
    expect(() => envValidationSchema({ ...base, ERROR_SPIKE_THRESHOLD: '' })).not.toThrow();
  });

  // Each of these reads as NaN or a fraction, and the alarm would never ring.
  it.each(['ten', '1O', '-5', '2.5'])('refuses %s as the error spike threshold', (value) => {
    expect(() => envValidationSchema({ ...base, ERROR_SPIKE_THRESHOLD: value })).toThrow(
      'ERROR_SPIKE_THRESHOLD',
    );
  });
});
