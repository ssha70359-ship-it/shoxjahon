import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const apiPort = process.env.PORT || 3000;

export default defineConfig({
  root: 'client',
  plugins: [react()],
  resolve: {
    alias: { '@shared': fileURLToPath(new URL('./shared', import.meta.url)) },
  },
  server: {
    port: 5173,
    host: true,
    // ngrok / cloudflared manzillari uchun
    allowedHosts: true,
    proxy: {
      '/api': { target: `http://localhost:${apiPort}`, changeOrigin: false },
    },
  },
  build: {
    outDir: '../dist/client',
    emptyOutDir: true,
    target: 'es2020',
  },
});
