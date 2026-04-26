# Перекуп D6 — Полная техническая документация
## Файл 1 из 5: Обзор и Архитектура

> **Цель документа:** Исчерпывающее техническое задание для воссоздания игры «Перекуп D6» с нуля, включая все решения, механики и исправления критических проблем.

---

## 1. Концепция

**Перекуп D6** — настольная бизнес-стратегия в формате Telegram Mini App (TMA). Игрок выступает в роли перекупщика автомобилей: покуп| Слой | Технология | Версия |
|---|---|---|
| Frontend фреймворк | React | 19.x |
| Сборщик | Vite | последняя |
| Состояние | Zustand (slice pattern) | 5.x |
| Валидация / Типы | Zod | последняя |
| Финансовые расчёты | Decimal.js | 10.x |
| Анимации | Framer Motion | 12.x |
| Иконки | Lucide React | последняя |
| Стили | Vanilla CSS | — |
| Telegram SDK | @telegram-apps/sdk-react | 3.x |
| WebSocket | Socket.IO (client + server) | 4.x |
| Backend | Node.js + Express + Socket.IO | Node 20 |
| Telegram бот | Node-telegram-bot-api | последняя |
| TypeScript | strict mode | последняя |
| Деплой | Railway.app | — |

---

## 3. Архитектура: три слоя

```
┌─────────────────────────────────────────────────┐
│  UI LAYER (packages/client)                     │
│  React компоненты, Framer Motion, Zustand       │
│  Только отображение и вызов экшенов стора.      │
├─────────────────────────────────────────────────┤
│  DOMAIN LAYER (packages/shared)                 │
│  businessLogic.ts — все расчёты цен/налогов     │
│  carDatabase.ts, defectDatabase.ts — контент    │
│  dtos/ — Zod схемы (источник правды для типов)  │
├─────────────────────────────────────────────────┤
│  INFRASTRUCTURE LAYER (packages/server)         │
│  Express + Socket.IO сервер                     │
│  Управление комнатами, Bot API                  │
└─────────────────────────────────────────────────┘
```

---

## 4. Структура проекта (NPM Workspaces Monorepo)

```
TGPEREKUP/
├── packages/
│   ├── shared/               # ОБЩИЙ ПАКЕТ
│   │   ├── src/
│   │   │   ├── dtos/         # Zod схемы и типы (Car, Player, Room)
│   │   │   ├── businessLogic.ts # Ядро расчётов (Decimal.js)
│   │   │   ├── carDatabase.ts   # База 30+ автомобилей
│   │   │   ├── defectDatabase.ts # База 20+ дефектов
│   │   │   └── types.ts      # Системные типы и GAME_MAP
│   ├── client/               # ФРОНТЕНД
│   │   ├── src/
│   │   │   ├── components/   # React компоненты (Market, Garage, Board)
│   │   │   ├── store/        # Zustand (gameStore.ts)
│   │   │   ├── lib/          # TMA Provider, Socket instance
│   │   │   └── assets/       # CSS и статика
│   └── server/               # БЭКЕНД
│       ├── src/
│       │   ├── index.ts      # Запуск Express + Bot
│       │   ├── roomManager.ts # Логика комнат
│       │   └── socketHandlers.ts # Обработка событий сети
├── Dockerfile                # Сборка всех пакетов в один образ
├── railway.json              # Конфигурация деплоя
└── package.json              # Настройка workspaces
``` клеток
│   ├── store/
│   │   ├── gameStore.ts      # Сборка всех слайсов
│   │   ├── storage.ts        # TWAStorage (Telegram CloudStorage / localStorage)
│   │   └── slices/
│   │       ├── playerSlice.ts      # Баланс, гараж, энергия
│   │       ├── soloSlice.ts        # Бот, квесты, долг соло-режима
│   │       └── multiplayerSlice.ts # Комнаты, синхронизация
│   ├── api/
│   │   └── socket.ts         # Инстанс socket.io-client
│   ├── components/
│   │   ├── RadialBoard.tsx    # Радиальная карта (кольцо из 12 клеток)
│   │   ├── CentralAction.tsx  # Центр: кнопки броска D6 + тактических ходов
│   │   ├── ActionModal.tsx    # Модалка при попадании на клетку
│   │   ├── ContractsModal.tsx # Биржа долгов P2P
│   │   ├── CreateRoomModal.tsx
│   │   ├── WinModal.tsx
│   │   ├── GameLogs.tsx
│   │   ├── AnimatedCounter.tsx
│   │   ├── CellIcon.tsx       # React.memo — иконки клеток
│   │   ├── ErrorBoundary.tsx
│   │   └── DebugPanel.tsx     # ТОЛЬКО в DEV режиме!
│   ├── providers/
│   │   └── TMAProvider.tsx    # Инициализация Telegram SDK
│   ├── App.tsx
│   └── main.tsx
├── public/
│   ├── icons.svg
│   └── favicon.svg
├── bot.js                    # Telegraf бот (лаунчер)
├── Dockerfile                # Multi-stage: build SPA + serve
├── fly.toml                  # Конфигурация Fly.io
├── .env.example              # Шаблон переменных окружения
├── vite.config.ts
├── tsconfig.json             # strict: true
└── package.json
```

---

## 5. Переменные окружения

### `.env.example` (корень проекта)
```env
# Telegram Bot
BOT_TOKEN=123456789:ABCDEF...

