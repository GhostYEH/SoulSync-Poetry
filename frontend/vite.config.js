import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const devApiTarget = env.VITE_DEV_API_TARGET || 'http://127.0.0.1:3000'

  return {
    base: './',
    plugins: [vue()],
    server: {
      proxy: {
        '/api': {
          target: devApiTarget,
          changeOrigin: true
        },
        // Socket.IO 在开发环境也必须转发到后端，否则默认会连到 5173
        // 而不是实际提供 Socket.IO 服务的 3000。
        '/socket.io': {
          target: devApiTarget,
          ws: true,
          changeOrigin: true
        }
      },
    // 启用服务器缓存
    hmr: true,
    // 提高服务器响应速度
    port: 5173,
    // 避免开发服务启动或重启时强行唤起已经最小化的浏览器。
    open: false
  },
    // 构建优化
    build: {
    // 输出到backend/public目录
    outDir: '../backend/public',
    // 清空输出目录
    emptyOutDir: true,
    // 启用代码分割
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('echarts')) return 'echarts'
            if (id.includes('socket.io-client') || id.includes('socket.io-parser') || id.includes('engine.io-client')) return 'socket'
            if (id.includes('@capacitor')) return 'capacitor'
            if (id.includes('vue') || id.includes('pinia')) return 'vendor'
          }
        }
      }
    },
    // 启用压缩（使用默认的esbuild）
    minify: 'esbuild',
    esbuild: {
      drop: ['console', 'debugger']
    },
    // 生成源映射
    sourcemap: false,
    // 提高构建速度
    chunkSizeWarningLimit: 1000
  },
    // 配置别名，简化导入路径
    resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@views': resolve(__dirname, 'src/views'),
      '@services': resolve(__dirname, 'src/services'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@config': resolve(__dirname, 'src/config'),
      '@assets': resolve(__dirname, 'src/assets')
    }
  },
    // 预构建优化
    optimizeDeps: {
    // 预构建的依赖
    include: ['vue', 'vue-router'],
    // 禁用动态导入的预构建
    exclude: []
    }
  }
})
