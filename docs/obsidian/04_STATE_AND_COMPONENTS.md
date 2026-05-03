# Перекуп D6 — Полная техническая документация
## Файл 4 из 6: Стейт-менеджмент и Компоненты

---

## 1. Zustand Store — архитектура слайсов

В проекте используется **Zustand 5** с паттерном `StateCreator` для разбивки стора на доменные слайсы. Каждый слайс содержит **и типы состояния, и реализацию экшенов**. Основной стор является тонким ассемблером.

```
packages/client/src/store/
├── gameStore.ts           # ~68 строк: create() + persist + dev tools
├── store.types.ts         # GameStore interface (объединяет все слайсы)
├── socketListeners.ts     # initSocketListeners() — отдельный модуль
├── storage.ts             # TMA-совместимый persist-адаптер
└── slices/
    ├── playerSlice.ts     # Стейт игрока + createPlayerSlice()
    ├── soloSlice.ts       # Стейт соло-режима + createSoloSlice()
    └── multiplayerSlice.ts# Стейт мультиплеера + createMultiplayerSlice()
```

---

## 2. Паттерн StateCreator

Каждый слайс экспортирует фабрику, типизированную через `StateCreator<GameStore>`. `get()` внутри любого слайса возвращает **весь** стор — перекрёстный доступ к данным других слайсов гарантирован.

```typescript
// Пример: playerSlice.ts
import { type StateCreator } from 'zustand';
import type { GameStore } from '../store.types';

export const createPlayerSlice: StateCreator<GameStore, [['zustand/persist', unknown]], [], PlayerSlice> =
  (set, get) => ({
    ...initialPlayerState,
    buyCar: (carId) => {
      const { player, market, activeEvent } = get(); // полный доступ к GameStore
      // ...
    },
  });
```

```typescript
// gameStore.ts — сборка
export const useGameStore = create<GameStore>()(
  persist(
    (set, get, api) => ({
      ...createPlayerSlice(set, get, api),
      ...createSoloSlice(set, get, api),
      ...createMultiplayerSlice(set, get, api),
      resetAccount: () => { /* cross-slice */ },
      devAddMoney: (amount) => { /* dev only */ },
      // ...
    }),
    { name: 'perekup-storage', ... }
  )
);
```

---

## 3. Типы стора

### GameStore (`store.types.ts`)
```typescript
export interface GameStore extends PlayerSlice, SoloSlice, MultiplayerSlice {
  resetAccount: () => void;
  devAddMoney: (amount: string) => void;
  devAddEnergy: (amount: number) => void;
  devTeleport: (cellId: number) => void;
  devResetTurn: () => void;
}
```

### PlayerSlice (`slices/playerSlice.ts`)

**Стейт:**
```typescript
interface PlayerState {
  player: Player;        // ← перемещено из gameStore в слайс
  garage: Car[];
  market: Car[];
  currentEvent: BoardCell | null;
  lastDiceRoll: number | null;
  hasRolledThisTurn: boolean;
  logs: LogEntry[];
  activeEvent: GameNews | null;
  totalTurns: number;
}
```

**Экшены:**
`buyCar`, `sellCar`, `repairCar`, `diagnoseCar`, `diagnoseMarketCar`, `rentCar`, `buyEnergy`, `startRace`, `refreshMarket`, `updateNews`, `executeCellAction`, `rollDice`, `manualMove`, `addLog`, `updateMarket`, `setActiveEvent`, `setCurrentEvent`

### SoloSlice (`slices/soloSlice.ts`)

**Стейт:** `isSoloMode`, `soloDebt`, `botTurnsUntilAction`, `activeQuest`

**Экшены:** `startSoloMode`, `processBotTurn`, `setActiveQuest`, `resetSoloDebt`

### MultiplayerSlice (`slices/multiplayerSlice.ts`)

**Стейт:** `roomId`, `players`, `activeDebts`, `isHost`, `currentTurnIndex`, `winCondition`, `winnerId`, `activeRace`, `remoteAnimation`, `pendingRaceChallenge`

**Экшены:** `createRoom`, `joinRoom`, `leaveRoom`, `syncRoomState`, `handleDiceRollResult`, `handleRemoteAction`, `passTurn`, `offerLoan`, `acceptLoan`, `repayDebt`, `initiateRaceDuel`, `acceptRaceDuel`, `declineRaceDuel`, сеттеры (`setActiveRace`, …)

---

## 4. Socket.IO listeners (`socketListeners.ts`)

Инициализация слушателей вынесена из `gameStore.ts` в отдельный модуль. Вызывается один раз в `App.tsx` при монтировании.

```typescript
// App.tsx
import { initSocketListeners } from './store/gameStore'; // re-export из socketListeners.ts

useEffect(() => { initSocketListeners(); }, []);
```

**Обрабатываемые события:**
- `room_updated` → `syncRoomState(roomState)`
- `dice_roll_result` → `handleDiceRollResult(playerId, diceValue, newPosition)`
- `sync_action_result` → `handleRemoteAction(data)`
- `room_error` → `addLog('[SERVER ERROR]: …', 'error')`
- `connect` → переподключение к комнате при реконнекте

---

## 5. Ключевые компоненты (React 19)

### Основной макет
- **App.tsx**: Корневой компонент. Инициализирует сокеты, обрабатывает `start_param` (deep links) и управляет переключением вкладок через `MainLayout`.
- **TopBar.tsx**: Отображает баланс, энергию и репутацию игрока.
- **BottomNavigation.tsx**: Переключатель вкладок (Гараж, Карта, Сделки, Маркет).

### Игровые экраны (`game/`)
- **RadialBoard.tsx**: Радиальная карта на 12 клеток. Отрисовывается через SVG с анимациями Framer Motion.
- **DiceArea.tsx**: Центральная область карты. Содержит кнопку броска D6 и кнопки тактических ходов (+1, +2, +3).
- **GarageView.tsx**: Список купленных автомобилей с возможностью ремонта и тюнинга.
- **MarketView.tsx**: Витрина доступных для покупки автомобилей.
- **DealsView.tsx**: Биржа P2P займов и текущие сделки.
- **ActionModal.tsx**: Универсальная модалка для взаимодействия с клеткой.
- **RaceModal.tsx**: Интерфейс проведения гонок и выбора ставок.
- **DevPanel.tsx**: Панель разработчика (только в DEV-режиме).

---

## 6. Обработка Deep Links

| `start_param` | Поведение |
|---|---|
| `solo` | Запуск одиночного режима |
| `multi` | Открытие окна создания/поиска комнаты |
| `reset` | Полный сброс прогресса (`resetAccount()`) |
| `ROOM_ID` | Автоматическое присоединение к комнате |

---

## 7. Оптимизация

- **Атомарные селекторы**: `const balance = useGameStore(s => s.player.balance)` предотвращает лишние ререндеры — компонент обновляется только при изменении конкретного поля.
- **React.memo**: Используется для `CellIcon` и элементов лога.
- **Decimal.js**: Все финансовые вычисления производятся только через этот тип.
- **Изоляция слайсов**: `set()` всегда получает минимальный diff — не весь стор целиком.
