# Перекуп D6 — Полная техническая документация
## Файл 3 из 5: Игровые Механики и Экономика

---

## 1. Карта: 12 клеток по кругу

Игровое поле — кольцо из 12 клеток. Перемещение: `newPosition = (currentPosition + steps) % 12`.

| ID | Название | Тип | Что происходит |
|---|---|---|---|
| 0 | Чапаевка 💰 | `sale` | Продажа авто из гаража. Покупка энергии за $500 |
| 1 | Вёдра 🪣 | `buy_bucket` | 3 лота Bucket (1 гарантированный дефект) |
| 2 | Автосервис 🛠️ | `repair` | Ремонт дефектов, диагностика скрытых |
| 3 | Гонка 🏎️ | `race` | Заезд со ставкой ≤ 50% банка соперника |
| 4 | Автоподбор 🚗 | `buy_random` | 3 лота случайного класса |
| 5 | Битьё 🔨 | `buy_scrap` | 3 лота Scrap (2–4 дефекта) |
| 6 | Чапаевка 💰 | `sale` | Вторая точка продажи |
| 7 | Премиум ⭐ | `buy_premium` | 2 лота Premium (1 скрытый дефект) |
| 8 | Автосервис Пехота 🛠️ | `special_repair` | Спец сервис: скидка 5% на ремонт |
| 9 | Гонка 🏎️ | `race` | Вторая гонка |
| 10 | Прокат 🚗 | `rent` | Сдача авто: Scrap=$500, Premium/Rarity=$1000, прочие=$200 |
| 11 | Ретро 🏎️ | `buy_retro` | 1 лот Rarity, стоимость ремонта зависит от кубика |

---

## 2. Система хода и Энергия

### Обычный ход (Бросок D6)
- Бросок кубика: случайное число 1–6
- Перемещение: `newPosition = (position + diceValue) % 12`
- Восстановление энергии: каждые **2 обычных броска** → +1 энергия (до макс. 3)
- Реализация: счётчик `energyRegenCounter` в Player

### Тактический ход (Энергия)
- Стоимость: 1 единица энергии
- Доступные шаги: +1, +2, или +3 клетки
- Ограничение: нельзя использовать если `hasRolledThisTurn = true`
- В мультиплеере: транслируется через `sync_action { action: 'manualMove', payload: { steps, newPosition } }`
- Кубик при тактическом ходе: `diceValue = 0` (специальный маркер)

### Покупка энергии
- Клетка: `sale` (Чапаевка)
- Цена: **$500** за 1 единицу
- Лимит: нельзя купить если `energy >= 3`

### Параметры энергии
| Параметр | Значение |
|---|---|
| Начальное | 3 |
| Максимум | 3 |
| Стоимость покупки | $500 |
| Восстановление | +1 каждые 2 броска D6 |

---

## 3. Классы автомобилей

| Класс | Тир | Цена базы | Дефекты при генерации | Налог/ход | Маржа продажи | Ремонт |
|---|---|---|---|---|---|---|
| Вёдра | `Bucket` | $800–$2,000 | 1 (Light/Medium) | $20 | ×1.10 | обычный |
| Битьё | `Scrap` | $3,000–$9,000 | 2–4 (любые) | $50 | ×1.20 | обычный |
| Бизнес | `Business` | $12,000–$22,000 | 1–2 (Medium+) | $100 | ×1.15 | обычный |
| Премиум | `Premium` | $25,000–$60,000 | 0–1 (1 скрытый) | $150 | ×1.15 | **×2** |
| Ретро | `Rarity` | $40,000–$150,000 | 2 (скрытые) | $300 | ×2–×4 (детерм.) | **×2**, особый |

### База автомобилей (30+ моделей)