# Server
PORT=3000
NODE_ENV=production

# CORS — через запятую, без пробелов
ALLOWED_ORIGINS=https://your-app.vercel.app,https://your-tma-domain.com

# Frontend (Vite)
VITE_SOCKET_URL=/
```

> **Важно:** `VITE_SOCKET_URL=/` означает, что фронт и бэк на одном домене (Vite proxy или production). При локальной разработке через ngrok — укажи `VITE_SOCKET_URL=https://ваш-ngrok-url.ngrok-free.app`.

---

## 6. Серверная архитектура (Authoritative Server)

### ПРИНЦИП: Сервер — единственный арбитр истины

```
Клиент                          Сервер
  │                               │
  │── REQUEST_BUY { carId } ──►  │  validateTurn()
  │                               │  checkBalance()
  │                               │  removeFromMarket()
  │◄── room_updated { state } ──  │  broadcastToRoom()
```

**Клиент НИКОГДА не меняет баланс напрямую** (цель Phase 3, но архитектура закладывается сразу).

### Текущая реализация (Phase 1/2):
- Сервер хранит `activeRooms` в памяти (Map)
- Сервер авторизует броски кубика (только активный игрок)
- Финансовая логика временно на клиенте, но готова к переносу

### Целевая реализация (Phase 3):
- Все транзакции (buyCar, sellCar, repairCar) проверяются на сервере
- Redis для персистентности комнат (TTL 24ч)
- Telegram Init Data verification (HMAC)

---

## 7. Socket.IO — события

### Client → Server
| Событие | Payload | Описание |
|---|---|---|
| `create_room` | `{ player, winCondition }` | Создать комнату |
| `join_room` | `{ roomId, player }` | Войти в комнату |
| `leave_room` | `roomId, playerId` | Покинуть комнату |
| `dice_roll` | `{ roomId, playerId }` | Запрос броска кубика |
| `pass_turn` | `{ roomId, playerId }` | Передать ход (вызывается сервером!) |
| `sync_action` | `{ roomId, playerId, action, payload }` | Синхронизировать действие |

### Server → Client
| Событие | Payload | Описание |
|---|---|---|
| `room_updated` | `RoomState` | Обновление состояния комнаты |
| `dice_roll_result` | `{ playerId, diceValue, newPosition }` | Результат броска |
| `sync_action_result` | `{ playerId, action, payload }` | Результат синхронизации |
| `room_error` | `string` | Ошибка |

### ВАЖНО: Race Condition Fix
`pass_turn` НЕ отправляется клиентом сразу после `dice_roll`. Сервер сам вызывает `passTurn()` внутри обработчика `dice_roll` после формирования результата:

```typescript
// server/socketHandlers.ts — ПРАВИЛЬНО
socket.on('dice_roll', ({ roomId, playerId }) => {
  if (!roomManager.validateTurn(roomId, playerId)) return;
  const diceValue = Math.floor(Math.random() * 6) + 1;
  // ... обновить позицию ...
  io.to(roomId).emit('dice_roll_result', { playerId, diceValue, newPosition });
  // Передаём ход ЗДЕСЬ, после рассылки результата
  const updatedRoom = roomManager.passTurn(roomId);
  if (updatedRoom) io.to(roomId).emit('room_updated', updatedRoom);
});
```

---

## 8. Безопасность — чеклист

| Проблема | Решение | Статус |
|---|---|---|
| CORS wildcard `*` | `process.env.ALLOWED_ORIGINS` | ✅ Phase 1 |
| DebugPanel в продакшне | `{import.meta.env.DEV && <DebugPanel />}` | ✅ Phase 1 |
| Dev-команды в sync_action | Фильтр на сервере | ✅ Phase 1 |
| Нет лимита игроков | `MAX_PLAYERS = 4` | ✅ Phase 1 |
| Race condition dice/turn | pass_turn на сервере | ✅ Phase 1 |
| strict: true TS | tsconfig.app.json | ✅ Phase 1 |
| Финансы на клиенте | Перенос на сервер | 🔄 Phase 3 |
| In-memory rooms | Redis TTL | 🔄 Phase 3 |
| Нет Telegram HMAC | initData verification | 🔄 Phase 3 |
| Нет rate limiting | socket.io middleware | 🔄 Phase 2 |

---

## 9. Dockerfile (Monorepo build)

```dockerfile
FROM node:20-slim AS base
WORKDIR /app
ENV NODE_ENV=production

# Install dependencies for all packages
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/server/package*.json ./packages/server/
COPY packages/client/package*.json ./packages/client/
RUN npm ci --include=dev

# Copy source and configs
COPY tsconfig.base.json ./
COPY packages/shared/ ./packages/shared/
COPY packages/server/ ./packages/server/
COPY packages/client/ ./packages/client/

# Build shared first
RUN npm run build -w @tgperekup/shared
# Build client (generates dist for static serving)
RUN npm run build -w @tgperekup/client
# Build server
RUN npm run build -w @tgperekup/server

EXPOSE 3000
CMD ["node", "packages/server/dist/src/index.js"]
```

---

## 10. Деплой на Railway.app

Проект настроен на автоматический деплой при пуше в `main`. Конфигурация в `railway.json`.
Необходимые переменные окружения: `BOT_TOKEN`, `PORT`.
