import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: 'prompt',          // muestra prompt antes de actualizar
      includeAssets: ['favicon.svg', 'pwa-192.svg', 'pwa-512.svg', 'pwa-maskable.svg'],
      manifest: {
        name: 'FincaPro — Gestión Ganadera',
        short_name: 'FincaPro',
        description: 'Gestión integral de fincas ganaderas: animales, potreros, salud, reproducción y más.',
        theme_color: '#16a34a',
        background_color: '#f9fafb',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        lang: 'es',
        categories: ['agriculture', 'productivity', 'business'],
        icons: [
          {
            src: '/pwa-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
          {
            src: '/pwa-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
          },
          {
            src: '/pwa-maskable.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Caché de archivos estáticos del bundle (JS, CSS, HTML)
        globPatterns: ['**/*.{js,css,html,ico,svg,woff2}'],

        // Estrategias de caché por tipo de recurso
        runtimeCaching: [
          // ── Supabase API: network-first con fallback a caché ──────────
          {
            urlPattern: ({ url }) =>
              url.hostname.endsWith('.supabase.co') &&
              url.pathname.startsWith('/rest/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 3,   // 3 días
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // ── Supabase Auth: network-only (no cachear tokens) ───────────
          {
            urlPattern: ({ url }) =>
              url.hostname.endsWith('.supabase.co') &&
              url.pathname.startsWith('/auth/'),
            handler: 'NetworkOnly',
          },
          // ── Supabase Storage (imágenes): stale-while-revalidate ───────
          {
            urlPattern: ({ url }) =>
              url.hostname.endsWith('.supabase.co') &&
              url.pathname.startsWith('/storage/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'supabase-storage',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7,   // 7 días
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // ── Leaflet tiles (mapas) ─────────────────────────────────────
          {
            urlPattern: ({ url }) =>
              url.hostname.includes('tile.openstreetmap.org') ||
              url.hostname.includes('tiles.stadiamaps.com'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 30,  // 30 días
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // ── Google Fonts ──────────────────────────────────────────────
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 año
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,  // no activa SW en dev para no interferir con HMR
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api/groq': {
        target: 'https://api.groq.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/groq/, '/openai/v1'),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            const groqKey = process.env.VITE_GROQ_API_KEY || ''
            proxyReq.setHeader('Authorization', `Bearer ${groqKey}`)
          })
        },
      },
    },
  },
})