```typescript
// src/domain/carDatabase.ts
export const CAR_MODELS_DB = [
  // --- BUCKET ($800–$2,000) ---
  { name: 'Lada 2109',          tier: 'Bucket',  basePriceObj: [800,  1200] },
  { name: 'Daewoo Lanos',       tier: 'Bucket',  basePriceObj: [900,  1400] },
  { name: 'VW Golf Mk3',        tier: 'Bucket',  basePriceObj: [700,  1500] },
  { name: 'Opel Astra G',       tier: 'Bucket',  basePriceObj: [600,  1300] },
  { name: 'Ford Mondeo Mk2',    tier: 'Bucket',  basePriceObj: [700,  1600] },
  { name: 'BMW 3 Series E36',   tier: 'Bucket',  basePriceObj: [1000, 2000] },
  { name: 'Audi A4 B5',         tier: 'Bucket',  basePriceObj: [800,  1800] },

  // --- SCRAP ($3,000–$9,000) ---
  { name: 'BMW 5 Series E60',   tier: 'Scrap',   basePriceObj: [5000, 9000] },
  { name: 'Toyota Camry V40',   tier: 'Scrap',   basePriceObj: [4000, 8000] },
  { name: 'Audi A4 B8',         tier: 'Scrap',   basePriceObj: [4500, 8500] },
  { name: 'Skoda Octavia III',  tier: 'Scrap',   basePriceObj: [3000, 6000] },
  { name: 'VW Passat B7',       tier: 'Scrap',   basePriceObj: [3500, 7000] },
  { name: 'Mercedes E-Class W212', tier: 'Scrap', basePriceObj: [4000, 8000] },
  { name: 'Mitsubishi Lancer X', tier: 'Scrap',  basePriceObj: [3000, 6500] },

  // --- BUSINESS ($12,000–$22,000) ---
  { name: 'Toyota Camry V50',   tier: 'Business', basePriceObj: [13000, 18000] },
  { name: 'BMW 5 Series F10',   tier: 'Business', basePriceObj: [15000, 22000] },
  { name: 'Mazda 6 GJ',         tier: 'Business', basePriceObj: [12000, 16000] },
  { name: 'Mercedes E-Class W212 Restyling', tier: 'Business', basePriceObj: [16000, 22000] },
  { name: 'Skoda Superb II',    tier: 'Business', basePriceObj: [12000, 17000] },
  { name: 'Audi A6 C7',         tier: 'Business', basePriceObj: [14000, 20000] },

  // --- PREMIUM ($25,000–$60,000) ---
  { name: 'Porsche Cayenne 958', tier: 'Premium', basePriceObj: [30000, 50000] },
  { name: 'Mercedes S-Class W222', tier: 'Premium', basePriceObj: [35000, 55000] },
  { name: 'BMW M5 F10',         tier: 'Premium', basePriceObj: [28000, 45000] },
  { name: 'Range Rover Autobiography', tier: 'Premium', basePriceObj: [35000, 60000] },
  { name: 'Mercedes G-Class W463', tier: 'Premium', basePriceObj: [40000, 60000] },

  // --- RARITY ($40,000–$150,000) ---
  { name: 'Toyota Supra MK4',   tier: 'Rarity',  basePriceObj: [55000, 90000] },
  { name: 'Nissan Skyline GT-R R34', tier: 'Rarity', basePriceObj: [80000, 130000] },
  { name: 'BMW M3 E46',         tier: 'Rarity',  basePriceObj: [30000, 55000] },
  { name: 'Ferrari Testarossa', tier: 'Rarity',  basePriceObj: [100000, 145000] },
  { name: 'Mercedes 190E Evo II', tier: 'Rarity', basePriceObj: [90000, 130000] },
  { name: 'Porsche 911 (993)',   tier: 'Rarity',  basePriceObj: [65000, 110000] },
  { name: 'BMW M3 E30',         tier: 'Rarity',  basePriceObj: [40000, 70000] },
];
```

---

## 4. Дефекты

### Уровни серьёзности

| Уровень | Диапазон цены ремонта | Штраф Health | Описание |
|---|---|---|---|
| Light 🟢 | $50–$200 | −10% | Мелкие проблемы |
| Medium 🟡 | $200–$800 | −25% | Средний ремонт |
| Serious 🟠 | $800–$3,000 | −45% | Серьёзные поломки |
| Critical 🔴 | $3,000–$10,000 | −80% | Капремонт |

> ⚠️ Для классов `Premium` и `Rarity` стоимость ремонта **умножается на 2**.

### База дефектов (20+ позиций)

