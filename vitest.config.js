/* biome-ignore lint/nursery/noUnresolvedImports: Vitest provides its own config helper */
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    // e2eテストディレクトリをVitestの実行対象から除外する
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      'e2e/**',
    ],
  },
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'hono/jsx',
  },
})
