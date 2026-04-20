# 01 — Архитектура: Инициализация монорепозитория

## Статус
`завершено` | Дата: 2026-04-20

---

## Структура монорепозитория

```
TGPEREKUP/
├── package.json            # корневой манифест, npm workspaces
├── tsconfig.base.json      # базовый strict TS-конфиг
├── eslint.config.js        # flat config, typescript-eslint strict
├── Dockerfile              # multi-stage: base → server / client
├── docker-compose.yml      # dev-окружение (hot-reload)
│
├── packages/
│   ├── shared/             # @tgperekup/shared — общие типы/DTO
│   │   └── src/
│   │       ├── types.ts    # GameState и будущие интерфейсы
│   │       └── index.ts    # публичный реэкспорт
│   │
│   ├── client/             # @tgperekup/client — React + Vite
│   │   └── src/
│   │       ├── main.tsx
│   │       └── App.tsx
│   │
│   └── server/             # @tgperekup/server — Express + Socket.IO
│       └── src/
│           └── index.ts
│
└── docs/obsidian/          # база знаний (этот файл)
```

---

## npm Workspaces — правила работы

| Задача | Команда |
|---|---|
| Установить зависимости всего монорепо | `npm install` (в корне) |
| Добавить dep в конкретный пакет | `npm install <pkg> -w @tgperekup/<name>` |
| Запустить скрипт во всех пакетах | `npm run <script> --workspaces --if-present` |
| Запустить скрипт в одном пакете | `npm run <script> -w @tgperekup/<name>` |
| Сборка (порядок важен: shared → server/client) | `npm run build` (из корня) |

> **Важно:** `shared` всегда должен собираться первым, так как `client` и `server` зависят от его `dist/`.

---

## TypeScript — иерархия конфигов

```
tsconfig.base.json          # strict: true, composite: true, no any
  ├── packages/shared/tsconfig.json   (module: ESNext, moduleResolution: bundler)
  ├── packages/client/tsconfig.json   (+ DOM lib, jsx: react-jsx, noEmit: true)
  └── packages/server/tsconfig.json   (module: NodeNext, moduleResolution: NodeNext)
```

---

## Межпакетная коммуникация

- `client` ↔ `server`: **только** через типы из `@tgperekup/shared`
- Прямой импорт между `client` и `server` — запрещён
- Все Socket.IO события и REST payload-ы должны быть типизированы через `shared`

---

## Порты (dev)

| Сервис | Порт |
|---|---|
| server (Express + Socket.IO) | `3001` |
| client (Vite dev server) | `5173` |

---

## Следующий шаг

`02_GAME_STATE_MACHINE.md` — проектирование стейт-машины игры "Перекуп D6"
