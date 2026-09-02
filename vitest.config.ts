import { defineConfig } from 'vitest/config'

// 单元测试配置：核心算法均为纯函数，node 环境即可
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
  },
})
