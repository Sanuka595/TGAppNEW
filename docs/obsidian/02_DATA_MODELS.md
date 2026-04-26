# Перекуп D6 — Полная техническая документация
## Файл 2 из 5: Типы данных и Модели

> Все типы базируются на **Zod-схемах** и живут в пакете `packages/shared/src/dtos/`. Это единственный источник правды — и сервер, и клиент импортируют отсюда.

---

## 1. Типы и Схемы

Мы используем Zod для валидации данных в рантайме. Типы экспортируются как `z.infer<typeof Schema>`.

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
  id: string;            // uuid
  name: string;          // из базы дефектов
  severity: SeverityLevel;
  repairCost: string;    // Decimal string
  isRepaired: boolean;
  isHidden: boolean;     // скрыт до диагностики
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
  boughtFor?: string;
  isRented?: boolean;
}
```

---

## 3. Новость/Событие рынка

```typescript
export interface GameNews {
  id: string;
  title: string;
  description: string;
  icon: string;          // Эмодзи или символ
  effects: {
    tierMultipliers: Record<CarTier, number>;
    modelMultipliers: Record<string, number>;
  };
}
```

---

## 4. Игровая карта (GAME_MAP)

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

---

## 5. Синхронизация (SyncActionPayload)

Список всех экшенов, которые передаются между игроками:

- `buyCar`, `sellCar`, `repairCar`, `rentCar`
- `diagnoseCar` — скрытые дефекты
- `newsUpdate` — ротация новостей
- `raceResults` — итоги гонок
- `loanOffer`, `loanAccepted`, `repayDebt`
- `victory` — завершение игры
- `buyEnergy` — покупка тактического преимущества

---

## 6. Правила импорта

```typescript
// ✅ ВСЕГДА из shared
import { GAME_MAP, type Car, type Player } from '@tgperekup/shared';
```
