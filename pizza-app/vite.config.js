import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    // ngrok / cloudflared manzillari uchun
    allowedHosts: true,
    proxy: {
      '/api': { target: `http://localhost:${process.env.PORT || 3000}`, changeOrigin: false },
    },
  },
  build: {
    outDir: 'dist',
    target: 'es2020',
    sourcemap: false,
  },
});
