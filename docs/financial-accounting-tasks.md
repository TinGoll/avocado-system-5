# Финансовый учет: задачи реализации для AI-агента

Дата: 22 сентября 2026. Статус: архитектура и продуктовые решения согласованы; задачи готовы к последовательной реализации.

Основа: [архитектура финансового учета](financial-accounting-architecture.md). Документ рассчитан на выполнение задач отдельными сессиями AI-агента. Каждая задача должна завершаться рабочим, проверяемым состоянием репозитория и передачей фактических контрактов следующей задаче.

## Как работать с этим документом

Для каждой сессии агенту нужно передавать одну задачу, например: «Выполни только FA-01 из `docs/financial-accounting-tasks.md`». Агент обязан:

1. Прочитать `AGENTS.md`, архитектуру, текущую задачу и результаты всех ее зависимостей.
2. Перед изменениями проверить актуальный код и `git status`; не считать ориентировочные имена файлов и контрактов уже реализованными.
3. Сделать минимальный локальный патч только в границах задачи. Не начинать следующую задачу и не выполнять попутный рефакторинг.
4. Добавить проверки измененного поведения и выполнить команды из задачи в объеме, доступном в среде.
5. Не исправлять несвязанные предупреждения и не использовать команды lint, которые переписывают весь репозиторий.
6. В конце задачи дописать раздел `Результат FA-XX` прямо под задачей: фактические файлы, таблицы, DTO, endpoints, отклонения от плана, команды и результаты проверок, известные ограничения.
7. Не создавать commit и не переходить к следующей задаче, если это прямо не попросил пользователь.

Если архитектура и реальный код расходятся, агент не должен молча расширять объем. Безопасное локальное уточнение фиксируется в результате задачи; продуктовый конфликт или изменение согласованных правил выносится пользователю до реализации.

## Зафиксированные продуктовые решения

- Единица финансового учета заказа — `OrderGroup`; вложенный `Order` остается документом заказа.
- Начисление по заказу проводится явной командой после расчета.
- Валюта MVP — RUB; суммы нового финансового домена хранятся в целых копейках.
- Способы оплаты: `cash`, `card`, `bank_transfer`, `other`.
- Переплата отдельного начисления запрещена; остаток оплаты остается общим нераспределенным авансом заказчика.
- Отмена или завершение заказа не меняет финансовые записи автоматически.
- Проведенные суммы исправляются корректировкой или аннулированием, а не редактированием.
- Первый формат экспорта — XLSX; PDF не входит в MVP.
- Пользователей и ролей пока нет; не добавлять фиктивный `actorId`.

## Общие архитектурные ограничения

- Сервер: NestJS 11, TypeORM, PostgreSQL и SQLite. Каждому изменению схемы нужны эквивалентные миграции для обеих БД. Не включать `synchronize`.
- Многострочные финансовые команды выполняются через [runDatabaseTransaction](../server/src/modules/database/database-transaction.ts). Для PostgreSQL нужны блокировки изменяемых агрегатов; для SQLite используется существующая сериализация транзакций.
- Входные данные проверяются DTO и бизнес-валидацией. Клиентские `total`, `allocated`, `balance`, `orderTotal` не являются доверенными.
- Финансовые строки не удаляются физически через публичный API. Коррекции и освобождения должны оставлять историю.
- Новый финансовый модуль не должен создавать циклическую зависимость с `OrdersModule` или `OrderGroupsModule`.
- Клиент следует FSD: `app → pages → widgets → features → entities → shared`, использует public API `index.ts` и не допускает импортов между feature-срезами.
- Клиентская реализация начинается в `pages/finance`: page-specific SWR hooks и композиция остаются там, а чистые HTTP/CRUD-функции размещаются в `shared/api`. `entities/finance` и переиспользуемые features извлекаются только когда второй потребитель реально появляется в FA-09.
- Серверные данные остаются в SWR. Zustand не дублирует списки оплат, начислений и отчетов.
- Статические стили — Emotion. Inline `style` используется только для вычисляемых во время выполнения значений.
- Новые runtime-зависимости для MVP не ожидаются. Денежная точность реализуется целыми копейками, XLSX — установленным `@protobi/exceljs`.
- Не добавлять расходы, возвраты, поставщиков, мультивалютность, НДС, банковский импорт, автоматическое распределение, роли или уведомления.

## Порядок и зависимости

Задачи выполняются по номерам. FA-03 и FA-04 технически могут разрабатываться после FA-02 независимо, но для последовательной работы AI-агента рекомендуется не менять порядок.

