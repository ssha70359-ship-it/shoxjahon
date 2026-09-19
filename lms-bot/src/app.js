import cors from 'cors';
import express from 'express';

import config, { clickEnabled, paymeEnabled } from './config/index.js';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js';
import routes from './routes/index.js';

/** Mini App qaysi domendan ochilishi mumkinligi */
function corsOptions() {
  const allowed = new Set([config.webAppUrl, ...config.corsOrigins].filter(Boolean));

  // Lokal ishlab chiqishda Vite'ning istalgan porti ochiq bo'lsin
  if (!config.isProduction || allowed.size === 0) return { origin: true };

  return {
    origin(origin, callback) {
      // Telegram WebView ba'zan Origin yubormaydi - bunday so'rovga ruxsat beramiz
      if (!origin || allowed.has(origin)) return callback(null, true);

      callback(new Error('CORS: bu domenga ruxsat yo‘q'));
    },
  };
}

export function createApp() {
  const app = express();

  // Render/Railway proksi ortida - rate limit haqiqiy IP ni ko'rishi uchun
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(cors(corsOptions()));
  app.use(express.json({ limit: '256kb' }));
  // Click webhook'lari form-urlencoded yuboradi
  app.use(express.urlencoded({ extended: false, limit: '256kb' }));

  app.get('/', (req, res) => {
    res.json({ ok: true, service: 'O‘quv markazi API', version: '1.0.0' });
  });

  app.get('/api/health', (req, res) => {
    res.json({
      ok: true,
      time: new Date().toISOString(),
      payments: { payme: paymeEnabled, click: clickEnabled },
    });
  });

  app.use('/api', routes);

  // 404 va xato ushlagichlari eng oxirida turishi shart
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