```typescript
// src/domain/defectDatabase.ts
export const DEFECTS_DB: DefectType[] = [
  // ENGINE
  { id: 'eng_1',  name: 'Задиры в цилиндрах',    category: 'Engine',      severity: 'Critical' },
  { id: 'eng_2',  name: 'Масложор',               category: 'Engine',      severity: 'Medium'   },
  { id: 'eng_3',  name: 'Пробита прокладка ГБЦ',  category: 'Engine',      severity: 'Critical' },
  { id: 'eng_4',  name: 'Убитая турбина',          category: 'Engine',      severity: 'Serious'  },
  { id: 'eng_5',  name: 'Троит двигатель',         category: 'Engine',      severity: 'Medium'   },

  // ELECTRICAL
  { id: 'elec_1', name: 'Умер блок управления (ECU)', category: 'Electrical', severity: 'Critical' },
  { id: 'elec_2', name: 'Глюки проводки',          category: 'Electrical', severity: 'Medium'   },
  { id: 'elec_3', name: 'Не работает приборка',    category: 'Electrical', severity: 'Medium'   },
  { id: 'elec_4', name: 'Севший аккумулятор',      category: 'Electrical', severity: 'Light'    },
  { id: 'elec_5', name: 'Проблемы с генератором',  category: 'Electrical', severity: 'Serious'  },

  // SUSPENSION
  { id: 'susp_1', name: 'Убитая подвеска',         category: 'Suspension', severity: 'Serious'  },
  { id: 'susp_2', name: 'Стучит рулевая рейка',    category: 'Suspension', severity: 'Critical' },
  { id: 'susp_3', name: 'Кривые диски',            category: 'Suspension', severity: 'Medium'   },
  { id: 'susp_4', name: 'Изношены тормоза',        category: 'Suspension', severity: 'Light'    },
  { id: 'susp_5', name: 'Люфт ступицы',            category: 'Suspension', severity: 'Serious'  },

  // BODY
  { id: 'body_1', name: 'Ржавчина',                category: 'Body',       severity: 'Serious'  },
  { id: 'body_2', name: 'Крашена в круг',          category: 'Body',       severity: 'Medium'   },
  { id: 'body_3', name: 'Сильная вмятина',         category: 'Body',       severity: 'Medium'   },
  { id: 'body_4', name: 'Нарушена геометрия',      category: 'Body',       severity: 'Critical' },
  { id: 'body_5', name: 'Разбитые фары',           category: 'Body',       severity: 'Light'    },

  // SPECIAL
  {
    id: 'legal_block',
    name: 'Запрет на регистрационные действия',
    category: 'Body',      // Условная категория
    severity: 'Critical',
    preventsSale: true,    // ← Блокирует продажу на Чапаевке!
    // Стоимость исправления: всегда $2,000 (фиксированная в generateRepairCost)
  },
];
```

### Генерация дефектов по классу

| Класс | Количество | Скрытые? |
|---|---|---|
| Bucket | 1 (Light или Medium) | Нет |
| Scrap | 2–4 (любые) | Нет |
| Business | 1–2 (Medium+) | Нет |
| Premium | 0–1 | **Да** (isHidden: true) |
| Rarity | 2 | **Да** (isHidden: true) |

---

## 5. Бизнес-логика (businessLogic.ts)

### Ключевые константы

```typescript
const SEVERITY_COST_RANGES: Record<SeverityLevel, [number, number]> = {
  Light:    [50,   200],
  Medium:   [200,  800],
  Serious:  [800,  3000],
  Critical: [3000, 10000],
};

const HEALTH_PENALTIES: Record<SeverityLevel, number> = {
  Light:    10,
  Medium:   25,
  Serious:  45,
  Critical: 80,
};

const OWNERSHIP_TAX_RATES: Record<CarTier, number> = {
  Bucket:   20,
  Scrap:    50,
  Business: 100,
  Premium:  150,
  Rarity:   300,
};

const PROFIT_MARGINS: Record<CarTier, number> = {
  Bucket:   1.10,
  Scrap:    1.20,
  Business: 1.15,
  Premium:  1.15,
  Rarity:   1.0,  // у Rarity особая логика (×2–×4)
};
```

### Функция: Цена покупки на рынке

```
calculateCurrentMarketValue(car, activeNews?) → Decimal

Формула:
  1. value = basePrice
  2. Применяем новости: value = applyNewsEffects(value, car, activeNews)
  3. Для каждого НЕотремонтированного дефекта:
     value -= defect.repairCost × 1.2  (штраф 120% = риск для покупателя)
  4. value = max(100, value)  ← минимум $100 (металлолом)
```

