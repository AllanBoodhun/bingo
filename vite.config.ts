import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'bingo',
        short_name: 'bingo',
        description:
          'Bingo à phrases personnalisées, joué en temps réel entre proches pendant un événement partagé.',
        theme_color: '#C1502E',
        background_color: '#F7EFDD',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/favicon.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
          { src: '/favicon.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
    }),
  ],
})
