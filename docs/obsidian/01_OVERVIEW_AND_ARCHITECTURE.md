# Перекуп D6 — Полная техническая документация
## Файл 1 из 5: Обзор и Архитектура

> **Цель документа:** Исчерпывающее описание текущего состояния игры «Перекуп D6», её архитектуры и технического стека.

---

## 1. Концепция

**Перекуп D6** — настольная бизнес-стратегия в формате Telegram Mini App (TMA). Игрок выступает в роли перекупщика автомобилей: покупка на рынке, ремонт дефектов и перепродажа с прибылью. Игра поддерживает одиночный режим и мультиплеер в реальном времени.

## 2. Технологический стек

| Слой | Технология | Версия |
|---|---|---|
| Frontend фреймворк | React | 19.x |
| Сборщик | Vite | последняя |
| Состояние | Zustand 5.x | последняя |
| Валидация / Типы | Zod | последняя |
| Финансовые расчёты | Decimal.js | 10.x |
| Анимации | Framer Motion | 12.x |
| WebSocket | Socket.IO (client + server) | 4.x |
| Backend | Node.js + Express | Node 20 |
| TypeScript | strict mode | последняя |
| Деплой | Railway.app | — |

---

## 3. Архитектура: три слоя

```
┌─────────────────────────────────────────────────┐
│  UI LAYER (packages/client)                     │
│  React 19, Framer Motion, Zustand 5, UI Store   │
│  Отображение состояния и отправка событий.      │
├─────────────────────────────────────────────────┤
│  DOMAIN LAYER (packages/shared)                 │
│  businessLogic.ts — ядро расчётов (Authoritative)│
│  carDatabase.ts, defectDatabase.ts — контент    │
│  dtos/ — Zod схемы (единственный источник типов)│
├─────────────────────────────────────────────────┤
│  INFRASTRUCTURE LAYER (packages/server)         │
│  Authoritative Server (Express + Socket.IO)     │
│  Валидация транзакций, управление комнатами     │
└─────────────────────────────────────────────────┘
```

---

## 4. Структура проекта (NPM Workspaces Monorepo)

```
TGPEREKUP/
├── packages/
│   ├── shared/               # ОБЩИЙ ПАКЕТ
│   │   ├── src/
│   │   │   ├── dtos/         # Zod схемы (Car, Player, Room)
│   │   │   ├── businessLogic.ts # Логика (Decimal.js)
│   │   │   ├── carDatabase.ts   # Модели авто
│   │   │   ├── defectDatabase.ts # Список дефектов
│   │   │   ├── newsDatabase.ts  # События рынка
│   │   │   └── types.ts      # Системные типы и GAME_MAP
│   ├── client/               # ФРОНТЕНД
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── game/     # ActionModal, RadialBoard, DiceArea
│   │   │   │   ├── ui/       # Базовые компоненты
│   │   │   │   ├── MainLayout.tsx
│   │   │   │   └── TopBar.tsx
│   │   │   ├── store/        # gameStore.ts, uiStore.ts
│   │   │   ├── lib/          # tmaProvider.ts, socket.ts
│   │   │   └── assets/       # CSS и статика
│   └── server/               # БЭКЕНД
│       ├── src/
│       │   ├── index.ts      # Express Server
│       │   ├── roomManager.ts # Логика комнат (Transactions)
│       │   └── socketHandlers.ts # Socket events
├── Dockerfile                # Docker build
├── railway.json              # Railway deploy
└── package.json              # Workspaces config
```

---

## 5. Переменные окружения

### `.env.example`
```env
# Telegram Bot
BOT_TOKEN=...
# Server
PORT=3000
NODE_ENV=production
# CORS
ALLOWED_ORIGINS=https://...
# Frontend
VITE_SOCKET_URL=/
```

---

## 6. Серверная архитектура (Authoritative Server)

Сервер является единственным источником истины. Все важные изменения состояния (деньги, гараж, позиция) происходят на сервере после валидации.

**Процесс действия:**
1. Клиент отправляет запрос через `sync_action`.
2. Сервер вызывает `roomManager.processAction()`.
3. При успехе сервер обновляет `RoomState` и рассылает `room_updated`.

---

## 7. Socket.IO — события

### Client → Server
| Событие | Payload | Описание |
|---|---|---|
| `create_room` | `{ player, winCondition }` | Создать игру |
| `join_room` | `{ roomId, player }` | Войти в игру |
| `dice_roll` | `{ roomId, playerId }` | Бросок кубика |
| `sync_action` | `{ action, payload }` | Действие (buyCar, repair и т.д.) |

### Server → Client
| Событие | Payload | Описание |
|---|---|---|
| `room_updated` | `RoomState` | Обновленное состояние комнаты |
| `dice_roll_result` | `{ playerId, diceValue, newPosition }` | Результат броска |
| `sync_action_result`| `{ playerId, action, payload }` | Реле действия |
| `room_error` | `string` | Ошибка валидации |

---

## 8. Безопасность

- **Валидация**: Каждое действие проверяется в `roomManager.ts` на предмет очередности хода, баланса и прав владения.
- **Zod**: Все входящие DTO проходят проверку схем.
- **Haptic**: Обратная связь через Telegram Haptic Feedback интегрирована в клиент.
