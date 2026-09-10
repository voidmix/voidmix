import { defineConfig } from 'vite-plus'
export default defineConfig({
  test: {
    include: ['packages/**/*.test.ts', 'apps/**/*.test.ts'],
    exclude: ['**/*.integration.test.ts', '**/node_modules/**'],
    env: { NODE_ENV: 'test' },
  },
  fmt: {
    singleQuote: true,
    semi: false,
    ignorePatterns: [
      '**/routeTree.gen.ts',
      '**/.output/**',
      '**/dist/**',
      '**/drizzle/meta/**',
      'bun.lock',
    ],
  },
  lint: { ignorePatterns: ['**/routeTree.gen.ts', '**/.output/**', '**/dist/**', '**/drizzle/**'] },
  run: {
    cache: { scripts: false },
    tasks: {
      boundaries: {
        command: 'bun scripts/check-boundaries.ts',
        input: [
          'apps/*/src/**',
          'apps/*/server/**',
          'apps/*/package.json',
          'packages/*/src/**',
          'packages/*/package.json',
          'scripts/check-boundaries.ts',
          'package.json',
        ],
        output: [],
      },
      types: {
        command: 'tsc --noEmit',
        input: [
          'apps/*/src/**',
          'apps/*/server/**',
          'apps/*/*.ts',
          'apps/*/*.json',
          'packages/*/src/**',
          'packages/*/*.ts',
          'packages/*/*.json',
          'tests/**',
          'scripts/*.ts',
          'tsconfig.json',
          'package.json',
          'bun.lock',
          '*.ts',
        ],
        output: [],
      },
    },
  },
})
