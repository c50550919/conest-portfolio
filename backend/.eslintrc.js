module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.eslint.json',
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
  ],
  plugins: ['@typescript-eslint'],
  root: true,
  env: {
    node: true,
    es2022: true,
    jest: true,
  },
  rules: {
    // Code Complexity Rules (relaxed for CI, tighten incrementally)
    'complexity': ['warn', 15], // Relaxed from 10 - fix gradually
    'max-depth': ['warn', 4], // Relaxed from 3
    'max-lines': ['warn', { max: 400, skipBlankLines: true, skipComments: true }],
    'max-lines-per-function': ['warn', { max: 75, skipBlankLines: true, skipComments: true }],
    'max-params': ['warn', 5], // Relaxed from 4
    'max-statements': ['warn', 30],

    // Code Quality Rules
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-debugger': 'error',
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-return-await': 'warn', // Relaxed - fix gradually
    'no-throw-literal': 'error',
    'no-useless-escape': 'warn', // Some escapes in regex are for clarity
    'no-case-declarations': 'warn', // Should fix but not blocking
    'no-useless-catch': 'warn', // Should fix but not blocking
    'prefer-const': 'error',
    'prefer-promise-reject-errors': 'warn', // Relaxed
    'require-await': 'warn', // Relaxed from error

    // TypeScript Specific Rules (relaxed for CI)
    '@typescript-eslint/explicit-function-return-type': 'off', // Too noisy, enable later
    '@typescript-eslint/explicit-module-boundary-types': 'off', // Too noisy, enable later
    '@typescript-eslint/no-explicit-any': 'warn', // Relaxed from error
    '@typescript-eslint/no-unused-vars': ['error', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
    }],
    '@typescript-eslint/no-floating-promises': 'warn', // Relaxed
    '@typescript-eslint/no-misused-promises': ['warn', { checksVoidReturn: false }], // Relaxed
    '@typescript-eslint/await-thenable': 'warn', // Relaxed
    '@typescript-eslint/no-unnecessary-type-assertion': 'warn', // Relaxed
    '@typescript-eslint/prefer-nullish-coalescing': 'off', // Too noisy
    '@typescript-eslint/prefer-optional-chain': 'off', // Too noisy

    // Disable strict type-checking rules (enable incrementally)
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
    '@typescript-eslint/no-unsafe-argument': 'off',
    '@typescript-eslint/require-await': 'off', // Duplicate of require-await
    '@typescript-eslint/unbound-method': 'warn', // Common pattern in Express routes
    '@typescript-eslint/restrict-template-expressions': 'warn', // Allow Date in templates
    '@typescript-eslint/no-redundant-type-constituents': 'warn', // Type union issues

    // Best Practices
    'eqeqeq': ['error', 'always'],
    'no-var': 'error',
    'prefer-arrow-callback': 'warn',
    'prefer-template': 'warn',
    'arrow-body-style': ['warn', 'as-needed'],

    // Formatting (handled by Prettier, but keep basic rules)
    'indent': ['error', 2, { SwitchCase: 1 }],
    'quotes': ['error', 'single', { avoidEscape: true }],
    'semi': ['error', 'always'],
    'comma-dangle': ['error', 'always-multiline'],
  },
  overrides: [
    {
      // Scripts and seeds - utility files that intentionally use console.log
      files: ['scripts/**/*.ts', 'seeds/**/*.ts'],
      rules: {
        'no-console': 'off',
        'max-statements': 'off',
        'max-lines-per-function': 'off',
        '@typescript-eslint/no-unused-vars': 'warn', // Relax to warn for scripts
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
    {
      files: ['**/*.test.ts', '**/*.spec.ts', '__tests__/**/*.ts', 'tests/**/*.ts', 'src/tests/**/*.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-return': 'off',
        '@typescript-eslint/no-unsafe-argument': 'off',
        '@typescript-eslint/no-var-requires': 'off', // Allow require() in tests for mocking
        '@typescript-eslint/ban-ts-comment': 'off', // Allow @ts-nocheck in tests
        '@typescript-eslint/unbound-method': 'off',
        'no-script-url': 'off', // Allow javascript: URLs in XSS tests
        '@typescript-eslint/no-unused-vars': 'off',
        'require-await': 'off', // Test setup functions may be async without await
        'max-lines-per-function': 'off',
        'max-lines': 'off',
        'max-statements': 'off',
        'no-console': 'off',
      },
    },
  ],
};
