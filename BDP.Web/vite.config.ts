import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const outDir = process.env.VERCEL === '1' ? 'dist' : '../BDP.API/wwwroot'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir,
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5252',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
