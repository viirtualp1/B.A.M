import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [
    vue(),
    ...(mode === 'single'
      ? [viteSingleFile()]
      : [
          VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'icon.svg'],
            manifest: {
              id: './',
              name: 'Billion & Million',
              short_name: 'B & M',
              description: 'A cute platformer: Rosie rescues the tuxedo kitties Billion and Million.',
              lang: 'en',
              start_url: './',
              scope: './',
              display: 'fullscreen',
              display_override: ['fullscreen', 'standalone'],
              orientation: 'landscape',
              background_color: '#2d2140',
              theme_color: '#2d2140',
              categories: ['games', 'kids', 'entertainment'],
              icons: [
                { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
                { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
                { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
                { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
              ],
            },
            workbox: {
              globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
              runtimeCaching: [
                {
                  // Google Fonts: cache so the game looks right offline
                  urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
                  handler: 'CacheFirst',
                  options: { cacheName: 'fonts', expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }, cacheableResponse: { statuses: [0, 200] } },
                },
              ],
            },
          }),
        ]),
  ],
  build: { outDir: mode === 'single' ? 'dist-single' : 'dist' },
}))
