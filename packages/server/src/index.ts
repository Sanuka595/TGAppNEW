import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import type { GameState } from '@tgperekup/shared';

const PORT = process.env['PORT'] ?? 3001;

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: '*' },
});

app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

io.on('connection', (socket) => {
  console.log(`[socket] connected: ${socket.id}`);

  // TODO: emit initial GameState on reconnect (Phase 3)
  void (null as unknown as GameState);

  socket.on('disconnect', (reason) => {
    console.log(`[socket] disconnected: ${socket.id} — ${reason}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`[server] listening on :${PORT}`);
});
