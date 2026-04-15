const { defineConfig } = require('vite')
const vue = require('@vitejs/plugin-vue')

// https://vitejs.dev/config/
module.exports = defineConfig({
  plugins: [
    vue()
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})