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
        name: 'PlayUtsav',
        short_name: 'PlayUtsav',
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
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        configure: (proxy, _options) => {
          proxy.on('error', (err: any, req, res) => {
            console.error('[Proxy Error]', err.code || err.message);
            // Don't crash on connection reset - just log and continue
            try {
              if (err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
                console.log('[Proxy] Backend connection issue - request will retry');
                // Send a proper error response instead of crashing
                if (res && !res.headersSent && typeof res.writeHead === 'function') {
                  res.writeHead(503, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ 
                    error: 'Service temporarily unavailable', 
                    code: 'BACKEND_UNAVAILABLE' 
                  }));
                }
              }
            } catch (responseError) {
              console.error('[Proxy] Error sending error response:', responseError);
            }
          });

          // Handle socket errors on the proxy connection
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
            
            // Add error handler to the proxy request socket
            if (proxyReq.socket) {
              proxyReq.socket.on('error', (socketErr: any) => {
                console.error('[Proxy Socket Error]', socketErr.code || socketErr.message);
              });
            }
          });

          proxy.on('proxyRes', (proxyRes, req, _res) => {
            if (proxyRes.statusCode && proxyRes.statusCode >= 400) {
              console.log('[Proxy] Response:', req.method, req.url, '→', proxyRes.statusCode);
            }
          });
        },
      },
    },
  },
  resolve: {
    alias: [
      { find: /^@pkg\/core\/styles/, replacement: resolve(__dirname, '../../packages/core/styles') },
      { find: /^@pkg\/core/, replacement: resolve(__dirname, '../../packages/core/src') },
      { find: /^@pkg\/ui/, replacement: resolve(__dirname, '../../packages/ui/src') },
    ],
  },
});
