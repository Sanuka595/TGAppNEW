# Перекуп D6 — Полная техническая документация
## Файл 2 из 6: Типы данных и Модели

> Все типы базируются на **Zod-схемах** в пакете `packages/shared/src/dtos/`. Игровые константы и чистые функции расчётов живут в `packages/shared/src/constants.ts` и `packages/shared/src/businessLogic.ts`.

---

## 1. Примитивные типы

```typescript
// packages/shared/src/dtos/common.ts
export type SeverityLevel = 'Light' | 'Medium' | 'Serious' | 'Critical';
export type CarTier       = 'Bucket' | 'Scrap' | 'Business' | 'Premium' | 'Rarity';
export type DefectCategory = 'Engine' | 'Electrical' | 'Suspension' | 'Body';
export type LogType = 'bot' | 'system' | 'debt' | 'quest' | 'success' | 'error' | 'info';
```

---

## 2. Автомобиль и Дефекты

### DefectInstance
```typescript
export interface DefectInstance {
  id: string;            // уникальный ID инстанса
  defectTypeId: string;  // ID из DEFECTS_DB
  name: string;
  category: DefectCategory;
  severity: SeverityLevel;
  repairCost: string;    // Decimal string
  isRepaired: boolean;
  isHidden: boolean;     // true до диагностики (Premium / Rarity)
}
```

### Car
```typescript
export interface Car {
  id: string;
  name: string;
  tier: CarTier;
  basePrice: string;     // Decimal string
  defects: DefectInstance[];
  health: number;        // 0–100, вычисляется через calculateCarHealth()
  history: string[];
  boughtFor: string;     // цена покупки, '0' если не куплена игроком
  isRented?: boolean;    // заблокирована на текущий ход
  isLocked?: boolean;    // заблокирована под залог по долгу
  auditLog?: CarHistoryEntry[];
}
```

---

## 3. Игрок (Player)

```typescript
export interface Player {
  id: string;
  name?: string;
  balance: string;            // Decimal string
  fuel: number;               // резерв, не используется
  position: number;           // 0–11
  reputation: number;
  garage?: Car[];
  energy: number;             // 0–MAX_ENERGY (3)
  energyRegenCounter: number; // счётчик регенерации
}
```

---

## 4. Игровые константы (`constants.ts`)

Единственный источник числовых параметров игры. Импортируются клиентом и сервером.

```typescript
export const DIAGNOSTICS_COST       = 200;    // диагностика авто
export const MARKET_REFRESH_COST    = 500;    // обновление лота
export const ENERGY_PURCHASE_COST   = 500;    // покупка 1 ед. энергии
export const MAX_ENERGY             = 3;      // максимум энергии
export const SPECIAL_REPAIR_DISCOUNT = '0.95'; // скидка на клетке Пехота
```

---

## 5. Игровая карта (GAME_MAP)

```typescript
export type CellType =
  | 'sale' | 'buy_bucket' | 'buy_scrap' | 'buy_business'
  | 'buy_premium' | 'buy_random' | 'buy_retro'
  | 'repair' | 'special_repair' | 'race' | 'rent' | 'fines';

export const GAME_MAP: BoardCell[] = [
  { id: 0,  type: 'sale',           name: 'Чапаевка',          icon: '💰' },
  { id: 1,  type: 'buy_bucket',     name: 'Вёдра',             icon: '🪣' },
  { id: 2,  type: 'repair',         name: 'Автосервис',        icon: '🛠️' },
  { id: 3,  type: 'race',           name: 'Гонка',             icon: '🏎️' },
  { id: 4,  type: 'buy_random',     name: 'Автоподбор',        icon: '🚗' },
  { id: 5,  type: 'buy_scrap',      name: 'Битьё',             icon: '🔨' },
  { id: 6,  type: 'sale',           name: 'Чапаевка',          icon: '💰' },
  { id: 7,  type: 'buy_premium',    name: 'Премиум',           icon: '⭐' },
  { id: 8,  type: 'special_repair', name: 'Автосервис Пехота', icon: '🛠️' },
  { id: 9,  type: 'race',           name: 'Гонка',             icon: '🏎️' },
  { id: 10, type: 'rent',           name: 'Прокат',            icon: '🚗' },
  { id: 11, type: 'buy_retro',      name: 'Ретро',             icon: '🏎️' },
];
```

---

## 6. Синхронизация (SyncActionPayload)

Discriminated union — каждый экшен имеет уникальное поле `action` и строго типизированный `payload`.

**Торговля**: `buyCar`, `sellCar`, `refreshMarket`, `updateMarket`
**Сервис**: `repairCar`, `diagnoseCar`, `diagnoseMarketCar`
**Доход**: `rentCar`, `buyEnergy`
**Движение**: `manualMove`
**P2P Долги**: `loanOffer`, `loanAccepted`, `repayDebt`, `confiscateCar`
**Гонки**: `raceLobbyOpen`, `raceChallengeInitiated`, `raceAccept`, `raceDecline`, `raceJoin`, `raceResults`
**Системные**: `newsUpdate`, `victory`

---

## 7. Состояние комнаты (RoomState)

```typescript
export interface RoomState {
  id: string;
  players: Player[];
  market: Car[];
  hostId: string;
  currentTurnIndex: number;
  winCondition: number;
  activeDebts: Debt[];
  activeRace: RaceDuel | null;
  activeEvent?: GameNews | null;
  winnerId?: string;
  totalTurns: number;
  marketRefreshedAt: number;
}
```

---

## 8. Долг (Debt)

```typescript
export interface Debt {
  id: string;
  lenderId: string;
  borrowerId?: string;
  collateralCarId?: string;
  amount: string;          // основная сумма, Decimal string
  interest: string;        // начисленный процент, Decimal string
  totalToPay: string;      // amount + interest, Decimal string
  turnsLeft: number;
  initialTurns: number;
  status: 'pending' | 'active' | 'closed' | 'confiscated';
}
```
