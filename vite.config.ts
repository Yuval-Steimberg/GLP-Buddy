import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'],
      workbox: {
        // Offline app shell + our custom push/notification handlers.
        importScripts: ['/push-sw.js'],
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
      },
      manifest: {
        name: 'GLPenPal',
        short_name: 'GLPenPal',
        description: 'A GLP pen pal who gets it. Get matched with someone on a similar GLP journey.',
        theme_color: '#5e8c74',
        background_color: '#f6f4ee',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        // Split heavy vendors so the initial app chunk stays lean.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          sentry: ['@sentry/react'],
        },
      },
    },
  },
})
