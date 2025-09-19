import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// Use '/' on Vercel, '/Regional-App/' on GitHub Pages
const isVercel = !!process.env.VERCEL

export default defineConfig({
  base: isVercel ? '/' : '/Regional-App/',
  plugins: [react()],
})
