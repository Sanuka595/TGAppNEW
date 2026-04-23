import express, { type Request, type Response, type NextFunction } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@tgperekup/shared';
import { registerSocketHandlers } from './socketHandlers.js';

const app = express();

const allowedOrigins: string[] = process.env['ALLOWED_ORIGINS']?.split(',') ?? [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers['origin'];
  if (typeof origin === 'string' && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).send('OK');
});

const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'] },
});

io.on('connection', (socket) => {
  registerSocketHandlers(io, socket);
});

const PORT = parseInt(process.env['PORT'] ?? '3000', 10);
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
