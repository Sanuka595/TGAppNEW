# Перекуп D6 — Полная техническая документация
## Файл 1 из 5: Обзор и Архитектура

> **Цель документа:** Исчерпывающее техническое задание для воссоздания игры «Перекуп D6» с нуля, включая все решения, механики и исправления критических проблем.

---

## 1. Концепция

**Перекуп D6** — настольная бизнес-стратегия в формате Telegram Mini App (TMA). Игрок выступает в роли перекупщика автомобилей: покупает битые и дешёвые машины, чинит их, перепродаёт с прибылью.

- **Режимы:** одиночный (vs бот «Боря») и мультиплеер до 4 человек
- **Цель:** накопить `$500,000` (настраивается: `$500k` / `$1,000,000`)
- **Движок хода:** кубик D6 + система тактической энергии

---

## 2. Стек технологий

| Слой | Технология | Версия |
|---|---|---|
| Frontend фреймворк | React | 19.x |
| Сборщик | Vite | последняя |
| Состояние | Zustand (slice pattern) | 5.x |
| Финансовые расчёты | Decimal.js | 10.x |
| Анимации | Framer Motion | 12.x |
| Иконки | Lucide React | последняя |
| Стили | Tailwind CSS v4 | 4.x |
| Telegram SDK | @telegram-apps/sdk-react | 3.x |
| WebSocket | Socket.IO (client + server) | 4.x |
| Backend | Node.js + Express + Socket.IO | Node 20 |
| Telegram бот | Telegraf | 4.x |
| TypeScript | strict mode | 6.x |
| Деплой | Fly.io (или Railway.app) | — |
| Контейнер (dev) | Docker / Distrobox Arch | — |

---

## 3. Архитектура: три слоя

```
┌─────────────────────────────────────────────────┐
│  UI LAYER (React Components)                    │
│  Только отображение. Никакой бизнес-логики.     │
│  Отправляет действия → получает стейт           │
├─────────────────────────────────────────────────┤
│  DOMAIN LAYER (чистый TypeScript)               │
│  businessLogic.ts — все расчёты цен/налогов     │
│  carDatabase.ts, defectDatabase.ts — контент    │
│  Независим от React и Telegram                  │
├─────────────────────────────────────────────────┤
│  INFRASTRUCTURE LAYER                           │
│  Zustand Store (slices)                         │
│  Socket.IO клиент                               │
│  TMA SDK / CloudStorage                         │
└─────────────────────────────────────────────────┘
```

---

## 4. Структура проекта (монорепо)

```
perekup-v2/
├── server/
│   ├── index.ts              # Express + Socket.IO сервер (порт 3000)
│   ├── roomManager.ts        # Управление комнатами в памяти
│   └── socketHandlers.ts     # Обработчики сокет-событий
├── src/
│   ├── shared/
│   │   └── types.ts          # ЕДИНСТВЕННЫЙ источник правды (типы + GAME_MAP)
│   ├── domain/
│   │   ├── businessLogic.ts  # Все финансовые функции (Decimal.js)
│   │   ├── carDatabase.ts    # База 30+ автомобилей
│   │   ├── defectDatabase.ts # База 20+ дефектов
│   │   └── iconMapping.ts    # Маппинг иконок клеток
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

## 9. Dockerfile (multi-stage)

```dockerfile
# Stage 1: Build frontend
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production server
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY server ./server
COPY src/shared ./src/shared
EXPOSE 3000
CMD ["npm", "start"]
```

Сервер Express раздаёт SPA из `dist/` + обрабатывает Socket.IO.

---

## 10. Деплой на Fly.io

```toml
# fly.toml
app = "perekup-d6"
primary_region = "fra"

[build]
  dockerfile = "Dockerfile"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 1
```

```bash
# Первый деплой
fly launch
fly secrets set BOT_TOKEN=xxx ALLOWED_ORIGINS=https://your-domain.com
fly deploy
```
