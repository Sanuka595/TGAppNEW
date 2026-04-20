# 02 — Архитектура: Data Models + Zustand Store

## Статус
`завершено` | Дата: 2026-04-20

---

## Структура shared/src/types.ts

| Категория | Экспорты |
|---|---|
| Union types | `SeverityLevel`, `CarTier`, `DefectCategory`, `CellType`, `LogType` |
| Константы | `HEALTH_PENALTIES`, `GAME_MAP` |
| Интерфейсы | `DefectType`, `DefectInstance`, `Car`, `Player`, `Debt`, `BoardCell`, `SoloQuest`, `GameNews`, `LogEntry`, `GameState`, `RoomState` |
| Socket.IO | `SyncActionPayload` (discriminated union), `ServerToClientEvents`, `ClientToServerEvents` |

### Ключевые типовые решения
- `SyncActionPayload` — дискриминированный union по полю `action`, обеспечивает строгую привязку payload к названию события
- `GameNews.effects.tierMultipliers` — `Partial<Record<CarTier, number>>` (не все тиры обязательны в событии)
- `exactOptionalPropertyTypes: true` — `hostId?: string` не допускает явного `undefined` в initial state (использован `Omit<MultiplayerState, 'hostId'>`)

---

## Структура store/

```
src/
├── lib/
│   └── socket.ts              # Синглтон socket.io-client
└── store/
    ├── storage.ts             # tmaStorage (localStorage fallback, без StateStorage из zustand)
    ├── gameStore.ts           # Сборка + persist + initSocketListeners()
    └── slices/
        ├── playerSlice.ts     # PlayerState + PlayerActions
        ├── soloSlice.ts       # SoloState + SoloActions
        └── multiplayerSlice.ts # MultiplayerState + MultiplayerActions
```

---

## Persist partialize

Сохраняется в `'perekup-storage'` через `tmaStorage`:
```
player, garage, roomId, players, activeDebts, isHost, currentTurnIndex, totalTurns
```

---

## Паттерны использования

```tsx
// ✅ Атомарные селекторы — минимальные ререндеры
const balance = useGameStore(s => s.player.balance);
const energy  = useGameStore(s => s.player.energy);

// ❌ Деструктуризация всего стора — ререндер на любое изменение
const { player, market } = useGameStore();
```

---

## Инициализация сокет-листенеров

```tsx
// App.tsx — единожды при монтировании
useEffect(() => { initSocketListeners(); }, []);
```
