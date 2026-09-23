import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Serverda admin panel /admin/ manzilida turadi (Mini App bilan bitta domen)
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/admin/' : '/',
  plugins: [react()],
  server: {
    port: 5174,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      // mahsulot rasmlari backenddan keladi
      '/products': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
}));
