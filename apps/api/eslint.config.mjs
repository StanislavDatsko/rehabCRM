import { baseConfig } from '@repo/eslint-config/base';

export default [
  ...baseConfig,
  {
    ignores: ['dist/**'],
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
];
