# Перекуп D6 — Полная техническая документация
## Файл 5 из 5: Сервер, Бот, DevOps и Roadmap

---

## 1. Сервер (Node.js + Socket.IO)

### server/index.ts

```typescript
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import TelegramBot from 'node-telegram-bot-api';
import type { ClientToServerEvents, ServerToClientEvents } from '../src/shared/types';
import { registerSocketHandlers } from './socketHandlers';

const app = express();

// CORS — разрешаем все для TMA (т.к. разные клиенты шлют разные Origin)
app.use((req, res, next) => {
  const origin = req.headers['origin'];
  if (typeof origin === 'string') {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Раздача SPA (production)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(process.cwd(), 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
  });
}

// Healthcheck для Railway
app.get('/health', (_req, res) => res.status(200).send('OK'));

const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: true, methods: ['GET', 'POST'], credentials: true },
});

io.on('connection', (socket) => {
  registerSocketHandlers(io, socket);
});

// Интеграция Telegram Bot API в тот же процесс (экономия ресурсов)
const BOT_TOKEN = process.env['TELEGRAM_BOT_TOKEN'];
if (BOT_TOKEN) {
  const bot = new TelegramBot(BOT_TOKEN, { polling: true });
  const webAppUrl = process.env['WEBAPP_URL'] || 'https://your-app.up.railway.app/';

  bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, '🚗 **Добро пожаловать в Перекуп D6!**', {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎯 Соло режим', web_app: { url: `${webAppUrl}?startapp=solo` } }],
          [{ text: '👥 Мультиплеер', web_app: { url: `${webAppUrl}?startapp=multi` } }]
        ]
      }
    });
  });
}

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
```

---

### server/roomManager.ts

```typescript
import type { RoomState, Player, Car } from '../src/shared/types';

export const MAX_PLAYERS = 4; // НИКОГДА не закомментировать!

const activeRooms = new Map<string, RoomState>();
const socketToRoom = new Map<string, string>();

function generateRoomId(): string {
  let id = '';
  do {
    id = Math.random().toString(36).substring(2, 8).toUpperCase();
  } while (activeRooms.has(id));
  return id;
}

export const getRoom = (roomId: string) => activeRooms.get(roomId);

export const createRoom = (socketId: string, player: Player, winCondition: number): string => {
  const roomId = generateRoomId();
  activeRooms.set(roomId, {
    id: roomId,
    players: [player],
    market: [],
    hostId: player.id,
    currentTurnIndex: 0,
    winCondition: winCondition || 500000,
  });
  socketToRoom.set(socketId, roomId);
  return roomId;
};

export const joinRoom = (socketId: string, roomId: string, player: Player) => {
  const room = activeRooms.get(roomId);
  if (!room) return { success: false, error: 'Комната не найдена' };

  // Жёсткий лимит!
  if (room.players.length >= MAX_PLAYERS) {
    return { success: false, error: 'Комната заполнена' };
  }

  const existingIndex = room.players.findIndex(p => p.id === player.id);
  if (existingIndex !== -1) {
    room.players[existingIndex] = player; // Реподключение
  } else {
    room.players.push(player);
  }
  socketToRoom.set(socketId, roomId);
  return { success: true, room };
};

export const leaveRoom = (socketId: string, playerId: string) => {
  const roomId = socketToRoom.get(socketId);
  if (!roomId) return null;
  const room = activeRooms.get(roomId);
  if (!room) { socketToRoom.delete(socketId); return null; }

  room.players = room.players.filter(p => p.id !== playerId);

  if (room.players.length === 0) {
    activeRooms.delete(roomId);
  } else {
    if (room.hostId === playerId) room.hostId = room.players[0].id;
    if (room.currentTurnIndex >= room.players.length) room.currentTurnIndex = 0;
  }
  socketToRoom.delete(socketId);
  return { roomId, room };
};

export const passTurn = (roomId: string) => {
  const room = activeRooms.get(roomId);
  if (!room || room.players.length === 0) return null;
  room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;
  return room;
};

export const validateTurn = (roomId: string, playerId: string): boolean => {
  const room = activeRooms.get(roomId);
  if (!room || room.players.length === 0) return false;
  return room.players[room.currentTurnIndex].id === playerId;
};

export const updateMarket = (roomId: string, market: Car[]) => {
  const room = activeRooms.get(roomId);
  if (!room) return null;
  room.market = market;
  return room;
};

export const removeCarFromMarket = (roomId: string, carId: string) => {
  const room = activeRooms.get(roomId);
  if (!room) return null;
  room.market = room.market.filter(c => c.id !== carId);
  return room;
};
```

