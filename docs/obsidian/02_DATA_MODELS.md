# Перекуп D6 — Полная техническая документация
## Файл 2 из 5: Типы данных и Модели

> Все типы живут в одном файле: `src/shared/types.ts`. Это единственный источник правды — и сервер, и клиент импортируют отсюда.

---

## 1. Перечисления (Enums / Union Types)

```typescript
// Уровень серьёзности дефекта
export type SeverityLevel = 'Light' | 'Medium' | 'Serious' | 'Critical';

// Класс автомобиля
export type CarTier = 'Bucket' | 'Scrap' | 'Business' | 'Premium' | 'Rarity';

// Категория дефекта
export type DefectCategory = 'Engine' | 'Electrical' | 'Suspension' | 'Body';

// Тип клетки на карте
export type CellType =
  | 'sale'          // Чапаевка — продажа
  | 'buy_bucket'    // Вёдра
  | 'buy_scrap'     // Битьё
  | 'buy_business'  // Бизнес-класс (ПРИМЕЧАНИЕ: в текущем коде отсутствует, добавить!)
  | 'buy_premium'   // Премиум
  | 'buy_random'    // Автоподбор (любой класс)
  | 'buy_retro'     // Ретро (Rarity)
  | 'repair'        // Автосервис
  | 'special_repair'// Автосервис «Пехота» (спец. функции)
  | 'race'          // Гонка
  | 'rent'          // Прокат
  | 'fines';        // Полиция / штрафы (добавить в будущем)

// Тип записи в логе
export type LogType = 'bot' | 'system' | 'debt' | 'quest' | 'success' | 'error' | 'info';
```

---

## 2. Дефекты

### DefectType — тип дефекта (из базы данных)
```typescript
export interface DefectType {
  id: string;            // Уникальный ID, напр. 'eng_1', 'legal_block'
  name: string;          // Название: 'Стук в двигателе'
  category: DefectCategory;
  severity: SeverityLevel;
  preventsSale?: boolean; // true только для 'legal_block'
}
```

### DefectInstance — конкретный дефект на машине
```typescript
export interface DefectInstance {
  id: string;            // Уникальный ID этого экземпляра (Math.random)
  defectTypeId: string;  // Ссылка на DefectType.id
  isHidden: boolean;     // true = не виден при покупке (Rarity/Premium)
  repairCost: string;    // Стоимость ремонта как строка Decimal
  isRepaired: boolean;   // Отремонтирован ли
}
```

---

## 3. Автомобиль

```typescript
export interface Car {
  id: string;              // Уникальный ID (Math.random)
  name: string;            // Название модели: 'BMW 5 Series F10'
  tier: CarTier;           // Класс авто
  basePrice: string;       // Базовая цена как строка Decimal
  defects: DefectInstance[];
  history: string[];       // Лог: ['Поступила на рынок', 'Куплена за $5000', ...]
  health: number;          // 0–100 (вычисляется из дефектов)
  isRented?: boolean;      // Была ли сдана в прокат в этом ходу
  isLocked?: boolean;      // Заблокирована залогом по долгу
  boughtFor?: string;      // За сколько куплена (для расчёта P&L)
}
```

> **Правило Health:**
> `health = 100 - сумма(HEALTH_PENALTIES[defect.severity])` для всех НЕ отремонтированных дефектов.
>
> Штрафы: Light=−10, Medium=−25, Serious=−45, Critical=−80. Минимум: 0.

---

## 4. Игрок

```typescript
export interface Player {
  id: string;                // Уникальный ID (сохраняется в localStorage)
  name?: string;             // Имя из Telegram или кастомное
  balance: string;           // Баланс как строка Decimal (старт: '2000')
  fuel: number;              // Устарело — не используется (оставлено для совместимости)
  position: number;          // Текущая позиция на карте 0–11
  reputation: number;        // Репутация (резерв для штрафов, старт: 100)
  garage?: Car[];            // Машины игрока (опционально в RoomState)
  energy: number;            // Тактическая энергия 0–3 (старт: 3)
  energyRegenCounter: number;// 0–1: каждые 2 хода D6 → +1 энергия
}
```

---

## 5. Долг (P2P Lending)

```typescript
export interface Debt {
  id: string;
  lenderId: string;          // ID игрока-кредитора
  borrowerId?: string;       // ID игрока-заёмщика (undefined = открытый оффер)
  amount: string;            // Сумма займа (Decimal string)
  interest: string;          // Процент, напр. '20' означает 20%
  totalToPay: string;        // amount * (1 + interest/100) — рассчитывается при создании
  turnsLeft: number;         // Ходов до автоконфискации
  initialTurns: number;      // Исходный срок (для отображения)
  collateralCarId?: string;  // ID заложенного авто
  status: 'pending' | 'active' | 'closed' | 'confiscated';
}
```

---

## 6. Клетка карты

```typescript
export interface BoardCell {
  id: number;        // 0–11
  type: CellType;
  name: string;      // Отображаемое название: 'Чапаевка'
  icon: string;      // Эмодзи: '💰'
  description: string; // Краткое описание
}
```

---

## 7. Игровая карта (GAME_MAP)

