# Перекуп D6 — Полная техническая документация
## Файл 4 из 5: Стейт-менеджмент и Компоненты

---

## 1. Zustand Store — структура слайсов

```
src/store/
├── gameStore.ts               # Сборка всех слайсов + persist middleware
├── storage.ts                 # TWAStorage (интерфейс для CloudStorage)
└── slices/
    ├── playerSlice.ts         # Баланс, гараж, энергия, покупка/продажа/ремонт
    ├── soloSlice.ts           # Соло-режим: бот Боря, квесты, долг
    └── multiplayerSlice.ts    # Комнаты, Socket.IO, синхронизация
```

---

## 2. TWAStorage — хранилище

```typescript
// src/store/storage.ts
// НЕ импортировать StateStorage из zustand/middleware — это вызывает WSOD в Vite!
// Создаём локальный интерфейс-копию:

interface TWAStorage {
  getItem: (name: string) => string | null | Promise<string | null>;
  setItem: (name: string, value: string) => void | Promise<void>;
  removeItem: (name: string) => void | Promise<void>;
}

export const tmaStorage: TWAStorage = {
  getItem: (name) => {
    try { return localStorage.getItem(name); } catch { return null; }
  },
  setItem: (name, value) => {
    try { localStorage.setItem(name, value); } catch { /* ignore */ }
  },
  removeItem: (name) => {
    try { localStorage.removeItem(name); } catch { /* ignore */ }
  },
};
```

> **Примечание:** Telegram CloudStorage — асинхронный API. В текущей реализации используется `localStorage` как fallback. Для production добавить async-реализацию через `@telegram-apps/sdk-react`.

---

## 3. Ключ persist

```typescript
// src/store/gameStore.ts
persist(
  (set, get) => ({ ... }),
  {
    name: 'perekup-storage',
    storage: createJSONStorage(() => tmaStorage),
    partialize: (state) => ({
      // Сохраняем только критичное
      player: state.player,
      garage: state.garage,
      roomId: state.roomId,
      players: state.players,
      activeDebts: state.activeDebts,
      isHost: state.isHost,
      currentTurnIndex: state.currentTurnIndex,
      totalTurns: state.totalTurns,
    }),
  }
)
```

---

## 4. Инициализация Socket.IO listeners

```typescript
// src/store/gameStore.ts

let listenersInitialized = false;

export function initSocketListeners() {
  if (listenersInitialized) return;

  socket.on('connect', () => {
    const { roomId } = useGameStore.getState();
    if (roomId) {
      useGameStore.getState().joinRoom(roomId); // Реподключение
    }
  });

  socket.on('room_updated', (roomState) => {
    useGameStore.getState().syncRoomState(roomState);
  });

  socket.on('dice_roll_result', ({ playerId, diceValue, newPosition }) => {
    useGameStore.getState().handleDiceRollResult(playerId, diceValue, newPosition);
  });

  socket.on('room_error', (msg) => {
    useGameStore.getState().addLog(`[SERVER ERROR]: ${msg}`);
  });

  socket.on('sync_action_result', (data) => {
    useGameStore.getState().handleRemoteAction(data);
  });

  listenersInitialized = true;
}
```

Вызывается **один раз** в `useEffect` в `App.tsx`:
```tsx
useEffect(() => {
  initSocketListeners();
}, []);
```

---

## 5. Получение ID игрока

ID игрока сохраняется в localStorage и не меняется между сессиями (важно для реподключения):

```typescript
const getPersistentPlayerId = () => {
  try {
    const saved = localStorage.getItem('game-storage');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.state?.player?.id) return parsed.state.player.id;
    }
  } catch { /* ignore */ }
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
};
```

---

## 6. Обработка deep links (Telegram start_param)