### Функция: Цена продажи

```
calculateSellPrice(car, activeNews?) → Decimal

Формула:
  1. Проверка legal_block: если есть → вернуть Decimal(0), продажа запрещена
  2. value = basePrice
  3. Применяем новости
  4. Для каждого НЕотремонтированного дефекта:
     value -= defect.repairCost  (без штрафа, честная цена)
  5. Применяем маржу класса:
     - Bucket/Scrap/Business/Premium: value × PROFIT_MARGINS[tier]
     - Rarity: value × deterministicMultiplier(car.id, 2, 4)
       (детерминировано от ID машины — мультипликатор всегда одинаков для конкретной машины)
  6. Бонус Rarity: +$5,000 если health=100 и всего ≤2 дефекта (все отремонтированы)
  7. value = max(100, value)
```

> **Детерминированный множитель для Rarity** — это важно для честной игры: игрок может рассчитать прибыль заранее, одна и та же машина всегда продаётся с одним множителем.

### Функция: Стоимость ремонта

```
generateRepairCost(severity, tier) → Decimal

Формула:
  cost = randomInt(SEVERITY_COST_RANGES[severity])
  если tier === 'Premium' или 'Rarity': cost × 2
  если defect.id === 'legal_block': всегда $2,000
```

### Функция: Налог за владение

```
calculateOwnershipTax(garage) → Decimal

Формула:
  Сумма OWNERSHIP_TAX_RATES[car.tier] для всех машин в гараже
```

> Налог списывается при **каждом броске кубика** (в `handleDiceRollResult`).

### Функция: Расчёт Health

```
calculateCarHealth(defects) → number (0–100)

Формула:
  health = 100
  для каждого НЕотремонтированного дефекта:
    health -= HEALTH_PENALTIES[defect.severity]
  return max(0, health)
```

### Функция: Применение новостей

```
applyNewsEffects(price, car, activeNews) → Decimal

Формула:
  multiplier = 1
  если activeNews.effects.tierMultipliers[car.tier]: multiplier × это значение
  если activeNews.effects.modelMultipliers[car.name]: multiplier × это значение
  return price × multiplier
```

---

## 6. Особая механика: Ретро-клетка

При попадании на клетку `buy_retro` (id=11) вызывается `playRetroMinigame(diceRoll)`:

| Кубик | Множитель ремонта | Смысл |
|---|---|---|
| 1–2 | 5% от basePrice | Повезло — дешёвый ремонт |
| 3–4 | 15% от basePrice | Средний риск |
| 5–6 | 30% от basePrice | Дорогой ремонт |

Генерируется 1 лот Rarity, все дефекты получают `repairCost = basePrice × multiplier`.

---

## 7. Механика Гонки

### Правила
- Инициатор гонки получает **+1 к броску кубика**
- Ставка ≤ **50% банка** соперника
- Ставка списывается сразу при инициализации
- Любой игрок может **присоединиться** к открытому заезду

### Формула выплаты
```
totalPot = ставка × количество участников + ставка × 0.5 (бонус банка)
rewardPerWinner = totalPot / количество победителей
```

### Solo гонка (vs бот)
- Бот: случайный бросок 1–6
- Игрок: случайный бросок 1–6 **+1** (бонус инициатора)
- При победе: ставка × 2.5 (своя ставка + ставка бота + 50% бонус)
- При поражении: теряет ставку
- При ничьей: ставка возвращается

---

## 8. Механика Проката

Клетка `rent` (id=10). Каждую машину можно сдать **только раз за ход** (`car.isRented`).

| Класс | Доход от проката |
|---|---|
| Bucket, Business | $200 |
| Scrap | $500 |
| Premium, Rarity | $1,000 |

---

## 9. Механика P2P Долгов

### Создание оффера
- Кредитор указывает: сумму, процент, срок (в ходах)
- `totalToPay = amount × (1 + interest/100)`
- Оффер публикуется в «Бирже займов» (вкладка Контракты)

### Принятие оффера
- Заёмщик выбирает авто в качестве залога
- Проверка: `loanAmount ≤ 80% от sellPrice(car)` (функция `isLoanValid`)
- Машина получает флаг `isLocked = true`
- Заёмщик получает деньги на баланс

