import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// IMPORTANT for GitHub Pages: set base to '/<REPO_NAME>/'
export default defineConfig({
  base: '/Regional-App/',
  plugins: [react()],
})
