import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: '@pkg/core/styles', replacement: resolve(__dirname, '../../packages/core/styles') },
      { find: '@pkg/core', replacement: resolve(__dirname, '../../packages/core/src') },
      { find: '@pkg/ui', replacement: resolve(__dirname, '../../packages/ui/src') },
    ],
  },
});
