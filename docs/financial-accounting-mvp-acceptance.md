# Приемка финансового MVP

Дата проверки: 27 сентября 2026 года. Базовый commit функциональности:
`502b164` (`finance: add reports and xlsx export`).

## Итог

Рекомендация по выпуску: **NO-GO**.

Функциональность и миграции SQLite проходят автоматические проверки, web-сценарии
покрыты тестами и фактическим smoke предыдущего этапа. Выпуск блокируют две
непроверенные обязательные части FA-11:

- в среде отсутствуют `docker`, `psql`, `pg_dump` и `pg_restore`, поэтому миграции
  и сквозные сценарии не были фактически выполнены на PostgreSQL;
- desktop-пакет собирается, но новый изолированный экземпляр нельзя запустить из-за
  уже работающего single-instance приложения. Запись, перезапуск и экспорт через
  desktop UI на копии данных не подтверждены.

Критических или высоких дефектов в проверенной SQLite/web-конфигурации не найдено.
При приемке исправлены только тестовые блокеры: подготовительные миграционные тесты
теперь не запускают более новые зависимые миграции раньше проверяемой, а тяжелому
Ant Design тесту задан локальный timeout 10 секунд. Производственное поведение от
этих исправлений не изменилось.

## Среда

- Windows, часовой пояс `Europe/Moscow`;
- Node.js `v24.14.1`, npm `11.11.0`;
- NestJS `11`, TypeORM `0.3.31`, `better-sqlite3` `12.11.1`, PostgreSQL driver
  `pg` `8.16.3`;
- React `19.1.1`, Vite `7.3.6`, Vitest `3.2.7`;
- Electron `42.11.1`, desktop `5.0.5`.

Проверки выполнялись на рабочем дереве репозитория. Пользовательские БД не
изменялись. SQLite migration specs используют disposable in-memory копии старой
схемы и данных; SQLite e2e также создает отдельную тестовую БД.

## Команды и результаты

| Область | Команда | Результат |
| --- | --- | --- |
| Server unit/coverage | `cd server; npm run test:cov -- --runInBand` | PASS: 36 suites, 200 tests |
| Server full e2e | `cd server; npm run test:e2e -- --runInBand` | PASS: 6 suites, 57 tests |
| SQLite e2e | `cd server; npm run test:e2e:sqlite` | PASS: 1 suite, 5 tests |
| Server build | `cd server; npm run build` | PASS |
| Server ESLint | `npx eslint` по измененным `*.spec.ts` | PASS |
| Client coverage | `cd client; npm run coverage` | PASS: 41 files, 137 tests |
| Client build | `cd client; npm run build` | PASS; только предупреждения о circular/large chunks |
| Client ESLint | `npx eslint` по измененному тесту | PASS |
| FSD | `cd client; npm run fsd:check` | BLOCKED: прежний `src/app/ui` (`fsd/no-ui-in-app`) |
| Desktop build | `cd desktop; npm run build` | PASS |
| Desktop package | `NODE_OPTIONS=--use-system-ca; npx electron-forge package` | PASS |
| PostgreSQL | CLI/контейнер и тестовая БД | BLOCKED: инструменты недоступны |

Первый запуск Forge без системного CA завершился ошибкой проверки сертификата;
повтор с `NODE_OPTIONS=--use-system-ca` успешно создал win32-x64 package. Это
ограничение среды сборки, а не приложения.

## Сквозные сценарии

| № | Сценарий | Статус и доказательство |
| --- | --- | --- |
| 1 | Миграция старой БД и customer snapshots | PASS на SQLite: `add-order-group-customer-link.migration.spec.ts`, `add-order-management.migration.spec.ts`, `database-sqlite.e2e-spec.ts`; PostgreSQL BLOCKED |
| 2 | Заказ, начисление, две частичные оплаты | PASS в service/UI тестах начислений, оплат и allocations; PostgreSQL/desktop BLOCKED |
| 3 | Аванс, два заказа, одна оплата на два начисления | PASS в `finance-allocations.service.spec.ts` и read/report tests |
| 4 | Ручная услуга и оплата | PASS в `finance-accruals.service.spec.ts` и DTO/UI tests |
| 5 | Изменение цены вверх/вниз и sync | PASS в `finance-accruals.service.spec.ts`, включая ограничение allocation и release |
| 6 | Перераспределение, released history и отмены | PASS в allocation/payment/accrual service tests и `FinanceMutationModals.test.tsx` |
| 7 | Конкурентная версия и повтор `requestId` | PASS в command service tests: optimistic version conflict и idempotent retry |
| 8 | Отмена/завершение заказа без автоэффекта | PASS по отсутствию финансовой автоматики и order/finance regression tests |
| 9 | Opening balance, сторно другого периода, API/UI/XLSX | PASS: `finance-reports.service.spec.ts`, `FinancePage.test.tsx`, workbook и collector tests; фактический `/finance?tab=reports` проверен в FA-10 |
| 10 | Перезапуск server/desktop и сохранность | PARTIAL: SQLite migration/e2e PASS, desktop build/package PASS; desktop UI restart BLOCKED single-instance приложением |

