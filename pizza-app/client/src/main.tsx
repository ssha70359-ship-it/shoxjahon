import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import { initTelegram } from './lib/telegram';
import './styles/app.css';

initTelegram();

const root = document.getElementById('root');
if (!root) throw new Error('#root topilmadi');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
