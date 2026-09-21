import { MastraEvalsReporter } from '@mastra/evals/vitest'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    reporters: ['default', new MastraEvalsReporter()],
    setupFiles: ['@mastra/evals/vitest/setup'],
    testTimeout: 120_000,
    fileParallelism: false,
  },
})