Web smoke фактически проверял `/finance?tab=reports` на FA-10: deep link, фильтры,
итоги, таблица, горизонтальная прокрутка и доступность XLSX. Refresh/deep-link,
loading/error и формы дополнительно покрыты `routesElements.test.tsx`,
`FinancePage.test.tsx` и `FinanceMutationModals.test.tsx`. Во время smoke не
создавались денежные операции и не изменялись пользовательские данные. Отдельного
скриншота FA-11 нет.

## Нагрузка и cursor

Тест `walks a 205-row turnover through three cursor pages without duplicates`
создает 205 платежей с одинаковой бизнес-датой и получает страницы `100/100/5`.
Все 205 ID уникальны, `totals.count` одинаков на каждой странице. На текущей среде
сам сценарий занял около `0,46 с`, полный spec — около `8,1 с`. Это наблюдение, а
не SLA.

Очевидного N+1 в проверенном пути нет: отчет получает страницу и итоги
агрегирующими SQL-запросами, а не выполняет запрос на каждую строку. Для
production-объема отдельно нужны PostgreSQL `EXPLAIN (ANALYZE, BUFFERS)` и метрики
реального набора данных.

## Критерии раздела 17

1. **PASS** — оплату можно зарегистрировать без заказа.
2. **PASS** — одну оплату можно распределить на несколько начислений.
3. **PASS** — заказ можно оплачивать частями.
4. **PASS** — транзакционные проверки запрещают over-allocation обеих сторон.
5. **PASS** — нераспределенный остаток показывается как общий аванс.
6. **PASS** — order/manual используют общий `FinancialAccrual`.
7. **PASS** — изменение цены создает entry-корректировку, не переписывая initial.
8. **PASS** — карточка заказа показывает рассчитано, начислено, оплачено, остаток.
9. **PASS** — страница заказчика показывает долг/аванс и историю.
10. **PASS** — отчеты сверяют totals и экспортируются в XLSX.
11. **PASS** — отмены требуют причину и остаются в истории.
12. **PASS** — `requestId`, транзакции и optimistic version защищают от дублей и гонок.
13. **BLOCKED** — SQLite подтвержден, PostgreSQL и полный desktop smoke не выполнены.

## Миграции и backup перед релизом

### SQLite desktop

1. Полностью закрыть Avocado 5 и убедиться, что процессов приложения не осталось.
2. Найти `avocado.sqlite` в Electron `userData/Avocado v5`. Не выполнять `down` на
   пользовательском файле.
3. Скопировать файл в каталог резервных копий с датой и временем. Если приложение
   не удалось остановить, использовать SQLite online backup API/`.backup`, а не
   копировать только основной файл при активных `-wal`/`-shm`.
4. Зафиксировать SHA-256 исходника и копии (`Get-FileHash -Algorithm SHA256`) и
   размер файла.
5. На отдельной копии выполнить миграции, затем `PRAGMA integrity_check;` и
   `PRAGMA foreign_key_check;`. Первый запрос должен вернуть `ok`, второй — ноль
   строк. Оригинал хранить до завершения приемки обновления.

### PostgreSQL

1. Зафиксировать версию сервера и список примененных миграций; прекратить запись
   приложения на время согласованного окна.
2. Создать custom backup:
   `pg_dump --format=custom --no-owner --file=avocado-YYYYMMDD-HHMM.dump DB_NAME`.
3. Проверить читаемость: `pg_restore --list avocado-YYYYMMDD-HHMM.dump`.
4. Восстановить dump в отдельную тестовую БД, применить миграции там и выполнить
   сквозную сверку строк, FK и финансовых итогов. Не использовать production как
   площадку для rehearsal и не выполнять destructive `migration:revert`.
5. Только после успешного rehearsal применить миграции в release window; сохранить
   dump и журнал команд до подтверждения выпуска.

## Финальный review

Проверены денежные суммы в minor units, транзакционные границы, optimistic version,
уникальность `requestId`, FK/cascade, SQLite/PostgreSQL-разветвление миграций,
cursor ordering, as-of формулы и отсутствие новых обходных write-endpoints. Новые
FA-11 изменения ограничены тестами и этим отчетом; FSD-границы production-кода не
менялись.

Для снятия `NO-GO` необходимо повторить матрицу на восстановленной PostgreSQL-копии,
выполнить desktop UI сценарий на изолированной копии с записью, перезапуском и XLSX
экспортом, а затем сохранить фактические результаты в этом документе.