| Задача | Результат | Зависит от |
| --- | --- | --- |
| [FA-01](#fa-01) | Надежная связь `OrderGroup → Customer` | — |
| [FA-02](#fa-02) | Финансовая схема, сущности и денежные примитивы | FA-01 |
| [FA-03](#fa-03) | Команды и API начислений | FA-02 |
| [FA-04](#fa-04) | Команды и API оплат | FA-02 |
| [FA-05](#fa-05) | Транзакционное распределение оплат | FA-03, FA-04 |
| [FA-06](#fa-06) | Read API, сводки, поиск и пагинация | FA-03, FA-05 |
| [FA-07](#fa-07) | Read-only раздел `/finance` | FA-06 |
| [FA-08](#fa-08) | Формы финансовых операций и распределения | FA-07 |
| [FA-09](#fa-09) | Финансовый блок заказа и FSD-извлечение | FA-08 |
| [FA-10](#fa-10) | Отчеты и XLSX-экспорт | FA-06, FA-08 |
| [FA-11](#fa-11) | Сквозная приемка PostgreSQL, SQLite, web и desktop | FA-09, FA-10 |

## Общие критерии готовности

Каждая задача включает тесты своего поведения; проверки нельзя откладывать целиком на FA-11.

- Существующие сценарии заказов, расчета цены, производства и клиентов не должны регрессировать.
- Ошибки API сохраняют формат [AllExceptionsFilter](../server/src/common/filters/all-exceptions.filter.ts), списки с `items` не должны повторно оборачиваться [WrapItemsInterceptor](../server/src/common/interceptors/wrap-items.interceptor.ts).
- Серверные unit-тесты именуются `*.spec.ts`; миграционные и e2e-проверки используют существующие соглашения `server/test` и database specs.
- Для сервера запускать релевантный Jest с coverage, `npm run build` и ESLint без `--fix` только по измененным файлам. Находясь в `server/`, не использовать `npm run lint` как проверку: этот скрипт изменяет файлы.
- Для клиента запускать релевантный Vitest с coverage, `npm run build`, `npm run fsd:check` и ESLint без `--fix` по измененным файлам.
- Изменения схемы проверяются на PostgreSQL и SQLite. Если реальная PostgreSQL недоступна, это явно фиксируется как непроверенная часть, а задача не объявляется полностью проверенной на обеих БД.
- UI-задачи включают loading/error/empty, клавиатуру, доступные подписи, узкую ширину и визуальную проверку фактического экрана. Для видимых изменений приложить скриншот, если среда это позволяет.
- После команды с `requestId` сетевой повтор не создает вторую денежную операцию.
- После ошибки внутри транзакции не остается частично примененных сумм, версий или распределений.
- Не коммитить `.env`, базы данных, выгруженные отчеты и другие локальные артефакты.

<a id="fa-01"></a>
## FA-01. Надежная связь заказа с заказчиком

**Цель:** заменить JSON-снимок как источник идентичности заказчика на явную ссылку `OrderGroup.customerId`, сохранив снимок для исторического отображения.

**Контекст:** архитектура, разделы 2 и 6. Основные точки входа: [OrderGroup](../server/src/modules/order-groups/entities/order-group.entity.ts), [CreateOrderGroupDto](../server/src/modules/order-groups/dto/create-order-group.dto.ts), [OrderGroupsService](../server/src/modules/order-groups/order-groups.service.ts), [Customer](../server/src/modules/customers/entities/customer.entity.ts), [CustomersService](../server/src/modules/customers/customers.service.ts), [форма создания заказа](../client/src/features/create-order/ui/CreateOrderForm.tsx), [клиентская модель заказов](../client/src/shared/lib/swr/models.ts).

**Реализовать:**

- Добавить в `order_groups` nullable `customerId` UUID, индекс и FK `customers.id` с `ON DELETE RESTRICT`. Сохранить JSON `customer` как снимок.
- Создать парные аддитивные миграции PostgreSQL/SQLite. Backfill выполнять только по валидному `customer.id` из JSON, который точно существует в `customers`; не сопоставлять по имени, телефону или email.
- Обновить create/update контракты заказа: клиент передает `customerId`, сервер загружает заказчика и формирует разрешенный JSON-снимок самостоятельно. Не доверять произвольному объекту `customer` из запроса.
- Сохранить возможность заказа без заказчика там, где она есть сейчас; финансовые команды позднее будут отдельно запрещать проведение такого заказа.
- Добавить read-only диагностику старых заказов без корректной связи. Предпочтительный endpoint: `GET /api/order-groups/customer-link-issues`; маршрут должен находиться до динамического `:id`.
- Запретить физическое удаление заказчика, если на него ссылается `OrderGroup`. Вернуть понятный `409`, а не необработанную ошибку FK.
- Обновить клиентское создание заказа и типы ответа так, чтобы передавался ID, а snapshot оставался только ответным полем.
- Не добавлять финансовые таблицы, страницы или начисления.

**Инварианты и пограничные случаи:**

- Смена заказчика обновляет `customerId` и снимок атомарно.
- `customerId = null` очищает связь и снимок только если это разрешено текущим сценарием обновления.
- Несуществующий UUID дает `404`/`400` по принятому контракту, но не создает заказ с битой ссылкой.
- Старый заказ с невалидным JSON переживает миграцию и появляется в диагностике.
- Поиск заказов по сохраненному снимку продолжает работать.

**Тесты и проверка:**

- Unit-тесты create/update/delete и снимка заказчика.
- Миграционный тест SQLite с валидным, отсутствующим и поврежденным `customer.id`; сохранность документов и цен; `foreign_key_check`.
- Проверка эквивалентной PostgreSQL-миграции на доступной тестовой БД.
- Client-тест создания заказа: в запрос уходит `customerId`, а не объект.
- Из `server/`: релевантный `npm run test:cov -- --runInBand ...`, `npm run test:e2e:sqlite`, `npm run build`.
- Из `client/`: релевантный `npm run coverage -- ...`, `npm run build`, `npm run fsd:check`.

**Приемка:** новый заказ получает надежный FK и снимок; старые однозначные связи восстановлены; неоднозначные не угаданы; связанного заказчика нельзя удалить; текущий UI создания заказа работает.

**Передать дальше:** точные имена поля/relation, DTO создания и обновления, формат диагностического ответа, имена миграций и политика очистки заказчика.

### Результат FA-01

Реализована надежная nullable-связь заказа с заказчиком без добавления
финансового домена.

- Поле и relation: `OrderGroup.customerId: string | null`, индекс
  `IDX_order_groups_customer`, relation `customerRecord`, FK
  `FK_order_groups_customer` на `customers.id` с `ON DELETE RESTRICT`.
  JSON-поле `OrderGroup.customer` сохранено как исторический снимок.
- Create/update DTO принимают только `customerId?: UUID | null`. Переданный ID
  проверяется по справочнику; неизвестный ID дает `404`. Сервер формирует снимок
  из `id`, `name`, `companyName`, `address`, `phone`, `email`, `comment`,
  `attributes`, `level`. При update отсутствие `customerId` сохраняет текущую
  связь, а явный `null` атомарно записывает `customerId = null` и `customer = {}`.
- Диагностика: `GET /api/order-groups/customer-link-issues` возвращает
  `{ id, orderNumber, customer, reason }[]`; `reason` равен
  `customer_not_found` для снимка с прежним ID либо
  `missing_or_invalid_customer_id` для отсутствующего/поврежденного ID.
- Удаление заказчика, связанного с заказом, возвращает `409 Conflict` до
  выполнения физического удаления.
- Клиентские create/edit-запросы передают `customerId`; `customer` остается
  только ответным snapshot-полем. Добавлен тест payload создания заказа.
- Миграции:
  `1789600000000-AddOrderGroupCustomerLink.ts` для PostgreSQL и SQLite.
  Backfill выполняется только при точном совпадении `customer.id` из валидного
  JSON с существующим `customers.id`; имя, телефон и email не используются.
  SQLite-тест подтверждает сохранность поврежденного снимка, документов и цен,
  а также пустой `PRAGMA foreign_key_check`.

Проверки:

- `server: npm run test:cov -- --runInBand modules/order-groups/order-groups.service.spec.ts modules/customers/customers.service.spec.ts modules/database/add-order-group-customer-link.migration.spec.ts` — успешно, 3 suites / 11 tests.
- `server: npm run build` — успешно.
- `client: npm run coverage -- src/features/create-order/hooks/useCreateOrder.test.ts` — успешно, 1 test.
- `client: npm run build` — успешно (только существующие предупреждения Vite о
  размере/circular chunks).
- Точечный ESLint всех измененных TypeScript-файлов server/client — успешно;
  исправляющий lint по всему репозиторию не запускался.
- `server: npm run test:e2e:sqlite` — 4/5 тестов успешно; общий тест имеет
  существующее рассогласование счетчика metadata: ожидает 24, фактически 26.
  Новая отдельная миграционная suite полностью успешна.
- `client: npm run fsd:check` — существующий blocker вне FA-01:
  `src/app/ui` нарушает `fsd/no-ui-in-app`; измененные файлы новых FSD-ошибок не
  добавили.
- Эквивалентный прогон PostgreSQL не выполнен: в среде отсутствует команда
  `docker`, доступная тестовая PostgreSQL БД не обнаружена. PostgreSQL-миграция
  добавлена парно, но требует фактического прогона перед выпуском.

Ограничения для следующих задач: заказы без заказчика по-прежнему разрешены;
диагностика read-only и ничего не связывает автоматически; поиск продолжает
использовать сохраненный JSON-снимок; финансовые таблицы и команды не созданы.

<a id="fa-02"></a>
## FA-02. Финансовая схема, сущности и денежные примитивы

**Цель:** создать переносимый фундамент финансового домена без публичных команд и без автоматического заполнения данных.

**Контекст:** архитектура, разделы 4 и 7. Точки входа: [AppModule](../server/src/app.module.ts), [DatabaseModule](../server/src/modules/database/database.module.ts), [настройки БД](../server/src/modules/database/database-options.ts), [транзакционный helper](../server/src/modules/database/database-transaction.ts), [numeric transformer](../server/src/shared/utils/column.transformer.ts), последние [PostgreSQL](../server/src/modules/database/migrations/postgres) и [SQLite](../server/src/modules/database/migrations/sqlite) миграции.

**Реализовать:**

- Создать `FinanceModule` и сущности `FinancialAccrual`, `FinancialAccrualEntry`, `FinancialPayment`, `FinancialPaymentAllocation` по разделу 7 архитектуры.
- Зарегистрировать сущности в модуле и подключить модуль к `AppModule`. Публичные controllers пока не нужны.
- Добавить парные миграции с CHECK, FK, unique и индексами. Для UUID использовать существующий проектный подход для каждой БД.
- `financial_accruals.orderGroupId` — nullable и уникальный, FK `RESTRICT`; `customerId` у accrual и payment — FK `RESTRICT`.
- Сохранить исторические allocation-строки со статусом `active/released`; не использовать hard delete и cascade, уничтожающий историю.
- Реализовать `finance-money.ts`: парсинг API-строки рублей в целые копейки, обратное форматирование для response, проверку двух знаков, безопасного диапазона и знака по контексту.
- Реализовать TypeORM transformer для `bigint`, одинаково читающий PostgreSQL string и SQLite integer, с проверкой `Number.isSafeInteger`.
- Enum хранить переносимо, не полагаясь на PostgreSQL-only типы. Ограничения должны существовать и на уровне DTO/домена, и в БД там, где возможно.
- Не создавать начисления по существующим заказам и не добавлять seed финансовых данных.

**Инварианты схемы:**

- `amountMinor` оплат и allocations положительный; entries не равны нулю.
- `sourceType=order` требует `orderGroupId`; `sourceType=manual` запрещает его.
- `reversesEntryId` ссылается максимум на одну сторнирующую запись.
- `requestId` уникален в области соответствующей команды.
- Удаление заказчика, заказа или родительской финансовой записи не стирает проведенную историю.

**Тесты и проверка:**

- Unit-тесты денежного преобразования: `0.01`, целые рубли, два знака, лишние знаки, отрицательная корректировка, ноль, большие значения и выход за safe integer.
- Миграционный тест SQLite: чистая и существующая БД, CHECK/FK/unique, rollback, повторный up/down/up на одноразовой БД.
- Физический прогон PostgreSQL-миграции при доступной БД.
- Проверка отсутствия расхождения ORM-схемы и миграций для обеих конфигураций.
- Из `server/`: релевантный coverage, database specs/e2e, `npm run build`, ESLint по новым файлам без `--fix`.

**Приемка:** четыре таблицы и сущности согласованы; копейки читаются одинаково в обеих БД; старые данные не изменены; модуль собирается без HTTP API и циклических импортов.

**Передать дальше:** фактические enum, TypeScript-типы, названия таблиц/индексов/ограничений, интерфейс money helper, имена миграций и правила `requestId`.

### Результат FA-02

Создан переносимый фундамент финансового домена без HTTP API, команд и
автоматического заполнения данных.

- Добавлен `FinanceModule`, подключенный к `AppModule`, и четыре сущности:
  `FinancialAccrual` (`financial_accruals`), `FinancialAccrualEntry`
  (`financial_accrual_entries`), `FinancialPayment` (`financial_payments`) и
  `FinancialPaymentAllocation` (`financial_payment_allocations`). Контроллеры и
  публичные команды отсутствуют.
- Фактические enum: source `order|manual`; accrual status
  `active|cancelled`; entry kind `initial|adjustment|reversal`; payment method
  `cash|card|bank_transfer|other`; payment status `posted|cancelled`;
  allocation status `active|released`. В БД это переносимые `text` + именованные
  `CHECK`, не PostgreSQL enum.
- Все денежные поля называются `amountMinor` и представлены в TypeScript как
  `number`. `SafeBigintTransformer` одинаково читает PostgreSQL `string` и
  SQLite `number`, отклоняя дробные и выходящие за `Number.MAX_SAFE_INTEGER`
  значения.
- Money API: `parseRublesToMinor(value, { allowNegative?, allowZero? })`
  принимает только строку рублей с точкой и максимум двумя знаками;
  `formatMinorToRubles(amountMinor)` возвращает строку с двумя знаками;
  `assertSafeMinorAmount` проверяет целое безопасного диапазона. По умолчанию
  парсинг требует положительную ненулевую сумму; отрицательное значение
  включается явно для корректировок.
- Парные миграции: `1789700000000-AddFinancialCore.ts` для PostgreSQL и SQLite.
  Они создают четыре пустые таблицы, FK `RESTRICT`, уникальные `requestId`
  отдельно у entries и payments, уникальные `orderGroupId` и
  `reversesEntryId`, обязательные CHECK сумм/source/status/method и индексы из
  архитектуры. Cascade/hard delete финансовой истории не используется.
- `requestId` уникален в области таблицы/команды: отдельно для денежных
  операций начисления и отдельно для создания оплаты. У accrual/allocation
  requestId в согласованной модели FA-02 отсутствует.
- SQLite-миграция FA-01 дополнена восстановлением двух существовавших индексов
  `order_groups` после table rebuild; это устранило обнаруженный schema diff.

Проверки:

- `npm run test:cov -- --runInBand modules/finance/finance-money.spec.ts modules/finance/safe-bigint.transformer.spec.ts modules/database/add-financial-core.migration.spec.ts modules/database/add-order-group-customer-link.migration.spec.ts` — успешно, 4 suites / 23 tests.
- `npm run test:e2e:sqlite` — успешно, 5/5; чистая БД мигрируется, ORM schema
  diff пуст, `foreign_key_check` пуст.
- `npm test -- --runInBand modules/database` — 9/10 suites и 22/27 tests
  успешно; существующий `add-order-management.migration.spec.ts` исключает
  миграцию `AddOrderManagement`, но затем запускает зависящую от нее
  `AddProductionAutoAssignment`, поэтому падает с
  `no such table: order_management_settings`. Релевантные FA-01/FA-02 и
  остальные database suites проходят.
- Миграционный тест существующей SQLite БД подтверждает сохранность заказа,
  документа и цены, пустые финансовые таблицы, CHECK/FK/unique, rollback и цикл
  down/up.
- `npm run build` — успешно.
- ESLint по всем новым/измененным TypeScript-файлам без `--fix` — успешно.
- PostgreSQL-файл создан с эквивалентными именами таблиц, ограничений и
  индексов, но физический прогон и PostgreSQL schema diff не выполнены: команда
  `docker` в среде отсутствует и доступная тестовая PostgreSQL БД не найдена.

Ограничения для следующих задач: данные не создаются и не изменяются
автоматически; сервисы команд, DTO и API намеренно отсутствуют; межстрочные
суммовые и customer-инварианты должны проверяться будущим транзакционным
сервисом поверх этой схемы.

<a id="fa-03"></a>
## FA-03. Команды и API начислений

**Цель:** реализовать проведение заказа, ручное начисление, корректировки и аннулирование с неизменяемой историей entries.

**Контекст:** архитектура, разделы 5.5–5.7, 8 и 9; результаты FA-01/FA-02. Код заказов: [OrderGroup](../server/src/modules/order-groups/entities/order-group.entity.ts), [Order](../server/src/modules/orders/entities/order.entity.ts), [OrdersService](../server/src/modules/orders/orders.service.ts).

**Реализовать:**

- Создать `FinanceAccrualsService` и узкий controller/DTO для:
  - `POST /api/finance/accruals/from-order`;
  - `POST /api/finance/accruals/manual`;
  - `POST /api/finance/accruals/:id/sync-order-total`;
  - `POST /api/finance/accruals/:id/adjustments`;
  - `POST /api/finance/accruals/:id/cancel`.
- При проведении заказа под транзакцией заново прочитать `OrderGroup.customerId` и документы, вычислить сумму `SUM(Order.totalPrice)`, нормализовать ее в копейки и не доверять сумме из клиента.
- Запретить проведение заказа без заказчика, с нулевой/отрицательной суммой или уже существующим начислением.
- Ручное начисление принимает заказчика, title, `effectiveDate`, положительную сумму, comment/reason и `requestId`; оно не создает заказ или каталог услуг.
- `sync-order-total` создает одну adjustment-entry на точную разницу между текущей рассчитанной и проведенной суммой. Нулевая разница не создает строку и возвращает текущее состояние.
- Ручная корректировка принимает знаковую сумму, обязательную причину, `effectiveDate`, `expectedVersion` и `requestId`.
- Аннулирование требует причины, даты и версии, создает reversal на отрицательную текущую сумму и переводит accrual в `cancelled` в одной транзакции.
- Выполнить идемпотентность: тот же `requestId` и эквивалентные данные возвращают прежний результат; другое содержимое дает `409`.
- Использовать условное изменение `version`; не полагаться на обычный `save` как защиту от гонки.
- Возвращать минимальную read-модель начисления с суммой в API-строке рублей и/или согласованным `amountMinor`; фактический единый формат зафиксировать в результате задачи.
- Не реализовывать списки, общие отчеты и клиентский UI.

**Инварианты:**

- Entry после вставки не редактируется и не удаляется.
- Customer заказа и accrual совпадают.
- Отмена/завершение заказа не вызывает финансовую команду автоматически.
- Смена customerId заказа после появления accrual блокируется в том же слое правил, который используется старым endpoint обновления заказа.
- Удаление заказа с accrual дает `409` через понятную бизнес-ошибку.
- Пока allocations еще не доступны публично, сервис уже учитывает существующие active-строки схемы: отрицательная корректировка не может сделать сумму меньше распределенной.

**Тесты и проверка:**

- Первичное проведение группы с несколькими документами, отсутствие заказчика, нулевая сумма, повторный заказ.
- Ручное начисление и DTO-границы.
- Sync вверх, вниз, нулевая разница, уже измененная версия.
- Корректировка и отмена, повтор `requestId`, конфликт содержимого.
- Транзакционный rollback entry/status/version при ошибке.
- Проверка отсутствия автоматического начисления при lifecycle-переходах заказа.
- Релевантный Jest coverage и `npm run build`; integration на SQLite и PostgreSQL по возможности.

**Приемка:** каждый путь создает проверяемую неизменяемую историю; цена заказа читается сервером; двойное проведение и сетевой повтор безопасны; заказные сценарии не получили скрытой автоматизации.

**Передать дальше:** точные request/response DTO, коды ошибок, правила версий/идемпотентности, алгоритм суммы заказа и все фактические endpoints.

### Результат FA-03

Реализованы команды начислений и узкий HTTP API без списков, отчетов и
клиентского UI.

Endpoints и request DTO:

- `POST /api/finance/accruals/from-order` — `{ orderGroupId: integer,
  effectiveDate: YYYY-MM-DD, requestId: UUID }`.
- `POST /api/finance/accruals/manual` — `{ customerId: UUID, title,
  amount: string, effectiveDate: YYYY-MM-DD, reason?: string, requestId:
  UUID }`.
- `POST /api/finance/accruals/:id/sync-order-total` — `{ expectedVersion,
  effectiveDate: YYYY-MM-DD, requestId: UUID }`.
- `POST /api/finance/accruals/:id/adjustments` — `{ amount: signed string,
  reason, expectedVersion, effectiveDate: YYYY-MM-DD, requestId: UUID }`.
- `POST /api/finance/accruals/:id/cancel` — `{ reason, expectedVersion,
  effectiveDate: YYYY-MM-DD, requestId: UUID }`.

Все ответы используют минимальную read-модель `{ id, customerId, sourceType,
orderGroupId, title, status, version, amountMinor, amount }`, где `amountMinor`
— безопасное целое число копеек, а `amount` — каноническая API-строка рублей с
двумя знаками.

Фактические правила:

- Проведение заказа заново читает `OrderGroup` и все `Order` внутри
  `runDatabaseTransaction`; каждый `totalPrice` нормализуется до копеек на
  сервере, затем суммы складываются. Клиентская сумма не принимается.
- Заказ без `customerId`, с итогом `<= 0` отклоняется `422`; отсутствующая
  запись дает `404`; повторное проведение другого request дает `409`.
- Ручное начисление проверяет существование customer и создает только accrual
  с initial entry. Каталог услуг или заказ не создаются.
- Sync создает ровно одну adjustment entry на разницу; при нулевой разнице не
  пишет entry и не увеличивает version. Customer заказа повторно сверяется с
  customer начисления.
- Корректировка допускает положительную/отрицательную ненулевую сумму и требует
  reason. Отмена создает reversal на отрицательную текущую сумму и атомарно
  переводит accrual в `cancelled`.
- Перед уменьшением проверяется сумма существующих active allocations; результат
  ниже нее дает `422`. Entries после insert не изменяются и не удаляются.
- Для PostgreSQL изменяемый accrual блокируется `pessimistic_write`; SQLite
  использует общую сериализацию `runDatabaseTransaction`. Независимо от БД
  version меняется условным `UPDATE ... WHERE version = expectedVersion`;
  устаревшая версия дает `409`.
- Повтор того же `requestId` с эквивалентными сохраненными полями возвращает
  прежнее состояние; несовпадающие accrual/payload дают `409`. Область
  idempotency — unique `financial_accrual_entries.requestId`. Нулевая sync
  не создает entry и потому не резервирует requestId.
- Старый update заказа запрещает смену `customerId`, если accrual уже существует;
  delete такого заказа также дает понятный `409`. Lifecycle переходы заказа не
  вызывают finance-команды.
- `400` используется для DTO/денежного формата, `404` для отсутствующих
  сущностей, `409` для version/idempotency/state conflicts, `422` для
  невозможной финансовой суммы.

Проверки:

- Релевантный coverage — успешно, 5 suites / 35 tests: несколько документов,
  заказ без customer, нулевой итог, повторное проведение, manual DTO,
  idempotency, sync вверх/вниз/без изменения, stale version, adjustment,
  allocation floor, cancel/reversal, rollback и lifecycle без автоначисления.
- `npm run test:e2e:sqlite` — успешно, 5/5; миграции и schema diff остаются
  корректными.
- `npm run build` — успешно.
- ESLint измененных server-файлов без `--fix` — успешно.
- PostgreSQL integration не выполнена: в среде нет команды `docker` и не
  обнаружена доступная тестовая PostgreSQL БД. PostgreSQL locking/query path
  реализован, но требует физического прогона перед выпуском.

<a id="fa-04"></a>
## FA-04. Команды и API оплат

**Цель:** регистрировать и аннулировать фактически полученные суммы независимо от начислений.

**Контекст:** архитектура, разделы 5.1–5.4 и 7.3; результаты FA-02. Заказчик: [Customer](../server/src/modules/customers/entities/customer.entity.ts), общая валидация: [app validation pipe](../server/src/common/pipes/app-validation.pipe.ts).

**Реализовать:**

- Создать `FinancePaymentsService` и endpoints:
  - `POST /api/finance/payments` — пока без начальных allocations; поле будет добавлено в FA-05;
  - `GET /api/finance/payments/:id` — детальная запись, чтобы следующая задача могла расширить response;
  - `POST /api/finance/payments/:id/cancel`.
- Создание принимает существующего `customerId`, положительную сумму, `paymentDate`, method, optional `externalReference/comment` и `requestId`.
- Сумма, заказчик, способ и дата проведенной оплаты не имеют PATCH endpoint. Исправление — cancel + новая оплата.
- Аннулирование принимает `cancellationDate`, обязательную причину и `expectedVersion`; повторная отмена должна быть идемпотентной или давать документированный конфликт.
- При аннулировании освобождать все active allocations, если они существуют в БД, в одной транзакции. Полная проверка этого сценария добавится в FA-05.
- В отчетной read-модели сохранить исходную положительную оплату и данные будущей отрицательной строки на `cancellationDate`.
- Реализовать семантику `requestId`, условную версию и транзакционный rollback аналогично FA-03, не копируя общий service-locator или god service.
- Не реализовывать платежный список, summary, распределение и UI.

**Инварианты:**

- Оплата может существовать без начисления и полностью считаться нераспределенным авансом.
- Нельзя создать оплату на отсутствующего заказчика или аннулировать ее без причины/даты.
- Cancel не удаляет строку и не переписывает `paymentDate`.
- Отмена заказа не отменяет оплату.

**Тесты и проверка:**

- Все четыре method, валидация суммы/даты/текста и неизвестный заказчик.
- Идемпотентное создание и конфликт одинакового `requestId` с другими данными.
- Аннулирование, повтор, устаревшая версия и rollback.
- Представление исходной и отменяющей операции на разных отчетных датах.
- Релевантный Jest coverage, обе БД по возможности, `npm run build`.

**Приемка:** аванс можно безопасно записать до появления начисления; проведенные реквизиты неизменяемы; отмена сохраняет историю и отчетную дату.

**Передать дальше:** точные payment DTO/read model, семантика повторной отмены, версия, формат денег и cancellation.

### Результат FA-04

Реализованы `FinancePaymentsService` и API:

- `POST /api/finance/payments` — создание независимой оплаты/аванса без allocations;
- `GET /api/finance/payments/:id` — детальная read-модель оплаты;
- `POST /api/finance/payments/:id/cancel` — аннулирование с освобождением всех active allocations в одной транзакции.

Точные DTO:

- создание: `customerId` (UUID), `amount` (положительная строка рублей с максимум двумя знаками после точки), `paymentDate` (`YYYY-MM-DD`), `method` (`cash | card | bank_transfer | other`), optional `externalReference` (до 500 символов), optional `comment` (до 1000 символов), `requestId` (UUID);
- отмена: `cancellationDate` (`YYYY-MM-DD`), непустая `reason` (до 1000 символов), `expectedVersion` (целое неотрицательное), `requestId` (UUID).

Read-модель возвращает исходные неизменяемые реквизиты, `status`, `version`, cancellation-поля и `reportOperations`. У проведенной оплаты это одна положительная операция на `paymentDate`; после отмены добавляется отрицательная операция той же суммы на `cancellationDate`. Деньги возвращаются одновременно как безопасный integer `amountMinor` и строка `amount` с двумя знаками после точки.

Создание с тем же `requestId` и теми же данными идемпотентно, с другими данными дает `409`. Для отмены добавлен отдельный уникальный `cancellationRequestId`: точный повтор отмены идемпотентен независимо от уже увеличенной версии, повтор с новым `requestId` или другими данными дает `409`. Исходный `requestId` создания при отмене сохраняется. Условное обновление `version` и блокировка PostgreSQL защищают от конкурентной отмены; SQLite-транзакции сериализуются общим transaction helper. Проведенные реквизиты не имеют PATCH endpoint.

Добавлены парные миграции PostgreSQL/SQLite для `cancellationRequestId`, unit-тесты DTO и SQLite integration-тесты сервиса: четыре способа оплаты, сумма/дата/текст, неизвестный заказчик, идемпотентность и конфликт, stale version, отмена, повтор, освобождение allocation, rollback и две отчетные даты.

Проверки:

- `npm test -- --runInBand src/modules/finance/dto/payment.dto.spec.ts src/modules/finance/finance-payments.service.spec.ts` — 2 suites, 17 tests passed;
- `npm run test:cov -- --runInBand src/modules/finance/dto/payment.dto.spec.ts src/modules/finance/finance-payments.service.spec.ts` — 2 suites, 17 tests passed; `finance-payments.service.ts`: 82.89% statements / 84.72% lines, `payment.dto.ts`: 100% statements / lines;
- `npm run test:e2e:sqlite` — 1 suite, 5 tests passed, включая применение всех SQLite migrations и metadata;
- ESLint измененных файлов — passed;
- `npm run build` — passed;
- PostgreSQL runtime-проверка не запускалась: Docker CLI в окружении отсутствует; PostgreSQL-миграция и код успешно прошли TypeScript build.

<a id="fa-05"></a>
## FA-05. Транзакционное распределение оплат

**Цель:** реализовать many-to-many распределение одной оплаты по нескольким начислениям и нескольких оплат по одному начислению без переплат и гонок.

**Контекст:** архитектура, разделы 4.2, 5.1–5.4 и 7.4; фактические контракты FA-03/FA-04; [runDatabaseTransaction](../server/src/modules/database/database-transaction.ts).

**Реализовать:**

- Создать `FinanceAllocationsService` с единственной ответственностью за проверку и замену активной карты распределения.
- Добавить `PUT /api/finance/payments/:id/allocations`: body содержит полный желаемый список `{ accrualId, amount }`, `expectedVersion` и причину изменения при освобождении ранее распределенной суммы.
- Расширить `POST /api/finance/payments`: optional `allocations` создаются атомарно вместе с оплатой; ошибка одной строки откатывает оплату целиком.
- Расширить detail оплаты: активные и released allocations, суммы `allocated` и `unallocated` рассчитываются сервером.
- Под транзакцией заблокировать/проверить payment, затронутые accrual и их активные allocations в стабильном порядке, чтобы снизить риск deadlock PostgreSQL.
- Проверить совпадение customerId, активные статусы, положительность, отсутствие duplicate accrualId в request, лимит оплаты и остаток каждого начисления.
- Замена не обновляет суммы старых allocation: измененные/удаленные строки переходят в `released`, новые создаются как `active`; неизмененные разрешено оставить без новой исторической строки.
- После успешной замены увеличить payment.version ровно один раз. Если требуется версия accrual для защиты сумм, зафиксировать выбранный механизм в результате.
- Аннулирование оплаты из FA-04 должно освобождать active allocations с причиной отмены в той же транзакции.
- Не добавлять автоматическое распределение «по старейшим» и не разрешать распределение между заказчиками.

**Инварианты:**

- `SUM(active allocation по payment) <= payment.amountMinor`.
- `SUM(active allocation по accrual) <= SUM(accrual entries)`.
- Released allocation больше не влияет на остатки, но остается в detail/history.
- Пустой список корректно освобождает все распределение.
- Сумма сверх остатка не переносится автоматически на другую цель.

**Тесты и проверка:**

- Одна оплата на несколько начислений; несколько оплат на одно начисление.
- Частичное распределение и нераспределенный остаток.
- Чужой customer, cancelled payment/accrual, duplicate ID, превышение обеих границ.
- Замена, частичное освобождение, пустая карта и история released.
- Два запроса одной версии: один успех, второй `409`.
- Параллельная отрицательная корректировка начисления и allocation; ни один итог не нарушает инварианты.
- Ошибка в одной строке откатывает создание/замену полностью.
- Тесты транзакций на SQLite и реальном PostgreSQL, релевантный coverage, `npm run build`.

**Приемка:** все заявленные комбинации частичных и объединенных оплат работают; ни одна гонка или сетевой повтор не приводит к двойному распределению или переплате.

**Передать дальше:** контракт полной карты, правила release, version locking, порядок блокировок и response totals.

### Результат FA-05

Реализован отдельный `FinanceAllocationsService`, отвечающий только за проверку и атомарную замену полной активной карты распределения.

Контракты:

- `PUT /api/finance/payments/:id/allocations`: `{ allocations: Array<{ accrualId: UUID, amount: positive money string }>, expectedVersion: non-negative integer, reason?: string }`;
- `reason` обязателен, если новая карта изменяет или удаляет хотя бы одну active allocation; пустая карта корректно освобождает все строки;
- `POST /api/finance/payments` принимает optional `allocations` того же формата и создает оплату с ними в одной транзакции;
- detail оплаты дополнен полной историей `allocations` (active и released), а также `allocatedMinor`/`allocated` и `unallocatedMinor`/`unallocated`.

Полная карта проверяется до записи: duplicate `accrualId`, положительность денег, существование начислений, совпадение заказчика, active-статусы оплаты и начислений, сумма по оплате и доступный остаток каждого начисления. Измененные и удаленные строки переводятся в `released` с причиной и временем, новые суммы создаются отдельными active-строками, неизмененные сохраняются. Ошибка любой строки откатывает создание оплаты или замену целиком.

Порядок блокировок PostgreSQL: payment, затем все затронутые accrual в порядке UUID (включая удаляемые из старой карты), затем active allocations в порядке `(accrualId, id)`. При распределении версия accrual не увеличивается: защита суммы обеспечивается общей pessimistic-блокировкой accrual, которую использует и корректировка начисления. В SQLite все финансовые транзакции сериализуются `runDatabaseTransaction`. После каждого успешного PUT `payment.version` условно увеличивается ровно один раз; два запроса одной версии дают один успех и один `409`.

Начальные allocations участвуют в проверке идемпотентного повтора создания и не дублируются. Аннулирование оплаты по-прежнему освобождает все active allocations в той же транзакции с причиной отмены.

Проверены: одна оплата на несколько начислений, несколько оплат на одно начисление, частичное распределение и аванс, обе границы суммы, чужой customer, cancelled payment/accrual, duplicate ID, замена/частичное и полное освобождение, released history, stale/concurrent version, rollback создания и замены, а также конкурентная отрицательная корректировка начисления без нарушения инварианта.

Проверки:

- `npm run test:cov -- --runInBand src/modules/finance/dto/payment.dto.spec.ts src/modules/finance/finance-payments.service.spec.ts src/modules/finance/finance-allocations.service.spec.ts src/modules/finance/finance-accruals.service.spec.ts` — 4 suites, 33 tests passed; `finance-allocations.service.ts`: 96.93% statements / 97.75% lines;
- `npm run test:e2e:sqlite` — 1 suite, 5 tests passed, включая все migrations и entity metadata;
- ESLint измененных файлов — passed;
- `npm run build` — passed;
- реальный PostgreSQL не запущен: Docker CLI отсутствует в окружении. PostgreSQL-ветви блокировок прошли TypeScript build; транзакционные инварианты и параллельные сценарии выполнены на SQLite.

<a id="fa-06"></a>
## FA-06. Read API, сводки, поиск и пагинация

**Цель:** дать клиенту эффективные read-модели финансового раздела, заказчика и заказа без N+1 и без повторения расчетов на клиенте.

**Контекст:** архитектура, разделы 4, 9 и 10; результаты FA-03–FA-05; [WrapItemsInterceptor](../server/src/common/interceptors/wrap-items.interceptor.ts), пример поиска [OrderGroupsService](../server/src/modules/order-groups/order-groups.service.ts).

**Реализовать:**

- Создать `FinanceReportsService` или отдельный read service для текущих сводок. Не смешивать SQL выборок с mutation services.
- Реализовать:
  - `GET /api/finance/summary`;
  - `GET /api/finance/customers/:customerId`;
  - `GET /api/finance/order-groups/:orderGroupId`;
  - `GET /api/finance/accruals`;
  - `GET /api/finance/payments`.
- Общая сводка: начислено, оплачено, сальдо, долг, аванс, активно распределено и нераспределено. Не вычитать allocations из customer balance второй раз.
- Customer view: те же итоги плюс последние операции и открытые начисления.
- Order view: текущая рассчитанная сумма документов, проведено, распределено, остаток, разница для sync и нераспределенный аванс заказчика отдельным полем.
- Списки поддерживают согласованные фильтры архитектуры, поиск и cursor по `(businessDate, id)`; ответ явно `{ items, meta: { nextCursor, ... } }`.
- Поиск должен работать в PostgreSQL и SQLite с существующей стратегией нормализации, без вставки пользовательского текста в SQL.
- Состояния `unpaid/partially_paid/paid/cancelled` и `unallocated/partial/allocated` вычисляются на сервере.
- Использовать агрегирующие запросы/batched joins, не загружать все entities с relations для подсчета каждой строки.
- Зафиксировать response DTO/type и формат денег; списки не должны повторно оборачиваться interceptor.
- Добавить в summary количество проблем связи заказов с заказчиками или отдельный запрос FA-01 для баннера клиента.
- Не реализовывать периодический акт и turnover-report: это FA-10.

**Тесты и проверка:**

- Пустая база, один заказчик, несколько заказчиков, отмененные операции, released allocations.
- Проверка формул долга/аванса и различия общего аванса с оплатой конкретного заказа.
- Cursor без пропусков/дубликатов при одинаковой дате; фильтры и поиск в обеих БД.
- Контракт `{ items, meta }` после глобального interceptor.
- Проверка количества запросов или SQL-плана на наборе данных, исключающая очевидный N+1.
- Релевантный coverage, integration/e2e SQLite и PostgreSQL, `npm run build`.

**Приемка:** все суммы для будущего UI приходят готовыми и согласованными; пагинация стабильна; расчеты одинаковы в обеих БД.

**Передать дальше:** полные response-типы, query-параметры, cursor, формат ошибок и SWR-инвалидационные зависимости.

### Результат FA-06

Реализован отдельный `FinanceReportsService` с агрегирующими read-запросами;
mutation-сервисы начислений, оплат и распределений не расширялись.

Endpoints:

- `GET /api/finance/summary` — текущие `accrued`, `paid`, `balance`, `debt`,
  `advance`, `allocated`, `unallocated` и их поля `*Minor`, плюс
  `customerLinkIssuesCount`;
- `GET /api/finance/customers/:customerId` — заказчик, те же итоги, до 10
  последних операций и открытые начисления;
- `GET /api/finance/order-groups/:orderGroupId` — текущая сумма документов,
  проведено, распределено, остаток, разница для sync и общий нераспределенный
  аванс заказчика;
- `GET /api/finance/accruals` и `GET /api/finance/payments` — списки в явном
  формате `{ items, meta: { limit, nextCursor } }`, который глобальный
  `WrapItemsInterceptor` не оборачивает повторно.

Общие query-параметры списков: `dateFrom`, `dateTo` (`YYYY-MM-DD`),
`customerId`, `search`, `cursor`, `limit` (по умолчанию 50, максимум 100).
Начисления дополнительно принимают `sourceType=order|manual` и
`status=unpaid|partially_paid|paid|cancelled`. Оплаты принимают
`method=cash|card|bank_transfer|other`, `status=posted|cancelled` и
`allocationState=unallocated|partial|allocated`. DTO отклоняют неизвестные и
невалидные значения существующим validation pipe.

Cursor — opaque base64url JSON пары `{ businessDate, id }`; сортировка идет по
дате и UUID по убыванию. Для начисления business date — дата initial entry,
для оплаты — `paymentDate`. Некорректный cursor возвращает `400`; отсутствующий
заказчик или заказ — `404`. Поиск параметризован и использует `lower/ILIKE` в
PostgreSQL и существующую `unicode_lower/LIKE` в SQLite. Он охватывает
заказчика, название начисления/номер и комментарий заказа, а для оплаты —
заказчика, внешний номер и комментарий.

Все деньги возвращаются парой безопасный integer копеек `*Minor` и строка RUB
с двумя знаками. `debt` и `advance` сначала вычисляются отдельно по каждому
заказчику, поэтому не схлопываются общим сальдо. Allocations не вычитаются из
balance повторно; в агрегаты входят только active allocations, posted payments
и сумма immutable accrual entries. Cancelled payment исключается из текущей
оплаты, reversal cancelled accrual обнуляет начисление. История customer view
при этом сохраняет исходную оплату и отдельную отрицательную операцию отмены.

Списки строятся одним запросом каждый через grouped derived tables; summary,
customer и order view используют фиксированное число агрегирующих/batched
запросов независимо от числа строк. Entities с relations построчно не
загружаются, очевидного N+1 нет. Для будущего SWR после mutations нужно
инвалидировать соответствующий detail/list, customer view, order view и общую
summary; контракт ключей клиента остается задачей FA-07.

Файлы: `dto/finance-read.dto.ts`, `finance-reports.service.ts`,
`finance-reports.service.spec.ts`, а также регистрация GET-маршрутов и provider
в существующих `finance.controller.ts` / `finance.module.ts`. Схема и миграции
не менялись.

Проверки:

- `npm run test:cov -- --runInBand src/modules/finance/finance-reports.service.spec.ts`
  — успешно, 5 tests: пустая база, несколько заказчиков, cancelled/released,
  формулы, поиск, cursor на одинаковой дате, состояния и order view;
- `npm test -- --runInBand src/modules/finance` — успешно, 8 suites / 58 tests;
- `npm run test:e2e:sqlite` — успешно, 5/5;
- точечный ESLint измененных server-файлов без `--fix` — успешно;
- `npm run build` — успешно.

Реальная PostgreSQL БД в среде не запускалась. PostgreSQL-ветка поиска и raw
aliases реализованы переносимо и прошли TypeScript build, но физический прогон
остается обязательной проверкой перед выпуском.

<a id="fa-07"></a>
## FA-07. Read-only раздел `/finance`

**Цель:** добавить видимый финансовый раздел со сводкой и списками без mutation-форм, сохраняя page-first FSD.

**Контекст:** архитектура, разделы 10 и 11; фактический API FA-06. Точки входа: [маршруты](../client/src/app/routes/routesElements.tsx), [route constants](../client/src/app/routes/routes.ts), [Sidebar](../client/src/widgets/sidebar/ui/Sidebar.tsx), [SWR endpoints](../client/src/shared/lib/swr/endpoints.ts), [SWR models](../client/src/shared/lib/swr/models.ts), [пример страницы уведомлений](../client/src/pages/notifications/ui/NotificationsPage.tsx).

**Реализовать:**

- Добавить lazy route `/finance` и пункт верхнего уровня «Финансы» в Sidebar.
- Создать slice `client/src/pages/finance/{api,model,ui,index.ts}`. В `api` оставить page-specific SWR hooks и сборку ключей; чистые HTTP/CRUD-функции и их transport DTO разместить в `shared/api/finance`. Пока не создавать `entities/finance` и `features/*`.
- Добавить сводные карточки «Начислено», «Оплачено», «Долг», «Аванс», «Не распределено».
- Добавить вкладки «Оплаты», «Начисления», «По заказчикам». Вкладка отчетов появится в FA-10; не создавать пустую архитектурную заготовку.
- Таблица оплат: дата, заказчик, способ, сумма, распределено, остаток, статус; раскрытие строки показывает allocations.
- Таблица начислений: дата, заказчик, источник, заказ/услуга, сумма, оплачено, остаток, состояние; заказ ведет на `/order/:groupID`.
- Таблица заказчиков: долг/аванс, нераспределенная сумма, последние операции; выбор устанавливает `customerId` в URL и фильтрует данные.
- Реализовать server-side cursor pagination, фильтры и поиск без загрузки всех строк.
- Показать баннер/список старых заказов без `customerId` из диагностики FA-01; не давать из него проводить финансы.
- Добавить loading/error/empty, retry и понятное отображение cancelled/released данных.
- Использовать существующие Ant Design, SWR и Emotion. Не добавлять Zustand для серверных списков и новые библиотеки.
- Добавить MSW handlers/fixtures только в объеме, необходимом существующей клиентской тестовой среде.

**FSD-ограничения:**

- Page-local hooks и модели доступны только внутри `pages/finance`.
- `shared/api/finance` содержит только transport/CRUD и API-типы, без формул баланса или другой финансовой бизнес-логики.
- Не импортировать `pages/finance` из других страниц.
- Имена файлов отражают домен (`finance-summary.ts`, `finance-payments.ts`), а не общие `types.ts`/`helpers.ts`.

**Тесты и проверка:**

- Рендер сводки, каждой вкладки, фильтра в URL и перехода в заказ.
- Loading/error/empty, отмененная оплата, частичное распределение, длинные значения.
- Cursor/«Загрузить еще» без дубликатов.
- `npm run coverage -- <релевантные тесты>`, `npm run build`, `npm run fsd:check`, ESLint без `--fix`.
- Визуальная проверка desktop и узкой ширины; скриншот результата.

**Приемка:** пользователь видит достоверную финансовую картину и может найти заказчика/операцию, но пока не может менять финансы через новый раздел.

**Передать дальше:** структура page slice, SWR keys, компоненты таблиц, URL-фильтры, API adapters и подтвержденные места будущих форм.

### Результат FA-07

Реализован read-only раздел `/finance`; mutation-формы и команды FA-08 не
добавлялись.

- Маршрут загружается lazy через `pages/finance`, в Sidebar добавлен пункт
  верхнего уровня «Финансы».
- Page slice: `pages/finance/api/finance-data.ts` содержит SWR keys и
  page-local hooks с дедупликацией cursor-страниц;
  `model/finance-display.ts` — подписи и форматирование;
  `ui/FinancePage.tsx` — сводка, вкладки и состояния экрана; наружу экспортируется
  только `pages/finance/index.ts`.
- Чистые transport types и GET adapters находятся в
  `shared/api/finance/{finance.ts,index.ts}`. `entities/finance`, новые features
  и Zustand не создавались.
- SWR keys: `finance/summary`, tuple keys списков с `search/customerId`,
  `finance/customers`, `finance/customers/:id`, `finance/payments/:id` и
  `order-groups/customer-link-issues`.
- URL хранит `tab`, `search` и `customerId`. Выбор заказчика раскрывает последние
  операции, устанавливает `customerId` и тем самым фильтрует оплаты/начисления;
  фильтр можно явно сбросить.
- Таблица оплат показывает способ, сумму, распределение, остаток и cancelled;
  detail с active/released allocations загружается только при раскрытии строки.
  Таблица начислений показывает источник, суммы и серверное состояние, ссылка
  заказа ведет на `/order/:groupID`. Обе таблицы продолжаются кнопкой «Загрузить
  ещё» по server cursor без дубликатов.
- Добавлены loading/error/empty, retry, баннер диагностики старых заказов без
  `customerId`, адаптивная сетка карточек и горизонтальная прокрутка внутри
  таблиц. Статические стили выполнены через Emotion.
- Для MSW добавлены минимальные read-only fixtures summary, списков, detail и
  диагностики.

Уточнение фактического API: требования FA-07 включают агрегированную таблицу
заказчиков, но FA-06 передал только detail одного заказчика. Чтобы не выполнять
N+1 с клиента, в `FinanceReportsService` добавлен read-only
`GET /api/finance/customers?search=`. Он фиксированным набором batched-запросов
возвращает `{ items, meta: { count } }` с `debt`, `advance` и `unallocated`.
Схема БД и mutation API не менялись.

Проверки:

- `npm run coverage -- src/pages/finance/ui/FinancePage.test.tsx` — успешно,
  3 tests: сводка/диагностика/cancelled/длинные значения, URL-фильтр и переход
  в заказ, loading/error;
- client `npm run build` — успешно (существующие предупреждения Vite о
  circular/large chunks);
- точечный client ESLint без `--fix` — успешно;
- `npm run fsd:check` — единственный существующий blocker `src/app/ui`
  (`fsd/no-ui-in-app`); новый finance slice нарушений не добавляет;
- визуально проверены фактический экран, раскрытие allocations и вкладка
  заказчиков на ширине 805 px; переполнение ограничено областью таблицы;
- server finance tests, SQLite e2e, build и точечный ESLint — успешно;
  физический PostgreSQL runtime-прогон по-прежнему недоступен в среде.

Подтвержденные места будущих форм FA-08: действия страницы остаются в
`pages/finance`; после mutations должны инвалидироваться перечисленные SWR
keys summary/list/detail/customer/order. Общие features до второго потребителя
не извлекаются.

<a id="fa-08"></a>
## FA-08. Формы финансовых операций и распределения

**Цель:** завершить основной рабочий сценарий менеджера на странице `/finance`: создать начисление/оплату, распределить, перераспределить и аннулировать.

**Контекст:** архитектура, разделы 5 и 10.2–10.3; результаты FA-03–FA-07; существующие формы Ant Design в [create-order](../client/src/features/create-order/ui/CreateOrderForm.tsx) как стилистический ориентир, но не как место для финансового кода.

**Реализовать:**

- Внутри `pages/finance` добавить форму ручного начисления: customer, title, effectiveDate, amount, comment/reason.
- Добавить форму оплаты: customer, paymentDate, method, amount, externalReference, comment и optional начальная карта allocations.
- После выбора заказчика загружать только его активные начисления с остатками. В форме постоянно показывать «Сумма», «Распределено», «Останется авансом».
- Добавить редактор полной карты распределения существующей оплаты и историю released allocations.
- `requestId` создается один раз на попытку создания и сохраняется при безопасном retry того же payload; при сознательном изменении данных формируется новый ID.
- Отправлять `expectedVersion`; при `409` перечитать запись, сохранить пользовательский черновик и предложить применить его к свежим данным.
- Добавить sync начисления заказа из списка, ручную корректировку, отмену начисления и отмену оплаты с обязательными причинами/датами и подтверждением.
- Для оплаты сверх выбранного остатка не распределять разницу автоматически: явно показать, что она останется авансом, и потребовать подтверждение.
- После mutation инвалидировать summary, соответствующие list/detail, customer и order keys. Не очищать форму до подтвержденного успеха.
- Пока формы используются только здесь, оставить их page-local. Не создавать преждевременно `features/record-payment`.
- Все статические стили оформить Emotion; обеспечить tab order, label, error text и keyboard submit/cancel.

**Тесты и проверка:**

- Создание аванса без allocation, полное/частичное распределение, одна оплата на несколько начислений.
- Перераспределение, пустая карта, released history.
- Чужой customer не появляется в выборе; суммы сверх границ блокируются серверной ошибкой даже при обходе client validation.
- Сохранение requestId при retry и новый ID после изменения payload.
- `409` не теряет введенные данные; loading/double submit не создает дубликат.
- Отмена/корректировка требуют причины и обновляют все зависимые views.
- Client coverage, build, FSD check, ESLint; визуальная проверка и скриншоты основных modal/drawer состояний.

**Приемка:** менеджер выполняет все базовые операции финансового MVP из `/finance`; ошибки сети и конкуренции не создают дубликаты и не теряют черновик.

**Передать дальше:** фактические формы, callbacks, SWR keys, mutation adapters и перечень кода, который действительно требуется переиспользовать на странице заказа.

### Результат FA-08

Реализованы page-local формы основных финансовых операций на `/finance`; код
FA-09 и финансовый блок заказа не добавлялись.

- Добавлены формы ручного начисления и оплаты с выбором заказчика, датой,
  способом оплаты, суммой, внешним номером, комментарием и начальной картой
  распределений. После выбора заказчика список ограничивается его активными
  начислениями с ненулевым остатком.
- Сумма оплаты, распределенная сумма и будущий аванс пересчитываются в minor
  units. Нераспределенный остаток требует явного подтверждения; превышение суммы
  оплаты блокируется до отправки и остается защищено серверной валидацией.
- Для существующей оплаты доступна замена полной карты, включая пустую карту;
  detail сохраняет отдельный показ released allocations и причин освобождения.
- Из списков доступны sync начисления заказа, ручная корректировка, отмена
  начисления и отмена оплаты. Причины и даты обязательны, аннулирование требует
  отдельного подтверждения.
- Mutation adapters добавлены в `shared/api/finance`, а orchestration и UI
  оставлены в `pages/finance`. Новый feature/entity/Zustand не создавался.
- `requestId` стабилен при повторе неизмененного payload и меняется после
  пользовательского редактирования. Double submit блокируется. При `409` запись
  перечитывается, черновик остается в форме, а повтор использует свежую
  `expectedVersion`.
- После успешной команды инвалидируются finance, customer и связанные order
  SWR keys; форма закрывается только после подтвержденного успеха. Остальные
  серверные ошибки показываются в форме и не стирают введенные данные.

Проверки:

- client `npm run coverage -- src/pages/finance/model/finance-attempt.test.ts src/pages/finance/ui/FinanceMutationModals.test.tsx src/pages/finance/ui/FinancePage.test.tsx` — успешно; покрыты advance без allocations, частичное/полное распределение одной оплаты на несколько начислений, released history, стабильность `requestId` и сохранение черновика после `409`;
- client `npm run build` — успешно (существующие предупреждения Vite о
  circular/large chunks);
- точечный client ESLint без `--fix` — успешно;
- `npm run fsd:check` — единственный существующий blocker `src/app/ui`
  (`fsd/no-ui-in-app`); новые файлы finance нарушений не добавляют;
- визуально проверены форма оплаты с расчетом/подтверждением аванса, редактор
  распределений и подтверждение аннулирования на фактическом MSW-экране шириной
  805 px; формы остаются доступны с клавиатуры и прокручиваются по высоте.

Передать в FA-09 при отдельном запуске: `FinanceMutationModals` и
`FinanceDialogAction` сейчас page-local; transport-функции экспортируются через
`shared/api/finance`. Извлекать форму оплаты в feature следует только после
появления второго потребителя на актуальной странице заказа.

<a id="fa-09"></a>
## FA-09. Финансовый блок заказа и извлечение переиспользуемых FSD-модулей

**Цель:** показать и изменять финансы из существующей страницы заказа, извлекая только подтвержденный общий код из FA-08.

**Контекст:** архитектура, разделы 10.4, 11 и 13; результат FA-08. Точки входа: [OrderPage](../client/src/pages/order/ui/OrderPage.tsx), [OrderPageV2](../client/src/pages/order/ui/OrderPageV2.tsx), [order public API](../client/src/pages/order/index.ts), текущие [entities/order](../client/src/entities/order).

**Сначала определить актуальный экран:**

- Проверить маршрутизацию/условия и установить, используется ли `OrderPage`, `OrderPageV2` или оба. Не дублировать блок вслепую.
- Если оба экрана реально доступны, выбрать нижний общий FSD-модуль либо минимальную композицию, не создающую cross-import страниц.

**Реализовать:**

- Добавить финансовый блок заказа: рассчитано по документам, начислено, оплачено распределениями, остаток, разница с текущей ценой и нераспределенный аванс заказчика отдельной строкой.
- Состояния без customerId, без начисления, cancelled начисления и полностью оплаченного заказа имеют явные empty/status варианты.
- Добавить действия «Создать начисление», «Обновить начисление» и «Добавить оплату» с предвыбранными order/customer/accrual.
- Переиспользуемую форму оплаты из FA-08 извлечь в `features/record-payment`, если она действительно используется на `/finance` и странице заказа.
- Переиспользуемые команды начисления извлечь в отдельную feature только если их UI/модель используются в обоих местах; иначе связать page-local actions через общие transport/domain primitives.
- Общую read-модель финансов и минимальный общий UI разрешено вынести в `entities/finance`, потому что появились два page-потребителя. CRUD/HTTP transport остается инфраструктурой `shared/api` или в существующем согласованном транспортном слое.
- Создать/обновить public `index.ts`; страницы импортируют только public API. Feature не импортирует другую feature.
- Перенос не должен изменить поведение `/finance`; выполнить его механически с тестами до добавления order-specific UI.
- Не связывать финансовые статусы с lifecycle/production и не создавать начисление автоматически.

**Тесты и проверка:**

- Заказ без заказчика, без начисления, с частичной/полной оплатой, с авансом заказчика и с несовпадением рассчитанной суммы.
- Создание/sync начисления читает сумму с сервера; предзаполненная оплата распределяется только после явного действия.
- Отмена/завершение заказа не меняет finance; финансовая операция не меняет order status.
- Регрессия `/finance` после извлечения.
- Client coverage, build, FSD check, ESLint; визуальная проверка реального order route и скриншот.

**Приемка:** финансовое состояние заказа понятно без перехода в общий раздел; формы переиспользуются без нарушений FSD и без преждевременных универсальных абстракций.

**Передать дальше:** итоговые public API `entities/finance`/features, фактический OrderPage, invalidation keys и интеграционные ограничения.

### Результат FA-09

Реализован финансовый блок на фактически используемом экране заказа;
`OrderPageV2` не подключен маршрутизацией и не изменялся. Код отчетов FA-10 не
добавлялся.

- `/order/:groupID` экспортирует `pages/order/ui/OrderPage.tsx`; в него добавлен
  адаптивный блок «Финансы заказа» с рассчитанной суммой документов,
  начислением, оплатой по active allocations, остатком, разницей с текущей
  ценой и нераспределенным авансом заказчика.
- Явно отображаются состояния без `customerId`, без начисления, cancelled
  начисления и полной оплаты. Отмена/завершение заказа не связаны с финансовыми
  командами и не вызывают их автоматически.
- Действия «Создать начисление», «Обновить начисление» и «Добавить оплату»
  доступны только по явному нажатию. Оплата открывается с предвыбранными
  заказчиком, начислением и остатком, но не отправляется автоматически.
- Подтвержденный общий workflow FA-08 механически перенесен из `pages/finance`
  в `features/record-payment` с публичным `index.ts`; `/finance` продолжает
  использовать тот же компонент без изменения поведения.
- В `entities/finance` добавлен минимальный public API read-модели заказа:
  `useOrderFinance`, `orderFinanceKey`, `formatFinanceMoney`. HTTP transport и
  DTO остаются в `shared/api/finance`.
- `GET /api/finance/order-groups/:orderGroupId` дополнен `accrualVersion`, чтобы
  sync из заказа отправлял корректный `expectedVersion`; схема БД и mutation
  semantics не изменялись.
- После команд общий invalidation matcher обновляет finance/order keys, поэтому
  блок заказа и `/finance` перечитывают связанные представления.

Проверки:

- client coverage — 4 suites / 16 tests: состояния блока заказа, totals,
  аванс/разница, отсутствие заказчика/начисления, cancelled/paid, предзаполнение
  оплаты без отправки, регрессия `/finance` и сценарии `requestId`/`409`;
- client production build и точечный ESLint без `--fix` — успешно;
- `npm run fsd:check` — только существующий blocker `src/app/ui`
  (`fsd/no-ui-in-app`); новые `entities/finance` и `features/record-payment`
  нарушений не добавляют;
- server finance reports coverage — 1 suite / 5 tests; server build и точечный
  ESLint — успешно;
- визуально проверены фактический `/order/1`, финансовый блок и общая форма
  оплаты с предзаполненным allocation на ширине 805 px; отправка финансовой
  операции во время визуальной проверки не выполнялась.

Public API для следующих задач:
`@entities/finance` экспортирует `useOrderFinance`, `orderFinanceKey` и
`formatFinanceMoney`; `@features/record-payment` экспортирует
`FinanceMutationModals` и `FinanceDialogAction`; transport-функции остаются в
`@shared/api`.

<a id="fa-10"></a>
## FA-10. Отчеты и XLSX-экспорт

**Цель:** реализовать отчеты по оплатам/начислениям и акт взаиморасчетов с устойчивыми историческими итогами.

**Контекст:** архитектура, разделы 4.4, 9 и 12; фактические read-модели FA-06. Клиентский пример XLSX: [export-order-workbook](../client/src/pages/order-print/lib/export-order-workbook.ts).

**Сервер:**

- Реализовать/завершить `FinanceReportsService` и endpoints:
  - `GET /api/finance/reports/turnover`;
  - `GET /api/finance/customers/:customerId/statement`.
- Turnover поддерживает `dateFrom/dateTo`, customer, sourceType, method, status, allocationState и search; возвращает строки и итоги по оплатам/начислениям.
- Statement выводит начальное сальдо, хронологические entries/оплаты/сторно, обороты периода, конечное сальдо и нераспределенный аванс на конец периода.
- Аннулированная оплата отображается положительной строкой на `paymentDate` и отрицательной строкой на `cancellationDate`; прошлый период не исчезает из истории.
- Начисление и корректировки используют собственные `effectiveDate`; reversal не удаляет исходную строку.
- События одной даты сортируются по `createdAt`, затем `id`.
- Отчеты имеют cursor pagination и отдельные totals для полного фильтра, а не только текущей страницы.
- Не вычислять исторический остаток через текущее `status` без учета дат сторно/release.

**Клиент:**

- Добавить вкладку «Отчеты» в `/finance` с типом отчета, периодом и согласованными фильтрами.
- Показать таблицу, начальное/конечное сальдо и обороты; URL хранит воспроизводимые фильтры.
- Экспортировать тот же отфильтрованный набор в XLSX через `@protobi/exceljs`. Не экспортировать только видимую страницу: последовательно получить все cursor-страницы с индикатором прогресса и возможностью отмены.
- В XLSX указать название отчета, период, фильтры, время формирования, денежный формат, итоги и признак отмененных операций.
- Не добавлять PDF, печатный шаблон или новую библиотеку.

**Тесты и проверка:**

- Начальное сальдо до периода; несколько операций одного дня; отмена в другом периоде; корректировка и reversal.
- Итоги полного фильтра не меняются от размера страницы.
- Пустой период, cancelled/released записи, аванс без начисления, несколько заказчиков.
- XLSX содержит все страницы, правильные фильтры/итоги и открывается библиотекой повторно в тесте.
- Server/client coverage, обе сборки, FSD check, ESLint; integration обеих БД и визуальная проверка.

**Приемка:** экран и XLSX дают одинаковые сверяемые итоги; историческая отмена отражается отдельной датой; большие наборы не ограничены текущей UI-страницей.

**Передать дальше:** контракты отчетов, формулы as-of, pagination/export алгоритм, фактические ограничения размера и результаты сверки.

### Результат FA-10

Заполняется агентом после реализации.

<a id="fa-11"></a>
## FA-11. Сквозная приемка PostgreSQL, SQLite, web и desktop

**Цель:** проверить весь финансовый MVP на обновлении существующих данных, реальных транзакциях, UI и отчетной сверке; исправлять только обнаруженные блокирующие дефекты.

**Контекст:** вся [архитектура](financial-accounting-architecture.md), результаты FA-01–FA-10, [server package scripts](../server/package.json), [client package scripts](../client/package.json), desktop-инструкции и package scripts в [desktop](../desktop).

**Подготовить:**

- Создать `docs/financial-accounting-mvp-acceptance.md` с версиями среды, командами, результатами, скриншотами/ссылками, известными ограничениями и явным вердиктом по каждому критерию раздела 17 архитектуры.
- Использовать копии данных. Не выполнять destructive down на пользовательской БД. Зафиксировать процедуру backup SQLite и PostgreSQL перед релизом.

**Сквозные сценарии:**

1. Обновление старой БД: валидные customer snapshots связываются, поврежденные остаются в диагностике, заказы/цены/производство сохранены.
2. Новый заказ → расчет → явное начисление → частичная оплата → вторая оплата → полное погашение.
3. Аванс до начисления → проведение двух заказов → распределение одной оплаты между ними → нераспределенный остаток.
4. Ручная услуга и ее оплата.
5. Изменение цены заказа вверх/вниз, sync, запрет снижения ниже allocation и освобождение лишней суммы.
6. Перераспределение, история released и аннулирование оплаты/начисления.
7. Две конкурентные команды одной версии и сетевой повтор одного `requestId`.
8. Отмена/завершение заказа без автоматического финансового эффекта.
9. Отчеты с начальным сальдо, сторно в другом периоде и сверка XLSX с API/UI.
10. Перезапуск server/desktop и сохранность всех записей.

**Технические проверки:**

- Полная применяемость миграций на копии существующей PostgreSQL и SQLite БД, `foreign_key_check` для SQLite, отсутствие pending schema diff.
- Полные server unit/e2e/coverage в релевантной конфигурации и `npm run build`.
- Полные client tests/coverage, `npm run build`, `npm run fsd:check`.
- Web smoke: маршруты, refresh/deep link, loading/error, формы, скачивание XLSX.
- Desktop smoke: миграция локальной SQLite, запуск, запись, перезапуск, экспорт в разрешенное пользователем место.
- Нагрузочный набор, достаточный для проверки cursor и отсутствия очевидного N+1; документировать объем и время, не устанавливать выдуманный SLA.
- Финальный review diff относительно базы с фокусом на денежную точность, гонки, FK/cascade, SQL portability, обход старых endpoints и FSD boundaries.

**Не делать:**

- Не расширять MVP новыми источниками денег, валютами, ролями или автоматикой.
- Не маскировать отсутствие PostgreSQL-проверки успешной SQLite-проверкой.
- Не переписывать архитектуру задним числом без фиксации отклонения и причины.
- Не выполнять широкую косметическую переработку кода во время приемки.

**Приемка:** все 13 критериев раздела 17 архитектуры имеют доказательство или явно обозначенный blocker; обе БД проверены фактически; критических/высоких дефектов не осталось; документ приемки позволяет повторить проверки.

**Передать пользователю:** итоговый список измененных областей, команды и результаты, миграционные/backup инструкции, ограничения, скриншоты и рекомендацию по выпуску.

### Результат FA-11

Заполняется агентом после реализации.

## Готовый запрос для запуска первой задачи

```text
Выполни только FA-01 из docs/financial-accounting-tasks.md.

Перед работой прочитай AGENTS.md, docs/financial-accounting-architecture.md и
инструкции FA-01. Проверь актуальный код и незакоммиченные изменения. Сделай
минимальный патч в границах FA-01, добавь парные миграции PostgreSQL/SQLite и
тесты. Не создавай финансовые таблицы и не переходи к FA-02.

Запусти релевантные проверки из задачи. Не используй исправляющий lint на всем
репозитории. После реализации заполни раздел «Результат FA-01» фактическими
контрактами, файлами, командами, результатами и ограничениями. Не создавай commit.
```
