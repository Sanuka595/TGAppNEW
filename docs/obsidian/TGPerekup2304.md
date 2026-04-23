Состояние проекта относительно Obsidian
1.
По документации roadmap предполагает, что Phase 1 уже закрыта и идёт Phase 2 (05_SERVER_BOT_DEVOPS.md#L580).
2.
Фактически серверный слой сейчас не реализован: в исходнике сервера одна строка-заглушка (index.ts:1).
3.
В client-store есть разбиение на слайсы (часть Phase 2 выполнена) (gameStore.ts:6), но ключевые действия всё ещё TODO (gameStore.ts:62, gameStore.ts:94, gameStore.ts:108).
4.
Shared-типизация и socket contracts в целом есть (types.ts:265, types.ts:294).
5.
В GAME_MAP нет клетки buy_business (известная проблема из docs) (types.ts:144).
6.
UI-навигация в client централизована через uiStore (хороший прогресс для текущего этапа UI) (uiStore.ts:45, App.tsx:39).
7.
Multi-stage Dockerfile присутствует (Dockerfile:1).
8.
strict включён на базе tsconfig (tsconfig.base.json:3).
9.
В repo не обнаружены тесты и CI workflow (.github/workflows отсутствует), что расходится с задачами Phase 2.
Вывод по стадии Проект сейчас ближе к раннему Phase 2 по client UI, но по server/gameplay backend фактически откат к pre-Phase 1 (из-за заглушки в packages/server/src).
Дорожная карта по приоритетам
1.
P0 (критично, 1-3 дня): восстановить серверный baseline
•
Вернуть рабочий packages/server/src (index + room manager + socket handlers) в source, не в dist.
•
Закрыть race-condition dice/turn и лимит игроков в исходниках.
•
Привести CORS к ALLOWED_ORIGINS.
•
Результат: multiplayer снова работоспособен из src, а не из артефактов сборки.
2.
P1 (высокий, 3-7 дней): замкнуть “играбельный вертикальный срез”
•
Реализовать минимум действий без TODO: createRoom/joinRoom/rollDice/passTurn, базовые buy/sell на клиенте или сервере по текущему контракту.
•
Добавить недостающую buy_business клетку и синхронизацию событий по карте.
•
Довести App до заявленной структуры оверлеев (Action/Room/Rules/Win), чтобы соответствовать 04_STATE_AND_COMPONENTS.md:183.
3.
P2 (высокий, 1-2 недели): инженерная стабилизация
•
Unit-тесты для бизнес-логики (цель docs: 15+).
•
GitHub Actions: lint + typecheck + test.
•
Rate limiting для Socket.IO.
•
Логгер pino вместо console.log.
•
Убрать расхождения src vs dist из git-потока (не хранить устаревшие build artifacts как источник истины).
4.
P3 (критично для прод, 2-4 недели): production hardening
•
Перенести финансовую логику на сервер (authoritative server).
•
Redis для rooms (TTL), server-side winner resolution.
•
Telegram initData HMAC verification.
•
E2E (Playwright), accessibility.
Рекомендуемый порядок старта прямо сейчас
1.
Зафиксировать реальный baseline: сервер из src должен быть рабочим.
2.
После этого закрыть TODO-ядро в gameStore и только затем расширять механики долгов/гонок.
3.
Параллельно включить CI, чтобы не возвращаться к скрытой деградации.