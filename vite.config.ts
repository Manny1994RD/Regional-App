import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'node:path'

const isVercel = !!process.env.VERCEL

export default defineConfig({
  base: isVercel ? '/' : '/Regional-App/',
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  build: {
    sourcemap: true, // enable source maps for production to debug errors
  },
})
