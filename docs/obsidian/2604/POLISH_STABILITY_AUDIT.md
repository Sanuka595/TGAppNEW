# Polish & Stability Audit — 26.04

## Статус: ✅ Все найденные хвосты закрыты

---

## 🔴 Критические баги (исправлено)

### 1. `rollDice` — сломан multiplayer (gameStore.ts)
**Симптом:** 35+ TS-ошибок начиная со строки 298. `socket.emit('dice_roll')` никогда не достигался.  
**Причина:** Лишние `}` и `return; // No room, not solo mode` закрывали тело функции на строке 295, весь мультиплеерный блок (строки 297–309) оказывался вне функции — на уровне объекта-литерала стора → синтаксическая ошибка для TS.  
**Фикс:** Удалены orphaned `return` и закрывающий `}`, мультиплеерный блок восстановлен.

### 2. `manualMove` — не триггерит действие клетки (gameStore.ts)
**Симптом:** После тактического прыжка рынок не пополнялся, ActionModal не открывался.  
**Причина:** `manualMove` обновлял `player.position`, но не вызывал `executeCellAction(cell)` и не устанавливал `currentEvent`.  
**Фикс:** После `set(...)` добавлены `set({ currentEvent: cell })` внутри апдейта и вызов `get().executeCellAction(cell)`.

---

## 🟠 Высокоприоритетные (исправлено)

### 3. `executeCellAction` — пропущен `buy_business`, типы `any[]` (gameStore.ts)
- Добавлен `case 'buy_business'` (3 авто класса Business)
- `any[]` заменён на `Car[]` и `CarTier[]`
- `const pick = ...` типизирован как `(): CarTier`

### 4. `handleRemoteAction` — debug-спам в user-log (gameStore.ts)
- Удалена строка `addLog('[REMOTE ACTION] Player ${data.playerId} performed ${data.action}', 'info')`

### 5. `repairCar` — float в `Decimal.mul` (gameStore.ts)
- `cost.mul(0.95)` → `cost.mul('0.95')`

### 6. `GarageView` — неверный P&L без `activeEvent` (GarageView.tsx)
- `calculateSellPrice(car)` → `calculateSellPrice(car, activeEvent)`
- Слит дублирующийся импорт из `@tgperekup/shared`

---

## 🟡 Средний приоритет (исправлено)

### 7. Haptics — отсутствовали на всех ключевых взаимодействиях
| Действие | Файл | Тип |
|----------|------|-----|
| Бросок кубика | DiceArea.tsx | `impact, heavy` |
| Завершение хода | DiceArea.tsx | `impact, light` |
| Тактический прыжок | RadialBoard.tsx | `impact, medium` |
| Покупка авто | MarketView.tsx | `notification, success` |
| Ремонт дефекта | ActionModal.tsx | `notification, success` |
| Диагностика | ActionModal.tsx | `impact, light` |
| Сдача в прокат | ActionModal.tsx | `notification, success` |
| Смена темы | TopBar.tsx | `selection` |

### 8. `ActionModal` — `const` в `switch` без блоков `{}`
- Кейсы `repair/special_repair` и `rent` обёрнуты в `{ }`
- Удалён неиспользуемый импорт `AlertCircle`

### 9. Тема не персистировалась (uiStore.ts)
- Добавлен `persist` middleware с `partialize: (s) => ({ theme: s.theme })`
- Ключ хранилища: `perekup-ui-storage` в localStorage

### 10. Light-тема — glass-компоненты (index.css)
- `body.light` → `--glass-bg: rgba(255,255,255,0.65)` (непрозрачнее)
- `body.light .glass-panel` → более мягкая тень `rgba(0,0,0,0.08)`
- `body.light .glass-button` → цвет переключён на `neon-blue`, контрастная рамка

---

## 🟢 Низкий приоритет (исправлено)

### 11. Orphaned `console.log` / `console.debug`
| Файл | Строка |
|------|--------|
| `MultiplayerModal.tsx` | `console.log('[MultiplayerModal] isOpen:', ...)` |
| `tmaProvider.ts` | `console.debug('Haptic feedback not supported...')` |
| `tmaProvider.ts` | `console.debug('enableVerticalSwipes not supported')` |

### 12. `DIAGNOSTICS_COST` — магическая константа
- `200` вынесено в `const DIAGNOSTICS_COST = 200` в начале `gameStore.ts`

### 13. `tmaProvider.ts` — `@ts-ignore` → корректный тип
- Заменён на `const wa = WebApp as typeof WebApp & { enableVerticalSwipes?: () => void }`

---

## Что НЕ входит в этот sweep (Phase 3)

- Полный light-тему для всех компонентов (требует системного рефакторинга Tailwind-классов)
- `processBotTurn` — бот-логика соло-режима
- Механика `race` и `fines` в `executeCellAction`
- Механика долгов (`Debt`) в `handleRemoteAction`

---

## Результат build

```
✓ 2277 modules transformed
dist/assets/index.css   59.44 kB │ gzip: 9.39 kB
dist/assets/index.js   544.20 kB │ gzip: 168.34 kB
✓ built in 2.73s
```

TypeScript: **0 ошибок** после всех правок.
