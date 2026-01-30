import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        success: resolve(__dirname, 'success.html'),
        edit: resolve(__dirname, 'edit.html'),
        admin: resolve(__dirname, 'admin.html')
      }
    }
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/v': 'http://localhost:3000'
    }
  }
})
