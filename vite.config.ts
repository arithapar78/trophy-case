import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Vite builds the app. Tailwind is wired in here so there is no separate
// Tailwind config file to keep in sync.
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
