import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// Kept separate from vite.config.ts so `test` typings resolve cleanly.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'supabase/functions/**/*.{test,spec}.ts',
    ],
    css: false,
    coverage: {
      provider: 'v8',
      include: [
        'src/**/*.{ts,tsx}',
        'supabase/functions/_shared/**/*.ts',
      ],
      exclude: [
        'src/**/*.d.ts',
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/test/**',
      ],
    },
  },
});
