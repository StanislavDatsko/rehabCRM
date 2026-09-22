import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://rehabcrm:test@localhost:5432/rehabcrm',
      REDIS_URL: 'redis://localhost:6379',
      S3_ENDPOINT: 'http://localhost:9000',
      S3_REGION: 'us-east-1',
      S3_ACCESS_KEY: 'test',
      S3_SECRET_KEY: 'testsecret',
      S3_BUCKET_DOCUMENTS: 'rehabcrm-documents',
      S3_BUCKET_MODELS: 'rehabcrm-models',
    },
  },
});
