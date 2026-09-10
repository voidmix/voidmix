import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite-plus'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  plugins: [tailwindcss(), react()],
  server: { port: 1420, strictPort: true },
  run: {
    tasks: {
      bundle: {
        command: 'vp build',
        cache: true,
        input: [
          'src/**',
          'index.html',
          'vite.config.ts',
          'package.json',
          { pattern: 'packages/*/src/**', base: 'workspace' },
          { pattern: 'apps/web/src/**', base: 'workspace' },
          { pattern: 'tsconfig.json', base: 'workspace' },
          { pattern: 'packages/*/package.json', base: 'workspace' },
          { pattern: 'packages/*/tsconfig.json', base: 'workspace' },
          { pattern: 'packages/db/drizzle/**', base: 'workspace' },
          { pattern: 'bun.lock', base: 'workspace' },
        ],
        output: ['dist/**'],
        env: ['VITE_API_URL'],
      },
    },
  },
})
