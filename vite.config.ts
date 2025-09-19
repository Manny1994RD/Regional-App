// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const isVercel = !!process.env.VERCEL
export default defineConfig({
  base: isVercel ? '/' : '/Regional-App/', // Vercel vs GH Pages
  plugins: [react()],
})