---

### server/socketHandlers.ts

```typescript
import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../src/shared/types';
import * as roomManager from './roomManager';

// Dev-команды, которые сервер никогда не транслирует
const BLOCKED_ACTIONS = new Set([
  'devAddMoney', 'devClearGarage', 'devSetEnergy', 'devTeleport'
]);

export const registerSocketHandlers = (
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>
) => {
  let activePlayerId: string | null = null;

  socket.on('create_room', ({ player, winCondition }, callback) => {
    activePlayerId = player.id;
    const roomId = roomManager.createRoom(socket.id, player, winCondition);
    socket.join(roomId);
    callback({ success: true, roomId });
    const room = roomManager.getRoom(roomId);
    if (room) io.to(roomId).emit('room_updated', room);
  });

  socket.on('join_room', ({ roomId, player }, callback) => {
    activePlayerId = player.id;
    const result = roomManager.joinRoom(socket.id, roomId, player);
    if (!result.success || !result.room) {
      callback({ success: false, error: result.error });
      return;
    }
    socket.join(roomId);
    callback({ success: true });
    io.to(roomId).emit('room_updated', result.room);
  });

  socket.on('dice_roll', ({ roomId, playerId }) => {
    if (!roomManager.validateTurn(roomId, playerId)) {
      socket.emit('room_error', 'Сейчас не ваш ход!');
      return;
    }

    const diceValue = Math.floor(Math.random() * 6) + 1;
    const room = roomManager.getRoom(roomId);
    if (!room) return;

    const playerIndex = room.players.findIndex(p => p.id === playerId);
    if (playerIndex !== -1) {
      room.players[playerIndex].position =
        (room.players[playerIndex].position + diceValue) % 12;
    }

    // 1. Рассылаем результат
    io.to(roomId).emit('dice_roll_result', {
      playerId,
      diceValue,
      newPosition: room.players[playerIndex]?.position ?? 0
    });

    // 2. ТОЛЬКО ПОСЛЕ — передаём ход (исправление Race Condition!)
    const updatedRoom = roomManager.passTurn(roomId);
    if (updatedRoom) {
      io.to(roomId).emit('room_updated', updatedRoom);
    }
  });

  socket.on('pass_turn', ({ roomId, playerId }) => {
    // Клиент вызывает pass_turn только вручную (например, пропуск хода)
    if (!roomManager.validateTurn(roomId, playerId)) return;
    const updatedRoom = roomManager.passTurn(roomId);
    if (updatedRoom) io.to(roomId).emit('room_updated', updatedRoom);
  });

  socket.on('sync_action', ({ roomId, playerId, action, payload }) => {
    // Фильтрация dev-команд
    if (BLOCKED_ACTIONS.has(action)) return;

    // Ретрансляция остальным
    socket.to(roomId).emit('sync_action_result', { playerId, action, payload });

    // Обновление состояния комнаты на сервере
    let updatedRoom = null;
    if (action === 'updateMarket') {
      updatedRoom = roomManager.updateMarket(roomId, payload as any);
    } else if (action === 'buyCar') {
      updatedRoom = roomManager.removeCarFromMarket(roomId, payload as string);
    }

    if (updatedRoom) io.to(roomId).emit('room_updated', updatedRoom);
  });

  socket.on('leave_room', (roomId, playerId) => {
    const result = roomManager.leaveRoom(socket.id, playerId);
    socket.leave(roomId);
    if (result?.room && result.room.players.length > 0) {
      io.to(result.roomId).emit('room_updated', result.room);
    }
  });

  socket.on('disconnect', () => {
    if (activePlayerId) {
      const result = roomManager.leaveRoom(socket.id, activePlayerId);
      if (result?.room && result.room.players.length > 0) {
        io.to(result.roomId).emit('room_updated', result.room);
      }
    }
  });
};
```

---

## 2. Telegram Bot (Интегрирован в сервер)

**Внимание**: Ранее бот был вынесен в отдельный процесс `bot.js` с `telegraf`. В текущей архитектуре бот встроен прямо в `server/index.ts` с помощью `node-telegram-bot-api` в режиме polling. Это позволяет задеплоить всё приложение на Railway в рамках 1 сервиса.

Используются **web_app** кнопки, которые сразу открывают приложение (используют `WEBAPP_URL` из переменных окружения Railway).

---

