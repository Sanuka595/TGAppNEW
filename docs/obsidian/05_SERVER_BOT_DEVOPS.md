# Перекуп D6 — Полная техническая документация
## Файл 5 из 6: Сервер, Бот и DevOps

---

## 1. Сервер (Node.js + Socket.IO)

Серверная часть расположена в `packages/server`. Реализована на **Express** и **Socket.IO 4**.

### Ключевые модули

- **`index.ts`**: Точка входа. Запускает HTTP-сервер, Socket.IO и встроенного Telegram-бота. Содержит интервал для очистки неактивных комнат (каждые 10 минут).
- **`roomManager.ts`**: Ядро серверной логики. Управляет созданием комнат, авторитарными транзакциями (покупка/продажа/ремонт/гонки/долги) и валидацией состояний.
- **`socketHandlers.ts`**: Диспетчер сетевых событий. Принимает запросы от клиентов и вызывает соответствующие методы `roomManager`.

---

## 2. roomManager.ts — авторитарные транзакции

Все функции возвращают `TxResult` или `LoanResult` с явным `success: true/false`.

| Функция | Действие |
|---|---|
| `processBuyCar` | Покупка авто: списание баланса, перенос в гараж, удаление с рынка |
| `processSellCar` | Продажа: начисление баланса, проверка `isLocked` и `legal_block`, проверка победы |
| `processRepairCar` | Ремонт дефекта: списание, обновление `isRepaired` и `health` |
| `processRentCar` | Прокат: начисление `calculateRentIncome`, установка `isRented` |
| `processLoanOffer` | Размещение оффера на бирже |
| `processLoanAccept` | Принятие займа: перевод средств, блокировка залога |
| `processRepayDebt` | Погашение долга: перевод `totalToPay`, разблокировка машины |
| `processRaceInitiate` | Создание гонки, ограничение ставки 50% баланса |
| `processRaceResolve` | Авторитарный расчёт гонки: D6 + `TIER_RACE_BONUS` из `shared` |

### Типизация getBestCarTier
Функция `getBestCarTier` возвращает `CarTier` (не `string`), что позволяет безопасно индексировать `TIER_RACE_BONUS: Record<CarTier, number>`.

---

## 3. Shared-зависимости сервера

Сервер импортирует из `@tgperekup/shared`:

```typescript
import {
  calculateCurrentMarketValue,
  calculateSellPrice,
  calculateCarHealth,
  calculateRentIncome,
  TIER_RACE_BONUS,     // ← перенесено из локального файла в shared
} from '@tgperekup/shared';
```

`TIER_RACE_BONUS` — единственный источник бонусов для расчёта гонок. Клиент отображает те же числа, что сервер использует для расчётов.

---

## 4. Telegram Bot (node-telegram-bot-api)

Бот интегрирован непосредственно в серверный процесс для экономии ресурсов.

**Функции бота:**
- Обработка команды `/start`.
- Предоставление Inline-кнопок для запуска Mini App (`solo`, `multi`, `reset`).
- Генерация ссылок с `start_param` для входа в конкретные игровые комнаты.

---

## 5. DevOps и Деплой

### Инфраструктура
- **Docker**: Dockerfile выполняет сборку всех пакетов монорепозитория и запускает сервер.
- **Railway.app**: Автоматическая сборка при пуше в ветку `main`.
- **Healthcheck**: Эндпоинт `/health` возвращает статус сервера и количество активных комнат.

### Переменные окружения
- `TELEGRAM_BOT_TOKEN`: Токен от @BotFather.
- `WEBAPP_URL`: Публичный URL приложения (нужен боту для генерации кнопок).
- `ALLOWED_ORIGINS`: Список разрешенных доменов для CORS.

---

## 6. Безопасность и Валидация

- **Authoritative Server**: Клиент никогда не диктует свой баланс. Все денежные операции проходят через `roomManager`.
- **Фильтрация Dev-команд**: В `socketHandlers.ts` заблокирована ретрансляция отладочных команд (`devAddMoney`, `devTeleport`) в мультиплеере.
- **Cleanup**: Сервер автоматически удаляет комнаты без активности более 30 минут (`ROOM_STALE_MS = 30 * 60 * 1000`).

---

## 7. Известные проблемы и Технический долг

- **In-memory Storage**: Комнаты хранятся в оперативной памяти. При перезагрузке сервера игровые сессии прерываются — планируется переход на Redis (см. Roadmap).
- **Full State Sync**: Механика `request_full_state` при реконнекте ещё не реализована. Текущий workaround — событие `connect` автоматически делает `joinRoom` заново.
- **Init Data Validation**: Требуется проверка HMAC-подписи Telegram Init Data для предотвращения подделки `playerId`.
