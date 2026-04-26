import express, { type Request, type Response, type NextFunction } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import type { ClientToServerEvents, ServerToClientEvents } from '@tgperekup/shared';
import { registerSocketHandlers } from './socketHandlers.js';
import { cleanupStaleRooms, getActiveRoomsCount } from './roomManager.js';
import TelegramBot from 'node-telegram-bot-api';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const isProduction = process.env['NODE_ENV'] === 'production';

app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers['origin'];
  if (typeof origin === 'string') {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', activeRooms: getActiveRoomsCount() });
});

// In production, serve the client static build
const clientDistPath = path.resolve(__dirname, '../../../client/dist');
if (isProduction && fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
}

const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: true, methods: ['GET', 'POST'], credentials: true },
});

io.on('connection', (socket) => {
  registerSocketHandlers(io, socket);
});

// SPA fallback: serve index.html for all non-API, non-socket routes
if (isProduction && fs.existsSync(clientDistPath)) {
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

const PORT = parseInt(process.env['PORT'] ?? '3000', 10);
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT} (v7 - LIGHT THEME FIX)`);
});

// Remove rooms with no activity for > 30 min; runs every 10 min
setInterval(() => {
  const removed = cleanupStaleRooms();
  if (removed > 0) console.log(`[CLEANUP] Removed ${removed} stale room(s)`);
}, 10 * 60 * 1000);

// ─── Telegram Bot ───────────────────────────────────────────────────────────
const BOT_TOKEN = process.env['TELEGRAM_BOT_TOKEN'];

if (BOT_TOKEN) {
  const bot = new TelegramBot(BOT_TOKEN, { polling: true });
  
  // Get bot info to construct links
  let botUsername = 'perekup_d6_bot';
  bot.getMe().then((me) => {
    botUsername = me.username || botUsername;
    console.log(`Bot @${botUsername} is running`);
  });

  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    
    // Пытаемся взять URL из переменных окружения, иначе используем тот, что дал пользователь
    const webAppUrl = process.env['WEBAPP_URL'] || 'https://tgperekupserver-production-c250.up.railway.app/';

    bot.sendMessage(chatId, '🚗 **Добро пожаловать в Перекуп D6!**\n\nВыбери режим игры:', {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎯 Соло режим', web_app: { url: `${webAppUrl}?startapp=solo` } }],
          [{ text: '👥 Мультиплеер', web_app: { url: `${webAppUrl}?startapp=multi` } }],
          [{ text: '🧹 Сбросить прогресс', web_app: { url: `${webAppUrl}?startapp=reset` } }]
        ]
      }
    });
  });

  console.log('Telegram Bot initialized');
} else {
  console.warn('TELEGRAM_BOT_TOKEN not found, bot features disabled');
}
