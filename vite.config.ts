import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Vite builds the app. Tailwind is wired in here so there is no separate
// Tailwind config file to keep in sync.
//
// BASE_PATH is the folder the site is served from. Locally it is "/". On
// GitHub Pages the site lives under "/trophy-case/", and the deploy
// workflow sets it. With a custom domain later it goes back to "/".
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss()],
})