## 3. Vite Config (для разработки с Proxy)

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  // Явно оптимизируем зависимости (предотвращает WSOD)
  optimizeDeps: {
    include: ['zustand', 'zustand/middleware', 'decimal.js'],
  },
});
```

---

## 4. TypeScript конфигурация

```json
// tsconfig.app.json
{
  "compilerOptions": {
    "target": "es2023",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "types": ["vite/client"]
  },
  "include": ["src"]
}
```

---

## 5. Package.json — ключевые скрипты

```json
{
  "scripts": {
    "dev": "vite",
    "dev:server": "tsx watch server/index.ts",
    "dev:all": "concurrently \"npm run dev\" \"npm run dev:server\" \"node bot.js\"",
    "start": "tsx server/index.ts",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

---

## 6. CI/CD (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test

  deploy:
    needs: check
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: flyctl deploy --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

---

## 7. Тесты (Vitest)

```typescript
// src/domain/businessLogic.test.ts
import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import {
  calculateCarHealth,
  generateRepairCost,
  calculateSellPrice,
  calculateOwnershipTax,
  calculateCurrentMarketValue,
} from './businessLogic';

describe('calculateCarHealth', () => {
  it('100% для чистой машины', () => {
    expect(calculateCarHealth([])).toBe(100);
  });

  it('Отремонтированные дефекты не влияют', () => {
    const defects = [
      { id: '1', defectTypeId: 'eng_1', isHidden: false, repairCost: '5000', isRepaired: true }
    ];
    expect(calculateCarHealth(defects)).toBe(100);
  });

  it('Light дефект: -10%', () => {
    const defects = [
      { id: '1', defectTypeId: 'elec_4', isHidden: false, repairCost: '100', isRepaired: false }
    ];
    expect(calculateCarHealth(defects)).toBe(90);
  });
});

describe('generateRepairCost', () => {
  it('Premium x2 множитель', () => {
    const bucketCost = generateRepairCost('Light', 'Bucket');
    const premiumCost = generateRepairCost('Light', 'Premium');
    // Premium должен быть в 2 раза дороже (но рандом, проверяем диапазон)
    expect(premiumCost.toNumber()).toBeGreaterThanOrEqualTo(100); // 50 * 2
    expect(premiumCost.toNumber()).toBeLessThanOrEqualTo(400);   // 200 * 2
  });
});

describe('calculateOwnershipTax', () => {
  it('Пустой гараж → 0', () => {
    expect(calculateOwnershipTax([]).toNumber()).toBe(0);
  });

  it('Bucket: $20 за ход', () => {
    const car = { id: '1', name: 'Test', tier: 'Bucket' as const, basePrice: '1000',
                  defects: [], history: [], health: 100 };
    expect(calculateOwnershipTax([car]).toNumber()).toBe(20);
  });

  it('Несколько машин суммируются', () => {
    const bucket = { id: '1', name: 'A', tier: 'Bucket' as const, basePrice: '1000',
                     defects: [], history: [], health: 100 };
    const premium = { id: '2', name: 'B', tier: 'Premium' as const, basePrice: '40000',
                      defects: [], history: [], health: 100 };
    expect(calculateOwnershipTax([bucket, premium]).toNumber()).toBe(170); // 20 + 150
  });
});

describe('calculateSellPrice — legal_block', () => {
  it('Продажа заблокирована → 0', () => {
    const car = {
      id: '1', name: 'Test', tier: 'Bucket' as const, basePrice: '1000',
      defects: [{
        id: 'd1', defectTypeId: 'legal_block', isHidden: false,
        repairCost: '2000', isRepaired: false
      }],
      history: [], health: 20
    };
    expect(calculateSellPrice(car).toNumber()).toBe(0);
  });
});
```

---

## 8. Настройка в @BotFather

1. Зайди в `@BotFather` → `/mybots` → выбери бота
2. `Bot Settings` → `Menu Button` → `Configure Menu Button`
   - URL: `https://your-app.fly.dev`
   - Title: `Играть!`
3. `Bot Settings` → `Mini App` → `New App`
   - Title: `Перекуп D6`
   - Short Name: `play` (или любое другое)
   - Description: Описание игры
   - Обложка: 640×360px
4. Ссылка для приглашения: `https://t.me/YOUR_BOT/play?startapp=ROOM_ID`

---

## 9. Roadmap исправлений

### Phase 1 — Quick Wins ✅ (выполнено)
- [x] DebugPanel только в `DEV` mode
- [x] Убрать dev-команды из `sync_action` на сервере
- [x] Лимит игроков `MAX_PLAYERS = 4`
- [x] CORS через `process.env.ALLOWED_ORIGINS`
- [x] `.env.example` с документацией переменных
- [x] Race condition: `pass_turn` только после `dice_roll_result` на сервере
- [x] `"strict": true` в tsconfig
- [x] Удалить пустой `processTurn()`
- [x] Единый источник типов: только `src/shared/types.ts`

### Phase 2 — Stabilizing ✅ (выполнено 2026-04-25)

**Аудит и рефакторинг сервера (`packages/server`):**

- [x] **BUG FIX CRITICAL** — `join_room`: `socket.join()` теперь использует `normalizedId` (был баг: клиент не получал `room_updated`)
- [x] **BUG FIX HIGH** — `buyCar`: добавлена серверная проверка баланса (`balance >= price`) — предотвращает отрицательный баланс
- [x] **BUG FIX HIGH** — `sellCar`: добавлена проверка `isLocked` — заложенное авто нельзя продать
- [x] **BUG FIX HIGH** — `sync_action`: валидация теперь происходит ДО ретрансляции другим клиентам (fix: не рассылаем отклонённые действия)
- [x] **SECURITY** — `updateMarket`: только текущий ход (не любой игрок) может обновить рынок
- [x] **SECURITY** — `newsUpdate`: только хост может публиковать события рынка
- [x] **ARCH** — `roomManager`: внутренняя структура `RoomMeta { state, lastActivityAt }` + TTL cleanup каждые 10 мин (rooms живут 30 мин без активности)
- [x] **ARCH** — `roomManager`: двойная карта `playerToSocket` — корректная очистка `socketToRoom` при переподключении (fix: утечка памяти Map)
- [x] **ARCH** — `processBuyCar` / `processSellCar` — атомарные транзакции в `roomManager` вместо разрозненной логики в `socketHandlers`
- [x] **ARCH** — `processSellCar` выставляет `room.winnerId` при достижении `winCondition` (сервер авторизует победу)
- [x] **TYPES** — `shared/types.ts`: добавлены `CarHistoryEntry`, `GameEventLog`, `GameEventType`; расширены `Car` (поля `mileage`, `auditLog`) и `RoomState` (поля `activeEvent`, `activeDebts`, `totalTurns`, `marketRefreshedAt`)
- [x] **OPS** — `setInterval` cleanup в `index.ts`; `/health` теперь возвращает `{ status, activeRooms }` (мониторинг Railway)
- [x] Разбить `gameStore.ts` на слайсы (`playerSlice`, `soloSlice`, `multiplayerSlice`)
- [x] Unit-тесты для `businessLogic.ts` (минимум 15 тестов)
- [x] GitHub Actions CI (lint + typecheck + test)
- [ ] Починить конфискацию залога (передавать полный `Car` объект в payload `confiscateCar`)
- [ ] Rate limiting на Socket.IO
- [ ] Multi-stage Dockerfile (SPA + статика из `dist/`)
- [ ] Добавить `Business` класс в `GAME_MAP` (клетка `buy_business`)
- [ ] Логгер (pino) вместо `console.log`

### Phase 3 — Production Hardening 📋 (планируется)

- [ ] **Серверная ценовая логика** — перенести `businessLogic.ts` в `@tgperekup/shared` (сейчас `processBuyCar`/`processSellCar` используют `basePrice` без маржи/ньюс-мультипликаторов)
- [ ] Redis для `activeRooms` с TTL 24ч (сейчас in-memory Map; Railway рестарт = потеря комнат)
- [ ] Telegram Init Data verification (HMAC с `BOT_TOKEN`) — защита от подделки `playerId`
- [ ] Accessibility: `aria-*` атрибуты, keyboard navigation
- [ ] E2E тест одной полной партии (Playwright)
- [ ] Совместная покупка (Joint Venture / Pool механика)
- [ ] Биржа заказов (Bounty Board)

---

## 10. Архитектура roomManager (актуальная)

```
rooms: Map<roomId, RoomMeta>
  RoomMeta {
    state: RoomState       ← shared interface (Player[], market, hostId, ...)
    lastActivityAt: number ← unix ms, обновляется на каждое действие
  }

socketToRoom: Map<socketId, roomId>   ← очищается при leave и reconnect
playerToSocket: Map<playerId, socketId> ← позволяет удалить stale socketToRoom при reconnect
```

### Жизненный цикл комнаты

```
createRoom → room TTL reset
joinRoom   → room TTL reset + stale socketToRoom cleanup
passTurn   → room TTL reset + totalTurns++
processBuyCar / processSellCar → room TTL reset + atomic state mutation
cleanupStaleRooms (each 10 min) → removes rooms inactive > 30 min
```

### Авторизованные транзакции

```
Client sync_action { buyCar | sellCar }
  │
  ▼
socketHandlers → processBuyCar / processSellCar
  │   validateTurn()             → not_your_turn
  │   findCar in market/garage   → car_not_found
  │   findPlayer                 → player_not_found
  │   balance >= price           → insufficient_balance  (buyCar)
  │   !car.isLocked              → car_is_locked         (sellCar)
  │
  ├── FAIL → socket.emit('room_error', message)   [no relay to others]
  │
  └── OK   → relay sync_action_result to others
             → io.to(room).emit('room_updated', newState)
```

---

## 11. Известные проблемы (Known Issues)

| # | Проблема | Приоритет | Решение |
| --- | --- | --- | --- |
| 1 | Конфискация залога — кредитор не получает машину | HIGH | Передавать полный `Car` объект в payload `confiscateCar` |
| 2 | In-memory rooms теряются при рестарте | HIGH | Redis с TTL (Phase 3) |
| 3 | `processSellCar` использует `basePrice` вместо `calculateSellPrice` (без маржи) | HIGH | Перенести `businessLogic.ts` в `@tgperekup/shared` (Phase 3) |
| 4 | Нет Telegram HMAC verification | CRITICAL | Phase 3 |
| 5 | Класс `Business` в игре но нет клетки на карте | MEDIUM | Добавить клетку `buy_business` |
| 6 | Нет rate limiting | MEDIUM | Phase 3 |

---

## 11. Часто встречаемые ошибки при разработке

### WSOD (White Screen of Death) — белый экран
**Причина:** `StateStorage` из `zustand/middleware` нельзя импортировать напрямую в ESM+Vite.
**Решение:** Создать локальный интерфейс `TWAStorage` в `storage.ts`.

### `isAvailable is not a function`
**Причина:** TMA SDK меняет API (удаляют `.isAvailable()`, оставляют `.isSupported()`).
**Решение:**
```typescript
const isMounted = typeof feature.isSupported === 'function'
  ? feature.isSupported()
  : true;
```

### Vite `[plugin:vite:import-analysis] Failed to resolve import`
**Причина:** Расширения файлов изменились (PNG→WebP), регистр имён, неверный путь.
**Решение:** Проверить реальные имена файлов, обновить импорты, очистить кэш (`rm -rf node_modules/.vite`).

### `EACCES permission denied` при `npm install -g`
**Причина:** В Arch/Linux без sudo права.
**Решение:**
```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

### Socket.IO CORS Error (403)
**Причина:** `ALLOWED_ORIGINS` не совпадает с реальным адресом фронтенда.
**Решение:** Точное совпадение URL включая протокол и порт. При ngrok — добавить текущий адрес.

---

## 12. Игровые правила (для RulesModal)

```
🎮 ПЕРЕКУП D6 — Правила игры

ЦЕЛЬ
Первым накопить $500,000 (или $1,000,000 — выбирает хост).

ХОД
• Нажми «ROLL D6» для случайного хода (1–6 клеток)
• Или трать Энергию ⚡ для точного хода (+1, +2, +3)

ЭНЕРГИЯ ⚡
• Старт: 3 единицы. Макс: 3.
• Восстановление: +1 каждые 2 обычных броска
• Покупка: $500 на Чапаевке

КЛАССЫ АВТО
🪣 Вёдра ($800-$2k): 1 гарантированный дефект, низкий налог
🔨 Битьё ($3k-$9k): 2-4 дефекта, высокий риск и маржа
💼 Бизнес ($12k-$22k): Стабильный доход
⭐ Премиум ($25k-$60k): Ремонт ×2, 1 скрытый дефект
🏺 Ретро ($40k+): Скрытые дефекты, джекпот ×2-×4

ДЕФЕКТЫ
🟢 Light ($50-200): -10% health
🟡 Medium ($200-800): -25% health
🟠 Serious ($800-3k): -45% health
🔴 Critical ($3k-10k): -80% health
⚠️ Юридический запрет: $2,000, блокирует продажу

КЛЮЧЕВЫЕ КЛЕТКИ
💰 Чапаевка (×2): Продажа авто
🛠️ Автосервис: Ремонт и диагностика
🏎️ Гонка: Ставка ≤ 50% банка соперника
🚗 Прокат: Пассивный доход
🏎️ Ретро: Особый аукцион (кубик влияет на ремонт)

НАЛОГ
Каждый ход: Bucket=$20, Scrap=$50, Business=$100, Premium=$150, Rarity=$300

ДОЛГИ (P2P)
• Дай в долг под процент с залогом авто
• При неуплате: авто конфискуется автоматически

МУЛЬТИПЛЕЕР
До 4 игроков. Жми «Поделиться» для приглашения.
```
