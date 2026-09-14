import { baseConfig } from '@repo/eslint-config/base';

export default [
  ...baseConfig,
  {
    ignores: ['.next/**', 'dist/**', 'next-env.d.ts'],
  },
];
