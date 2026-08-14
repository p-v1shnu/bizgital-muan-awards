/**
 * These suites talk to a real MySQL, because almost everything worth testing
 * here is a database rule — unique slugs, one winner per category, one year
 * accepting entries. Mocking Prisma would test the mock.
 *
 * Point TEST_DATABASE_URL at a throwaway schema; the tests truncate it.
 */
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
process.env.JWT_SECRET ??= 'test-jwt-secret-that-is-long-enough-0123456789';
process.env.REFRESH_TOKEN_SECRET ??= 'test-refresh-secret-that-is-long-enough-0123456789';
process.env.SETUP_ENABLED = 'true';
process.env.CORS_ORIGINS ??= 'http://localhost:3000';
