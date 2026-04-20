const { defineConfig } = require('vite')
const vue = require('@vitejs/plugin-vue')
const path = require('path')

// https://vitejs.dev/config/
module.exports = defineConfig({
  plugins: [
    vue()
  ],
  base: './', // 使用相对路径，解决打包后资源加载问题
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // 使用固定文件名，避免哈希变化
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  }
})
