import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Unit tests (Vitest + jsdom). Separate from vite.config.ts so the PWA and
// Tailwind plugins stay out of tests. E2E tests live in tests/ (Playwright).
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
    unstubGlobals: true,
    env: { VITE_API_BASE_URL: 'http://api.test/api/v1' },
    coverage: {
      provider: 'v8',
      include: ['src/commons/**', 'src/services/**', 'src/hooks/**'],
      exclude: ['**/index.ts', '**/*.test.*'],
    },
  },
});