```typescript
export const GAME_MAP: BoardCell[] = [
  { id: 0,  type: 'sale',         name: 'Чапаевка',          icon: '💰', description: 'Продажа авто' },
  { id: 1,  type: 'buy_bucket',   name: 'Вёдра',             icon: '🪣', description: 'Покупка вёдер + дефект' },
  { id: 2,  type: 'repair',       name: 'Автосервис',        icon: '🛠️', description: 'Ремонт машин' },
  { id: 3,  type: 'race',         name: 'Гонка',             icon: '🏎️', description: 'Заезд с игроком' },
  { id: 4,  type: 'buy_random',   name: 'Автоподбор',        icon: '🚗', description: 'Авто любого уровня + дефект' },
  { id: 5,  type: 'buy_scrap',    name: 'Битьё',             icon: '🔨', description: 'Битые машины' },
  { id: 6,  type: 'sale',         name: 'Чапаевка',          icon: '💰', description: 'Продажа авто' },
  { id: 7,  type: 'buy_premium',  name: 'Премиум',           icon: '⭐', description: 'Премиум авто + дефект' },
  { id: 8,  type: 'special_repair', name: 'Автосервис Пехота', icon: '🛠️', description: 'Спец сервис' },
  { id: 9,  type: 'race',         name: 'Гонка',             icon: '🏎️', description: 'Заезд' },
  { id: 10, type: 'rent',         name: 'Прокат',            icon: '🚗', description: 'Сдача авто' },
  { id: 11, type: 'buy_retro',    name: 'Ретро',             icon: '🏎️', description: 'Ретро авто' },
];
```

---

## 8. Квест (Соло-режим)

```typescript
export interface SoloQuest {
  id: string;
  targetModel: string; // Название модели, напр. 'BMW 5 Series F10'
  minHealth: number;   // Минимальный Health, обычно 90 или 100
  turnsLeft: number;   // Осталось ходов
  reward: number;      // Денежная награда (number, не Decimal)
}
```

---

## 9. Новость/Событие рынка

```typescript
export interface GameNews {
  id: string;
  title: string;         // 'Бум на бизнес-класс!'
  description: string;   // 'Инвесторы скупают Camry...'
  effects: {
    tierMultipliers: Record<CarTier, number>;    // { Business: 1.25 }
    modelMultipliers: Record<string, number>;    // { 'Ferrari Testarossa': 1.4 }
  };
}
```

---

## 10. Состояние игры (GameState)

```typescript
export interface GameState {
  // Игрок
  player: Player;
  garage: Car[];           // Дублирует player.garage для удобства
  market: Car[];           // Текущие лоты на рынке
  
  // Ход
  currentEvent: BoardCell | null;
  lastDiceRoll: number | null;
  lastTaxDeduction: number | null;
  boardAnimationStatus: 'idle' | 'running';
  hasRolledThisTurn: boolean;
  
  // Лог
  logs: LogEntry[];
  
  // UI флаги
  isGarageOpen: boolean;
  isRulesOpen: boolean;
  isContractsOpen: boolean;
  highlightedCellId: number | null;
  
  // Соло-режим
  isSoloMode: boolean;
  soloDebt: string;            // Долг бота (растёт на 10% каждые 10 ходов)
  botTurnsUntilAction: number; // Счётчик ходов до действия бота
  activeQuest: SoloQuest | null;
  
  // Мультиплеер
  roomId: string | null;
  players: Player[];
  activeDebts: Debt[];
  isHost: boolean;
  hostId?: string;
  currentTurnIndex: number;
  winCondition: number;
  winnerId: string | null;
  
  // Глобальные
  activeEvent: GameNews | null;
  totalTurns: number;
  
  // Гонка
  activeRace: {
    initiatorId: string;
    participants: string[];
    bet: number;
    startTime: number;
  } | null;
  
  // Анимация для удалённого игрока
  remoteAnimation: {
    playerId: string;
    diceValue: number;
    fromPosition: number;
  } | null;
}
```

---

## 11. Состояние комнаты (RoomState — на сервере)

```typescript
export interface RoomState {
  id: string;               // 6-символьный ID: 'A3F7K2'
  players: Player[];
  market: Car[];
  hostId: string;
  currentTurnIndex: number;
  winCondition: number;
  winnerId?: string;
}
```

---

## 12. События Socket.IO (типизация)

```typescript
export interface ServerToClientEvents {
  room_error: (msg: string) => void;
  room_updated: (state: RoomState) => void;
  dice_roll_result: (data: { playerId: string; diceValue: number; newPosition: number }) => void;
  sync_action_result: (data: { playerId: string; action: string; payload: unknown }) => void;
}

export interface ClientToServerEvents {
  create_room: (
    data: { player: Player; winCondition: number },
    callback: (res: { success: boolean; error?: string; roomId?: string }) => void
  ) => void;
  join_room: (
    data: { roomId: string; player: Player },
    callback: (res: { success: boolean; error?: string }) => void
  ) => void;
  leave_room: (roomId: string, playerId: string) => void;
  dice_roll: (data: { roomId: string; playerId: string }) => void;
  pass_turn: (data: { roomId: string; playerId: string }) => void;
  sync_action: (data: { roomId: string; playerId: string; action: string; payload: unknown }) => void;
}
```

---

## 13. LogEntry

```typescript
export interface LogEntry {
  text: string;
  type?: LogType;
}
```

---

## 14. Правила импорта

```typescript
// ВСЕГДА используй type imports для интерфейсов и типов
import type { Car, Player, Debt } from '../shared/types';

// Значения (константы, функции) — обычный импорт
import { GAME_MAP } from '../shared/types';

// НЕ импортируй из domain/models.ts — это устаревший re-export
// ❌ import { GameState } from '../domain/models';
// ✅ import type { GameState } from '../shared/types';
```
