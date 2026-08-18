import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    base: './',
    plugins: [vue()],
    server: {
      proxy: {
        '/api': {
          target: env.VITE_DEV_API_TARGET || 'http://127.0.0.1:3000',
          changeOrigin: true
        },
        '/socket.io': {
          target: env.VITE_DEV_API_TARGET || 'http://127.0.0.1:3000',
          ws: true,
          changeOrigin: true
        }
      },
      // 启用服务器缓存
      hmr: true,
      // 提高服务器响应速度
      port: 5173,
      open: true
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
