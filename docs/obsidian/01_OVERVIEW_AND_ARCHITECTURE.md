# Перекуп D6 — Полная техническая документация
## Файл 1 из 6: Обзор и Архитектура

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
│  React 19, Framer Motion, Zustand 5             │
│  Тонкий стор — диспетчер событий и UI-стейт.   │
├─────────────────────────────────────────────────┤
│  DOMAIN LAYER (packages/shared)                 │
│  businessLogic.ts — ядро расчётов (pure fn)     │
│  constants.ts — игровые константы               │
│  carDatabase.ts, defectDatabase.ts — контент    │
│  dtos/ — Zod схемы (единственный источник типов)│
├─────────────────────────────────────────────────┤
│  INFRASTRUCTURE LAYER (packages/server)         │
│  Authoritative Server (Express + Socket.IO)     │
│  Валидация транзакций, управление комнатами     │
└─────────────────────────────────────────────────┘
```

**Принцип shared-first:** все игровые формулы и константы живут в `packages/shared` и импортируются клиентом и сервером. Расчёты гарантированно идентичны на всех слоях.

---

## 4. Структура проекта (NPM Workspaces Monorepo)

```
TGPEREKUP/
├── packages/
│   ├── shared/                    # ОБЩИЙ ПАКЕТ
│   │   └── src/
│   │       ├── dtos/              # Zod схемы (Car, Player, Room)
│   │       ├── businessLogic.ts   # Чистые функции расчётов (Decimal.js)
│   │       ├── constants.ts       # Игровые константы (стоимости, лимиты)
│   │       ├── carDatabase.ts     # Модели авто
│   │       ├── defectDatabase.ts  # Список дефектов
│   │       ├── newsDatabase.ts    # События рынка
│   │       └── types.ts           # Системные типы и GAME_MAP
│   ├── client/                    # ФРОНТЕНД
│   │   └── src/
│   │       ├── components/
│   │       │   ├── game/          # ActionModal, RadialBoard, DiceArea, …
│   │       │   └── ui/            # Базовые компоненты
│   │       ├── store/
│   │       │   ├── gameStore.ts       # Тонкий ассемблер (~68 строк)
│   │       │   ├── store.types.ts     # GameStore interface
│   │       │   ├── socketListeners.ts # Socket.IO listeners
│   │       │   ├── storage.ts         # TMA-совместимый persist-адаптер
│   │       │   └── slices/
│   │       │       ├── playerSlice.ts      # Стейт + createPlayerSlice
│   │       │       ├── soloSlice.ts        # Стейт + createSoloSlice
│   │       │       └── multiplayerSlice.ts # Стейт + createMultiplayerSlice
│   │       └── lib/
│   │           ├── tmaProvider.ts  # Haptic feedback, TMA init
│   │           └── socket.ts       # Socket.IO client singleton
│   └── server/                    # БЭКЕНД
│       └── src/
│           ├── index.ts            # Express + Socket.IO + Bot
│           ├── roomManager.ts      # Авторитарная логика комнат
│           └── socketHandlers.ts   # Диспетчер сокет-событий
├── Dockerfile
├── railway.json
└── package.json                   # Workspaces config
```

---

## 5. Переменные окружения

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
2. Сервер вызывает нужный метод `roomManager` (например, `processBuyCar`).
3. При успехе сервер обновляет `RoomState` и рассылает `room_updated`.

---

## 7. Socket.IO — события

### Client → Server
| Событие | Payload | Описание |
|---|---|---|
| `create_room` | `{ player, winCondition }` | Создать игру |
| `join_room` | `{ roomId, player }` | Войти в игру |
| `dice_roll` | `{ roomId, playerId }` | Бросок кубика |
| `pass_turn` | `{ roomId, playerId }` | Передать ход |
| `sync_action` | `{ action, payload }` | Действие (buyCar, repair и т.д.) |

### Server → Client
| Событие | Payload | Описание |
|---|---|---|
| `room_updated` | `RoomState` | Обновленное состояние комнаты |
| `dice_roll_result` | `{ playerId, diceValue, newPosition }` | Результат броска |
| `sync_action_result` | `{ playerId, action, payload }` | Реле действия другого игрока |
| `room_error` | `string` | Ошибка валидации |

---

## 8. Безопасность

- **Валидация**: Каждое действие проверяется в `roomManager.ts` на предмет очередности хода, баланса и прав владения.
- **Zod**: Все входящие DTO проходят проверку схем.
- **Haptic**: Обратная связь через Telegram Haptic Feedback интегрирована в клиент.
- **Shared constants**: Игровые константы (стоимости, лимиты) импортируются с одного источника — дублирование и рассинхрон исключены.