### Погашение долга
- Заёмщик оплачивает `totalToPay`
- Машина разблокируется (`isLocked = false`)
- Долг удаляется из `activeDebts`

### Конфискация (при просрочке)
- `turnsLeft` уменьшается при каждом броске заёмщика
- При `turnsLeft = 0` → статус меняется на `'confiscated'`
- Машина удаляется из гаража заёмщика
- Кредитор получает машину (полный объект `Car` должен быть в payload!)

> ⚠️ **Известная проблема (Phase 2):** При конфискации кредитор не получает машину — это заглушка. Нужно передавать полный объект `Car` в payload события `confiscateCar`.

---

## 10. Новости рынка

Срабатывают каждые **10 ходов** (суммарных в комнате). Хост инициирует выбор события.

```typescript
const NEWS_POOL: GameNews[] = [
  {
    id: 'news_1',
    title: 'Бум на бизнес-класс!',
    description: 'Инвесторы скупают Camry и BMW. Цены на Business выросли на 25%!',
    effects: { tierMultipliers: { Business: 1.25 }, modelMultipliers: {} }
  },
  {
    id: 'news_2',
    title: 'Кризис запчастей',
    description: 'Ремонт «вёдер» и «битья» стал невыгоден. Цены упали на 15%.',
    effects: { tierMultipliers: { Bucket: 0.85, Scrap: 0.85 }, modelMultipliers: {} }
  },
  {
    id: 'news_3',
    title: 'Аукционный ажиотаж',
    description: 'Коллекционеры ищут Ferrari! Testarossa взлетела в цене.',
    effects: { tierMultipliers: {}, modelMultipliers: { 'Ferrari Testarossa': 1.4 } }
  },
  {
    id: 'news_4',
    title: 'Топливный кризис',
    description: 'Все пересаживаются на малолитражки. Цены на Премиум упали на 20%.',
    effects: { tierMultipliers: { Premium: 0.8 }, modelMultipliers: {} }
  },
  // Добавить ещё события...
  {
    id: 'news_5',
    title: 'Форсаж в кино',
    description: 'Все японские авто в цене! Skyline и Supra продаются с наценкой.',
    effects: {
      tierMultipliers: {},
      modelMultipliers: {
        'Nissan Skyline GT-R R34': 1.5,
        'Toyota Supra MK4': 1.5,
      }
    }
  },
];
```

---

## 11. Соло-режим

### Стартовые условия
- Баланс: **$2,000** (стартовый займ)
- Долг (soloDebt): **$2,000** под 10% каждые 10 ходов
- Win condition: $1,000,000

### Бот «Перекуп Боря»
- Каждые **3 хода** бот «перехватывает» самый выгодный лот с рынка
- Логика: `findMostProfitableCar(market, activeNews)` → удаляет машину из рынка
- Отображается в логе: `🤖 Перекуп Боря перехватил лот: [название]`

### Рост долга
- Каждые **10 ходов**: `soloDebt × 1.1` (сложные проценты)
- Отображается в логе как предупреждение

### Квесты
- Каждые **15 ходов** генерируется срочный квест
- Условие: иметь конкретную модель с Health ≥ 90% в течение 15 ходов
- Награда: $15,000
- Провал: квест закрывается, авто купил другой перекуп

### Условия победы/поражения
- **Победа:** `balance >= winCondition`
- **Банкротство:** `balance < 0` И `garage.length === 0`

---

## 12. Win Condition (мультиплеер)

- По умолчанию: $500,000 (настраивается хостом при создании комнаты)
- Варианты: $500k / $1,000,000
- **Победитель определяется сервером** (Phase 3), сейчас — клиентом при `sellCar`
- При победе: `winnerId` устанавливается, рассылается `sync_action { action: 'victory' }`

---

## 13. Диагностика (Автосервис)

На клетках `repair` и `special_repair` доступна диагностика:
- Стоимость: **$200**
- Эффект: все скрытые дефекты (`isHidden: true`) становятся видимыми (`isHidden: false`)
- После диагностики можно ремонтировать скрытые дефекты

На `special_repair`: скидка **5%** на стоимость ремонта (`isDiscounted = true`).
