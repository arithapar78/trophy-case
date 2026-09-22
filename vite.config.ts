import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import devLoginHandler from './api/auth/dev.ts'
import googleLoginHandler from './api/auth/google.ts'
import signOutHandler from './api/auth/signout.ts'
import configHandler from './api/config.ts'
import meHandler from './api/me.ts'
import rankHandler from './api/rank.ts'
import readPhotoHandler from './api/read-photo.ts'
import recommendHandler from './api/recommend.ts'

// BASE_PATH is the folder the site is served from. It is "/" everywhere we
// host now (Vercel, local). It only needs setting if the app is ever served
// from a sub-folder, like GitHub Pages' /trophy-case/.
const base = process.env.BASE_PATH ?? '/'

const { version } = JSON.parse(readFileSync('./package.json', 'utf8')) as { version: string }

// On Vercel, files in api/ become serverless functions automatically. The
// local dev and preview servers don't know about them, so this plugin wires
// the same handler in at the same URL. With no ANTHROPIC_API_KEY in
// .env.local it answers in MOCK mode.
function localApi(mode: string): Plugin {
  const env = loadEnv(mode, process.cwd(), '')
  if (env.ANTHROPIC_API_KEY) process.env.ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY
  const handlers = {
    '/api/read-photo': readPhotoHandler,
    '/api/rank': rankHandler,
    '/api/recommend': recommendHandler,
    '/api/config': configHandler,
    '/api/me': meHandler,
    '/api/auth/google': googleLoginHandler,
    '/api/auth/dev': devLoginHandler,
    '/api/auth/signout': signOutHandler,
  }
  const attach = (server: { middlewares: { use: (path: string, fn: (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => void) => void } }) => {
    for (const [path, handler] of Object.entries(handlers)) {
      server.middlewares.use(path, (req, res) => {
        void handler(req, res)
      })
    }
  }
  return { name: 'trophy-case-local-api', configureServer: attach, configurePreviewServer: attach }
}

export default defineConfig(({ mode }) => ({
  base,
  // Shown in Settings so you can tell which version a phone is running.
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [
    react(),
    tailwindcss(),
    localApi(mode),
    // The service worker caches the whole app so it opens with no signal,
    // and the manifest is what lets the phone install it to the Home Screen.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Trophy Case',
        short_name: 'Trophy Case',
        description: 'Snap a photo. Save the win. Everything stays on your phone.',
        theme_color: '#f4f5f7',
        background_color: '#f4f5f7',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png}'],
      },
    }),
  ],
}))
