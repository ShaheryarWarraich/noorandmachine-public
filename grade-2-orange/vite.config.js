import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { existsSync, statSync, readdirSync } from 'node:fs';

// Lesson clips live in public/video (made by `npm run clips`). They are precached for offline use when every clip is
// under 25 MB (they are, at 480p); otherwise they stream normally and the rest of the app still works offline.
const MB = 1024 * 1024;
const videoFiles = existsSync('public/video') ? readdirSync('public/video').filter(f => f.endsWith('.mp4')).map(f => 'public/video/' + f) : [];
const cacheVideos = videoFiles.length > 0 && videoFiles.every(f => statSync(f).size < 25 * MB);
const exts = 'js,css,html,svg,png,jpg,mp3,m4a,json,webmanifest' + (cacheVideos ? ',mp4' : '');

export default defineConfig({
  base: './',
  define: { __BUILD__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC') },
  server: { port: 5183 },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*', 'audio/*', 'content/*'],
      manifest: {
        name: "Grade 2 Orange",
        short_name: 'Grade 2 Orange',
        description: 'Learn, say and spell French greetings',
        theme_color: '#e8742a',
        background_color: '#fffdf7',
        display: 'standalone',
        orientation: 'any',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: [`**/*.{${exts}}`],
        globIgnores: ['**/gate.json'],
        maximumFileSizeToCacheInBytes: (cacheVideos ? 25 : 6) * MB,
        navigateFallback: 'index.html',
      },
    }),
  ],
});
