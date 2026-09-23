import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** Backend ishlamasa terminalda sababi ko'rinsin (aks holda mijoz faqat xato ko'radi) */
function logProxyErrors(proxy) {
  proxy.on('error', (error, req) => {
    console.error(`⚠️  Mini App -> backend (${req.method} ${req.url}) ulanmadi: ${error.code || error.message}`);
  });
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    // ngrok / cloudflared kabi tunnel domenlariga ruxsat
    allowedHosts: true,
    // /api so'rovlarini backendga uzatadi (ngrok orqali ham ishlaydi)
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        configure: logProxyErrors,
      },
      // mahsulot rasmlari backenddan keladi
      '/products': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
