import config from './config.js';
import { createServer } from './app.js';

const { app, close } = await createServer({ config });

const server = app.listen(config.port, () => {
  console.log(`🍕 Olov Pizza: http://localhost:${config.port}`);
  if (config.allowDevUser) console.log('🧪 ALLOW_DEV_USER=true — brauzerda Telegramsiz sinash mumkin');
  if (config.publicUrl) console.log(`🌍 Mini App: ${config.publicUrl}`);
});

let stopping = false;
async function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  console.log(`\n${signal} — toʻxtatilmoqda...`);
  server.close();
  await close();
  process.exit(0);
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
