import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite-plus'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'
const root = fileURLToPath(new URL('.', import.meta.url))
const workspace = fileURLToPath(new URL('../../', import.meta.url))
export default defineConfig(({ mode }) => {
  for (const [key, value] of Object.entries(loadEnv(mode, workspace, '')))
    process.env[key] ??= value
  return {
    root,
    envDir: workspace,
    server: { port: 3000, strictPort: true },
    plugins: [
      tailwindcss(),
      tanstackStart({ srcDirectory: 'src', server: { entry: 'server' } }),
      react(),
      nitro({ preset: 'node-server', plugins: [`${root}server/plugins/services.ts`] }),
    ],
    run: {
      tasks: {
        bundle: {
          command: 'vp build',
          cache: true,
          input: [
            { pattern: 'apps/web/src/**', base: 'workspace' },
            { pattern: 'apps/desktop/src/**', base: 'workspace' },
            { pattern: 'apps/web/server/**', base: 'workspace' },
            { pattern: 'packages/*/src/**', base: 'workspace' },
            { pattern: 'packages/*/package.json', base: 'workspace' },
            { pattern: 'packages/*/tsconfig.json', base: 'workspace' },
            { pattern: 'packages/db/drizzle/**', base: 'workspace' },
            { pattern: 'bun.lock', base: 'workspace' },
            { pattern: '*.json', base: 'workspace' },
            { pattern: '.env.example', base: 'workspace' },
            'vite.config.ts',
            'package.json',
          ],
          output: ['.output/**', 'src/routeTree.gen.ts'],
          env: ['NODE_ENV'],
        },
      },
    },
  }
})