```tsx
// src/App.tsx — в useEffect при монтировании
useEffect(() => {
  try {
    let sp: string | undefined;

    // Вариант 1: URL параметры
    const urlParams = new URLSearchParams(window.location.search);
    sp = urlParams.get('roomId') || urlParams.get('startapp') || undefined;

    // Вариант 2: TMA SDK
    if (!sp) {
      try {
        if (typeof initDataStartParam === 'function') {
          sp = initDataStartParam();
        }
      } catch { /* не в TMA окружении */ }
    }

    // Вариант 3: retrieveLaunchParams
    if (!sp) {
      const lp = retrieveLaunchParams();
      sp = lp.initData?.start_param || lp.startParam;
    }

    if (sp === 'solo') startSoloMode();
    else if (sp === 'multi') { /* открыть лобби */ }
    else if (sp === 'reset') resetAccount();
    else if (sp && sp !== roomId) joinRoom(sp); // Прямая ссылка на комнату
  } catch {
    console.log('Not in TMA environment');
  }
}, []);
```

---

## 7. Компоненты — краткая спецификация

### App.tsx
- Инициализирует socket listeners
- Парсит `start_param` для deep linking
- Рендерит основной layout: заголовок, `RadialBoard`, `CentralAction`, `GameLogs`
- Управляет оверлеями: `ActionModal`, `WinModal`, `CreateRoomModal`, `ContractsModal`, `RulesModal`
- **DebugPanel** рендерится ТОЛЬКО при `import.meta.env.DEV`

### RadialBoard.tsx
- SVG-кольцо из 12 сегментов
- Каждый сегмент: иконка из `iconMapping.ts` + webp изображение
- Текущая позиция игрока подсвечивается
- Позиции оппонентов отображаются отдельными маркерами
- Анимация через Framer Motion
- `eslint-disable react-hooks/exhaustive-deps` — намеренно, из-за анимационного ref

### CentralAction.tsx
- Кнопка «ROLL D6» (большая, в центре)
- 3 кнопки тактических ходов: +1, +2, +3 (активны только при `energy > 0`)
- Индикатор энергии (3 молнии/сегмента)
- Disabled states: во время анимации, при `hasRolledThisTurn`, при `currentEvent !== null`

### ActionModal.tsx
- Открывается при `currentEvent !== null`
- Содержимое зависит от типа клетки:
  - `sale` → список авто в гараже с ценами продажи + кнопка покупки энергии
  - `buy_*` → список лотов рынка с дефектами + кнопки покупки
  - `repair` / `special_repair` → список авто с дефектами + ремонт + диагностика
  - `race` → выбор ставки + кнопка старта
  - `rent` → список авто + кнопки сдачи в прокат
  - `buy_retro` → отображается сразу после `playRetroMinigame`
- Цены через `Decimal.js` (никаких `parseFloat`!)
- `useMemo` для вычисления `sellPrice`

### GameLogs.tsx
- Отображает `logs` из стора
- Цветовая маркировка по `LogEntry.type`
- Максимум 50 записей (обрезается в сторе)

### AnimatedCounter.tsx
- Анимирует числовое значение при изменении
- Используется для баланса в заголовке

### CellIcon.tsx
- Обёрнут в `React.memo` (не перерисовывается при ходах)
- Принимает `CellType`, рендерит соответствующий webp/svg

### ContractsModal.tsx
- Вкладка «Биржа займов»
- Список `activeDebts` со статусами
- Форма создания оффера: сумма, % , срок
- Принятие оффера: выбор залогового авто

### CreateRoomModal.tsx
- Создание комнаты: выбор `winCondition` ($500k / $1M)
- Показ `roomId` + кнопка «Поделиться» (через TMA `shareURL`)
- Поле ввода кода комнаты для присоединения

### WinModal.tsx
- Показывается при `winnerId !== null`
- Отображает победителя, финальный баланс
- Кнопки: сыграть ещё / выйти

### DebugPanel.tsx
- **Только при `import.meta.env.DEV`**
- Активируется 5-кратным тапом по номеру версии (`GAME_VERSION`)
- Функции: +$50k, +$100k, Full Energy, Teleport, Clear Garage, Hard Reset
- **Dev-события НЕ транслируются через sync_action в мультиплеере**

### TMAProvider.tsx
- Инициализирует Telegram SDK
- Безопасная проверка поддержки функций: `typeof feature.isSupported === 'function' ? feature.isSupported() : true`
- Настраивает HapticFeedback
- Монтирует `backButton` только если поддерживается

---

## 8. Паттерны использования стора

