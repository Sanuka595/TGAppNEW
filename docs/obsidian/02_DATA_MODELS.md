# Перекуп D6 — Полная техническая документация
## Файл 2 из 5: Типы данных и Модели

> Все типы базируются на **Zod-схемах** в пакете `packages/shared/src/dtos/`.

---

## 1. Типы и Схемы

Используем Zod для рантайм-валидации и вывода типов TS.

```typescript
// packages/shared/src/dtos/common.ts
export type SeverityLevel = 'Light' | 'Medium' | 'Serious' | 'Critical';
export type CarTier = 'Bucket' | 'Scrap' | 'Business' | 'Premium' | 'Rarity';
export type DefectCategory = 'Engine' | 'Electrical' | 'Suspension' | 'Body';
export type LogType = 'bot' | 'system' | 'debt' | 'quest' | 'success' | 'error' | 'info';
```

---

## 2. Автомобиль и Дефекты

### DefectInstance
```typescript
export interface DefectInstance {
  id: string;            // уникальный ID инстанса
  defectTypeId: string;  // ID из базы дефектов
  name: string;
  severity: SeverityLevel;
  repairCost: string;    // Decimal string
  isRepaired: boolean;
  isHidden: boolean;
}
```

### Car
```typescript
export interface Car {
  id: string;
  name: string;
  tier: CarTier;
  basePrice: string;
  defects: DefectInstance[];
  health: number;        // 0-100
  history: string[];     // История событий
  boughtFor?: string;
  isRented?: boolean;
  isLocked?: boolean;    // Если в залоге по долгу
  mileage?: number;
  auditLog?: CarHistoryEntry[];
}
```

---

## 3. Игрок (Player)

```typescript
export interface Player {
  id: string;
  name?: string;
  balance: string;       // Decimal string
  fuel: number;          // Топливо (пока не используется)
  position: number;      // 0-11
  reputation: number;
  garage?: Car[];
  energy: number;        // 0-3
  energyRegenCounter: number; // 0-1
}
```

---

## 4. Синхронизация (SyncActionPayload)

Полный список реализованных экшенов:

- **Торговля**: `buyCar`, `sellCar`, `refreshMarket`, `updateMarket`.
- **Сервис**: `repairCar`, `diagnoseCar`, `diagnoseMarketCar`.
- **Доход**: `rentCar`.
- **Движение**: `manualMove` (тактический ход), `buyEnergy`.
- **P2P Долги**: `loanOffer`, `loanAccepted`, `repayDebt`, `confiscateCar`.
- **Гонки**: `raceLobbyOpen`, `raceChallengeInitiated`, `raceAccept`, `raceDecline`, `raceJoin`, `raceResults`.
- **Системные**: `newsUpdate`, `victory`.

---

## 5. Игровая карта (GAME_MAP)

```typescript
export const GAME_MAP: BoardCell[] = [
  { id: 0,  type: 'sale',           name: 'Чапаевка',          icon: '💰', description: 'Продажа авто' },
  { id: 1,  type: 'buy_bucket',     name: 'Вёдра',             icon: '🪣', description: 'Покупка вёдер + дефект' },
  { id: 2,  type: 'repair',         name: 'Автосервис',        icon: '🛠️', description: 'Ремонт машин' },
  { id: 3,  type: 'race',           name: 'Гонка',             icon: '🏎️', description: 'Заезд с игроком' },
  { id: 4,  type: 'buy_random',     name: 'Автоподбор',        icon: '🚗', description: 'Авто любого уровня + дефект' },
  { id: 5,  type: 'buy_scrap',      name: 'Битьё',             icon: '🔨', description: 'Битые машины' },
  { id: 6,  type: 'sale',           name: 'Чапаевка',          icon: '💰', description: 'Продажа авто' },
  { id: 7,  type: 'buy_premium',    name: 'Премиум',           icon: '⭐', description: 'Премиум авто + дефект' },
  { id: 8,  type: 'special_repair', name: 'Автосервис Пехота', icon: '🛠️', description: 'Спец сервис' },
  { id: 9,  type: 'race',           name: 'Гонка',             icon: '🏎️', description: 'Заезд' },
  { id: 10, type: 'rent',           name: 'Прокат',            icon: '🚗', description: 'Сдача авто' },
  { id: 11, type: 'buy_retro',      name: 'Ретро',             icon: '🏎️', description: 'Редкие и ретро авто' },
];
```
