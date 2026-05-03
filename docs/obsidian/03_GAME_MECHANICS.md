# Перекуп D6 — Полная техническая документация
## Файл 3 из 6: Игровые Механики и Экономика

> Все формулы и константы живут в `packages/shared/src/businessLogic.ts` и `packages/shared/src/constants.ts`. Клиент и сервер импортируют одни и те же чистые функции — рассинхрон исключён.

---

## 1. Карта и Перемещение

Игровое поле состоит из 12 клеток. Формула: `newPosition = (currentPosition + steps) % 12`.

### Бросок D6
Клиент вызывает `rollDice()`. В соло-режиме результат обрабатывается локально через `handleDiceRollResult`. В мультиплеере — делегируется серверу через событие `dice_roll`.

### Тактический ход (Энергия)
- **Максимум**: `MAX_ENERGY = 3` (из `constants.ts`)
- **Стоимость**: 1 энергия за ход (+1, +2 или +3 клетки)
- **Покупка**: $`ENERGY_PURCHASE_COST = 500` на клетке `sale`

### Случайные встречи на дороге
При каждом броске D6 с вероятностью **15%** срабатывает случайное событие. Логика вынесена в чистую функцию `resolveRandomEncounter()` из `shared`:

```typescript
export function resolveRandomEncounter(): RandomEncounter | null {
  if (Math.random() >= 0.15) return null;
  const isBad = Math.random() > 0.5;
  return isBad
    ? { type: 'fine',  amount: 100 + Math.floor(Math.random() * 200) }  // ГАИ
    : { type: 'bonus', amount: 50  + Math.floor(Math.random() * 150) }; // Заначка
}
```

---

## 2. Экономика и Цены

Все финансовые расчёты ведутся с использованием `Decimal.js`.

### Покупка автомобиля — `calculateCurrentMarketValue(car, activeNews?)`
```
basePrice → applyNewsEffects → − (repairCost × 1.2) на каждый неисправленный дефект → min $100
```
Коэффициент 1.2× отражает покупательский риск (неизвестная стоимость ремонта).

### Продажа автомобиля — `calculateSellPrice(car, activeNews?)`
```
basePrice → applyNewsEffects → − repairCost на каждый дефект → × PROFIT_MARGINS[tier] → min $100
```
- **Маржа по тирам** (`PROFIT_MARGINS`): Bucket (1.10), Scrap (1.20), Business (1.15), Premium (1.15)
- **Rarity**: особый детерминированный множитель `deterministicMultiplier(car.id, 2, 4)` — один и тот же для одной машины всегда
- **Бонус Rarity**: +$5,000 если `health = 100` и ≤2 дефектов, все исправлены
- **Блокировка**: если на машине активен дефект `legal_block` — функция возвращает `Decimal(0)`, продажа запрещена

### Налоги — `calculateOwnershipTax(garage)`
Списываются при каждом броске кубика. Ставки (`OWNERSHIP_TAX_RATES`):
`Bucket $20 / Scrap $50 / Business $100 / Premium $150 / Rarity $300`

### Константы стоимостей (`constants.ts`)
| Константа | Значение | Описание |
|---|---|---|
| `DIAGNOSTICS_COST` | $200 | Диагностика (гараж или рынок) |
| `MARKET_REFRESH_COST` | $500 | Обновление лота на клетке покупки |
| `ENERGY_PURCHASE_COST` | $500 | Покупка 1 ед. энергии |
| `SPECIAL_REPAIR_DISCOUNT` | 0.95 | Скидка на ремонт на клетке Sервис Пехота |

---

## 3. Генерация рынка — `generateMarketForCell(cellType)`

При попадании на клетку покупки вызывается чистая функция из `shared`, которая генерирует лоты:

| Тип клетки | Генерируемые авто |
|---|---|
| `buy_bucket` | 3 × Bucket |
| `buy_scrap` | 3 × Scrap |
| `buy_business` | 3 × Business |
| `buy_premium` | 2 × Premium |
| `buy_retro` | 1 × Rarity |
| `buy_random` | 3 случайных тира |

Та же функция используется в `refreshMarket` — поведение при обновлении идентично первоначальному.

---

## 4. Механика Гонки

### Мультиплеер — `processRaceResolve()` на сервере
Бросок D6 + бонус тира + бонус инициатора. Константа `TIER_RACE_BONUS` импортируется из `shared`:

```typescript
export const TIER_RACE_BONUS: Record<CarTier, number> = {
  Bucket: -1, Scrap: 0, Business: 0, Premium: +1, Rarity: +2,
};
```

- Инициатор заезда получает дополнительный бонус **+1** (home-field advantage).
- Игрок с большим итоговым числом забирает ставку.
- Ставка ограничена 50% баланса инициатора.

### Соло — `calculateSoloRaceWinChance(car)`
Вероятностная модель против бота. Формула из `shared`:

```typescript
export const SOLO_RACE_TIER_MULTIPLIERS: Record<CarTier, number> = {
  Bucket: 0.5, Scrap: 0.7, Business: 1.0, Premium: 1.3, Rarity: 1.6,
};

export function calculateSoloRaceWinChance(car: Car): number {
  return (car.health / 100) * SOLO_RACE_TIER_MULTIPLIERS[car.tier];
}
```

При победе начисляется `bet × 2`, при поражении — списывается `bet`.

---

## 5. P2P Долги и Конфискация

Игроки могут брать займы друг у друга под залог автомобиля.

### Правила
1. **Минимальный залог**: стоимость машины ≥ 80% от суммы займа.
2. **Залог**: машина блокируется (`isLocked = true`) — нельзя продать или сдать.
3. **Погашение**: заёмщик выплачивает `totalToPay = amount + interest` в течение `turnsLeft` ходов.
4. **Конфискация**: при `turnsLeft = 0` сервер автоматически переводит машину кредитору.

---

## 6. Новости и События

Срабатывают каждые **5 ходов**. Хост (в мультиплеере) или клиент (в соло) выбирает случайную новость из `newsDatabase.ts` и рассылает через `sync_action → newsUpdate`. Влияют на `applyNewsEffects()` — цены при покупке и продаже.

---

## 7. Условие победы

- **Цель**: Набрать заданную сумму капитала (по умолчанию $500,000).
- **Проверка**: На сервере при каждой продаже — `newBalance >= room.winCondition`.
- **Завершение**: Сервер устанавливает `winnerId` в `RoomState` → клиенты получают `room_updated` → `syncRoomState` фиксирует победителя.
