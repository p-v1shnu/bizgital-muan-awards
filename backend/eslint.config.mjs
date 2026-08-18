import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * `npm run lint` named a linter this project never installed, so for months it
 * exited with "eslint: not found" and nothing was checked. This is the config
 * that command was always missing.
 *
 * Deliberately the untyped `recommended` set rather than the type-checked one:
 * the type-aware rules are worth having, but turning them all on at once buries
 * a first run under hundreds of `no-unsafe-*` findings from Prisma's generated
 * types, and a linter nobody can get to zero is a linter nobody runs.
 */
const config = [
  {
    ignores: ['dist/**', 'node_modules/**', 'prisma/migrations/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    /**
     * `scripts/` holds plain Node one-offs run with `node scripts/x.js`, not
     * part of the Nest build — `require` is what works there, and the TS rules
     * that assume a module bundler do not apply.
     */
    files: ['scripts/**/*.js'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    rules: {
      /**
       * TypeScript resolves names itself, and better: `no-undef` does not know
       * about Node's globals or about types, so it reports every `process` and
       * `console` in the codebase while missing what tsc already catches.
       * typescript-eslint recommends switching it off in TS for this reason.
       */
      'no-undef': 'off',

      // The base rule double-reports what the TS-aware one finds.
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          // `const { tokenVersion, ...user } = session` is how a field is kept
          // out of what the rest of the request sees — the named half is meant
          // to go unused, and that is the point of writing it.
          ignoreRestSiblings: true,
        },
      ],
    },
  },
];

export default config;