### ✅ ПРАВИЛЬНО — атомарные селекторы

```tsx
// Компонент перерисовывается только при изменении баланса
const balance = useGameStore(state => state.player.balance);
const energy = useGameStore(state => state.player.energy);
const market = useGameStore(state => state.market);
```

### ❌ НЕПРАВИЛЬНО — деструктуризация всего стора

```tsx
// Компонент перерисовывается при ЛЮБОМ изменении стора
const { player, market, garage, logs, ...rest } = useGameStore();
```

### Мемоизация компонентов

```tsx
// Клетки карты не меняются при ходах — мемоизируем
export const CellIcon = React.memo(({ type, isActive }: Props) => {
  // ...
});

// Записи лога не меняются после добавления
export const LogItem = React.memo(({ entry }: { entry: LogEntry }) => {
  // ...
});
```

---

## 9. Флаги состояния и их взаимодействия

```
Когда активна анимация (boardAnimationStatus === 'running'):
  ├── Нельзя бросить кубик
  ├── Нельзя тактический ход
  └── Нельзя открыть гараж

Когда открыто событие (currentEvent !== null):
  ├── Нельзя бросить кубик
  ├── Нельзя тактический ход
  └── ActionModal открыт

Когда уже ходил в этом ходу (hasRolledThisTurn):
  ├── Нельзя бросить кубик повторно
  └── Нельзя тактический ход

Когда мультиплеер и не твой ход:
  └── Все кнопки хода заблокированы
```

---

## 10. Синхронизация удалённых действий (handleRemoteAction)

Список поддерживаемых `sync_action` событий:

| action | payload type | Что делает |
|---|---|---|
| `buyCar` | `string` (carId) | Удаляет авто с рынка у всех |
| `sellCar` | `string` (carId) | Лог о продаже |
| `repairCar` | `{ carId, defectId, isDiscounted }` | Лог о ремонте |
| `rentCar` | `string` (carId) | Лог об аренде |
| `manualMove` | `{ steps, newPosition }` | Обновляет позицию игрока |
| `buyEnergy` | `null` | Лог о покупке энергии |
| `diagnoseCar` | `string` (carId) | Лог о диагностике |
| `updateMarket` | `Car[]` | Обновляет весь рынок |
| `newsUpdate` | `GameNews` | Устанавливает `activeEvent` |
| `victory` | `null` | Устанавливает `winnerId` |
| `loanOffer` | `Debt` | Добавляет долг в `activeDebts` |
| `loanAccepted` | `Debt` | Обновляет долг |
| `repayDebt` | `string` (debtId) | Удаляет долг |
| `confiscateCar` | `string` (debtId) | Конфискация залога |
| `raceLobbyOpen` | race объект | Открывает гоночное лобби |
| `raceChallengeInitiated` | race+targetId | Вызов на дуэль |
| `raceJoin` | `{ initiatorId }` | Присоединение к гонке |
| `raceResults` | results объект | Результаты гонки |

**ФИЛЬТР на сервере** — эти action блокируются:
```typescript
const DEV_ACTIONS = ['devAddMoney', 'devClearGarage', 'devSetEnergy', 'devTeleport'];

socket.on('sync_action', ({ action }) => {
  if (DEV_ACTIONS.includes(action)) return; // Игнорируем
  // ...
});
```

---

## 11. Оптимизация производительности

### GPU & CSS
- Нет `backdrop-filter: blur(...)` — использовать `background: rgba(11, 14, 17, 0.9)`
- Анимации только через `transform` и `opacity` (GPU-ускорение)
- `will-change: transform` на анимированных элементах карты
- `<img decoding="async" loading="lazy">` для всех иконок

### Assets
- Иконки клеток: WebP, 256×256px, ≤15KB каждая
- Формат файлов: `buy_bucket.webp`, `sale.webp`, etc.
- SVG для фавиконки и иконок в коде

### Framer Motion
- `layout` проп только там, где нужна layout-анимация
- Анимации выхода через `AnimatePresence`

### React
- `key={item.id}` (не индекс массива) для списков машин/логов
- `React.memo` для `CellIcon`, `LogItem`, `CarCard`
- Атомарные Zustand-селекторы везде
