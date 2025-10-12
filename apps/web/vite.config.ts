import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.png'],
      manifest: {
        name: 'Family Fun',
        short_name: 'FamilyFun',
        start_url: '/',
        display: 'standalone',
        background_color: '#0b1020',
        theme_color: '#5b8cff',
        icons: [
          { src: 'icon.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],
  resolve: {
    alias: [
      { find: '@pkg/core/styles', replacement: resolve(__dirname, '../../packages/core/styles') },
      { find: '@pkg/core', replacement: resolve(__dirname, '../../packages/core/src') },
      { find: '@pkg/ui', replacement: resolve(__dirname, '../../packages/ui/src') },
    ],
  },
});
