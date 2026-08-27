# PDT-01. Добавить `displayTemplate` продукта для бланка-наряда на сборку

## Цель

Добавить номенклатуре необязательный `displayTemplate`, который формирует дополнительное представление позиции из фиксированного набора переменных. Первым потребителем результата является производственная работа «Сборка»: её существующий `displayNameTemplate` сможет использовать переменную `{{ product.display }}`, а итоговая строка продолжит сохраняться в `productionOperationResults.renderedName` и выводиться существующим бланком-нарядом.

Функция не заменяет `ProductTemplate.name`, `OrderItem.snapshot.name` и существующие подписи номенклатуры. Ни один текущий экран не должен автоматически переключаться на новое представление.

## Инструкции для AI-агента

Перед реализацией:

1. Прочитать [`AGENTS.md`](AGENTS.md).
2. Прочитать план и ограничения центрального реестра [`TEMPLATE_VARIABLE_REGISTRY_TASKS.md`](TEMPLATE_VARIABLE_REGISTRY_TASKS.md).
3. Изучить:
   - [`template-variables.types.ts`](server/src/common/template-variables/template-variables.types.ts);
   - [`template-variable-registry.ts`](server/src/common/template-variables/template-variable-registry.ts);
   - [`template-renderer.service.ts`](server/src/common/template-variables/template-renderer.service.ts);
   - [`product-template.entity.ts`](server/src/modules/products/entities/product-template.entity.ts);
   - [`products.service.ts`](server/src/modules/products/products.service.ts);
   - [`pricing.service.ts`](server/src/modules/pricing/pricing.service.ts);
   - [`order-item.entity.ts`](server/src/modules/orders/entities/order-item.entity.ts);
   - [`production-operation-calculator.service.ts`](server/src/modules/production-operations/production-operation-calculator.service.ts);
   - [`production-order.ts`](client/src/pages/order-print/model/production-order.ts);
   - [`ProductionOrderPrintForm.tsx`](client/src/pages/order-print/ui/ProductionOrderPrintForm.tsx);
   - формы создания и редактирования продукта: [`CreateForm.tsx`](client/src/features/create-production-templates/ui/CreateForm.tsx) и [`ProductTemplateEditForm.tsx`](client/src/pages/catalogs/ui/ProductTemplateEditForm.tsx).
4. Проверить `git status` и не включать в изменение посторонние файлы.
5. Следовать KISS и не добавлять универсальные форматтеры, условия, функции, произвольные характеристики или новый конструктор документов.
6. Сохранить текущий UX названий: списки, селекты, каталог, заказ и клиентский бланк продолжают использовать существующее `name`.
7. Не определять работу «Сборка» сравнением имени, ID из конкретной базы или порядком вкладки. Подключение выполняется декларативно через шаблон работы `{{ product.display }}`.
8. Не коммитить изменения без отдельной команды пользователя.

## Зафиксированное архитектурное решение

### Композиция двух шаблонов

```text
ProductTemplate.displayTemplate
              │
              │ scope: product-output
              ▼
     ProductDisplayTemplateService
              │
              ▼
       product.display
              │
              │ scope: production-operation-name
              ▼
ProductionOperation.displayNameTemplate
              │
              ▼
productionOperationResults.renderedName
              │
              ▼
существующий бланк-наряд работы «Сборка»
```

Пример:

```text
Продукт:
  name: Фасад прямой
  displayTemplate: {{ item.name }} {{ item.height }}×{{ item.width }}, {{ material.name }}

Работа «Сборка»:
  displayNameTemplate: {{ product.display }}

Сохранённый результат:
  renderedName: Фасад прямой 860×500, Дуб
```

Печатный клиент уже выводит `result.renderedName`, поэтому для самого бланка не требуется отдельная ветка по имени работы. Существующая группировка строк по `operationId + renderedName + calculationMethod` сохраняется.

### Историчность

Результат продуктового шаблона вычисляется во время обычного расчёта производственных работ и входит в финальный `renderedName` результата работы. Поэтому:

- изменение `displayTemplate` продукта не меняет ранее сохранённые бланки;
- новые позиции и явный перерасчёт используют актуальный шаблон;
- правила автоматического и ручного перерасчёта заказа не меняются;
- отдельные поля снимка для продуктового шаблона на этом этапе не нужны.

### Отсутствующий шаблон

- `displayTemplate` продукта является необязательным.
- Если ни одна назначенная работа не использует `product.display`, отсутствие шаблона ни на что не влияет.
- Если работа ссылается на `{{ product.display }}`, а у продукта нет непустого `displayTemplate`, расчёт должен завершиться контролируемой ошибкой `MISSING_VALUE` для `product.display`.
- Не подставлять `ProductTemplate.name` молча: это скроет ошибку настройки сборочной работы или номенклатуры.

## Контракт переменных

### Новый scope

Добавить:

```ts
PRODUCT_OUTPUT: 'product-output'
```

в `TEMPLATE_VARIABLE_SCOPE`.

### Переменные `product-output`

Для MVP разрешить только существующие фиксированные данные:

| Переменная | Тип | Источник |
| --- | --- | --- |
| `item.name` | string | системное название продукта из снимка позиции |
| `item.width` | number | ширина позиции, мм |
| `item.height` | number | высота позиции, мм |
| `item.thickness` | number | толщина позиции, мм |
| `item.quantity` | number | количество, шт. |
| `material.name` | string | выбранный материал заказа |
| `color.name` | string | выбранный цвет заказа |
| `patina.name` | string | выбранная патина заказа |
| `profile.name` | string | выбранный профиль заказа |
| `panel.name` | string | выбранная филёнка заказа |
| `varnish.name` | string | выбранный лак заказа |

Расширить scopes уже зарегистрированных `item.*`, `profile.name` и `panel.name`. Добавить определения `material.name`, `color.name`, `patina.name`, `varnish.name` только для `product-output`.

Не добавлять в MVP:

- `attributes.*`;
- `defaultCharacteristics.*`;
- произвольные `item.characteristics.*`;
- комментарии заказа и позиции;
- форматтеры и условные выражения.

### Переменная потребителя

Добавить строковую переменную:

```text
product.display
```

только в scope `production-operation-name`. В арифметической формуле работы она недоступна.

## Серверная реализация

### 1. Общий рендерер

Добавить публичную проверку синтаксиса и разрешённых путей без чтения значений, которая возвращает найденные переменные, например:

```ts
const { usedVariables } = templateRenderer.validate({
  scope: TEMPLATE_VARIABLE_SCOPE.PRODUCT_OUTPUT,
  template,
});
```

Метод должен использовать тот же parser, что `render`, не дублировать регулярные выражения и возвращать уникальные пути в порядке появления. Он нужен также для определения, использует ли конкретная работа `product.display`, без попытки преждевременно отрендерить её шаблон. Текущие результаты и ошибки `render` не менять. Перевести внутреннюю проверку шаблона работы на этот метод только если это уменьшает дублирование и все существующие тесты остаются неизменными; отдельный рефакторинг формульной части запрещён.

### 2. Модель продукта и миграции

Добавить в `ProductTemplate`:

```ts
displayTemplate?: string | null;
```

Требования:

- колонка nullable;
- максимальная длина `500` символов, заданная одной серверной константой;
- create/update DTO принимают необязательную строку;
- пустая или состоящая из пробелов строка нормализуется в `null` либо отклоняется единообразно; предпочтительно нормализовать в `null` на клиенте и сервере;
- при create/update непустой шаблон валидируется через scope `product-output` до сохранения;
- ошибки возвращают HTTP 400 со структурой, позволяющей привязать сообщение к полю `displayTemplate`.

Создать отдельные миграции PostgreSQL и SQLite. Существующие продукты получают `NULL`; backfill шаблоном имени не выполнять. Добавить migration-тест в принятом в репозитории стиле.

### 3. Доменный сервис продуктового шаблона

В модуле `products` создать сфокусированный сервис, например `ProductDisplayTemplateService`, который:

- зависит от `TemplateRendererService` через constructor injection;
- валидирует `displayTemplate`;
- строит безопасный контекст из простого типизированного item-контракта и неизвестного снимка характеристик заказа;
- рендерит scope `product-output`;
- преобразует ошибки общего рендерера в доменную ошибку поля `displayTemplate`.

Сервис не должен импортировать `Order`, `OrderItem` или `PricingService`. Передавать ему минимальные данные:

```ts
type ProductDisplayItemContext = {
  name: string;
  width?: number;
  height?: number;
  thickness?: number;
  quantity: number;
};
```

Экспортировать сервис из `ProductsModule`. Импортировать `TemplateVariablesModule` в `ProductsModule`, а `ProductsModule` — в `PricingModule`. Не использовать `forwardRef`; при появлении циклической зависимости остановиться и пересмотреть направление импортов.

### 4. Preview продукта

Добавить endpoint до динамического `GET /products/:id`:

```http
POST /products/display-template/preview
```

DTO содержит:

- `displayTemplate`;
- тестовые `item.name`, размеры и количество;
- опциональные снимки материала, цвета, патины, профиля, филёнки и лака в форме, совместимой с текущими `order.characteristics`.

Ответ:

```json
{
  "renderedValue": "Фасад прямой 860×500, Дуб"
}
```

Не принимать произвольный объект контекста и не позволять клиенту передавать собственный scope.

### 5. Подключение к расчёту работ

В [`PricingService.calculateProductionCost`](server/src/modules/pricing/pricing.service.ts) до обхода назначенных работ:

1. Построить текущий контекст позиции.
2. Через общий `validate`/inspect определить, использует ли хотя бы одна назначенная работа переменную `product.display` в своём `displayNameTemplate`.
3. Только если такая работа есть, проверить наличие `template.displayTemplate` и один раз отрендерить продуктовый вывод.
4. Добавить результат в контекст шаблона работы как `product.display`.
5. Рассчитать все работы существующим калькулятором.

Не рендерить продуктовый шаблон отдельно для каждой работы. Не добавлять его в арифметический контекст формулы. Если ни одна назначенная работа не использует `product.display`, наличие продуктового шаблона и отсутствующих в текущем заказе значений не должно влиять на расчёт остальных работ. Если `product.display` используется, отсутствующая переменная продуктового шаблона должна дать контролируемую runtime-ошибку соответствующего пути.

Расширить `ProductionOperationFormulaContext` опциональным:

```ts
product?: {
  display?: string;
};
```

`deriveContext` обязан сохранить это значение. `product.display` регистрируется только для шаблона названия работы, поэтому формульный parser его отвергает.

Не менять формат `OrderItemProductionOperationResult`: финальная строка уже сохраняется в `renderedName`.

### 6. Настройка работы «Сборка»

Не выполнять миграцию или поиск работы по имени. После выпуска пользователь вручную задаёт существующей работе «Сборка» шаблон:

```text
{{ product.display }}
```

При необходимости к нему можно добавить обычные переменные работы:

```text
{{ product.display }} — {{ item.quantity }} шт.
```

Переменная `product.display` должна появиться в существующем редакторе работ автоматически через API метаданных реестра с пометкой «Только шаблон названия».

## Клиентская реализация

### 1. Общий API метаданных

С появлением второго потребителя вынести общие типы и запрос одного scope из feature работ в инфраструктурный публичный API, например:

```text
client/src/shared/api/template-variables/
```

Сохранить в `features/create-production-operation` только объединение двух scopes и доменную пометку `formula-and-name | name-only`. Не переносить продуктовую бизнес-логику в `shared`.

Обновить union scope значением `product-output` и MSW handler. Существующий редактор работ не должен визуально измениться, кроме появления `product.display`.

### 2. Типы и нормализация продукта

Добавить `displayTemplate?: string | null` в клиентский `ProductTemplate`, create DTO и модель редактирования. При отправке нормализовать пустое значение в `null`/`undefined` согласно серверному контракту.

### 3. Редактор продуктового шаблона

Создать внутри существующего `features/create-production-templates` переиспользуемый блок полей, применяемый:

- в форме создания продукта;
- в `ProductTemplateEditForm` через публичный API feature.

Блок содержит:

- необязательное поле «Шаблон вывода для сборки»;
- список переменных scope `product-output` из API;
- предзаполненные тестовые значения;
- debounce-preview;
- результат строки;
- привязку серверной ошибки к `displayTemplate`;
- независимые состояния ошибки справочника и preview.

Ошибка загрузки метаданных не должна очищать форму или блокировать сохранение уже валидного шаблона. Если поле пустое, preview не вызывается.

### 4. Бланк-наряд

Не добавлять в печатную страницу проверку `operationName === 'Сборка'`. Существующие [`buildProductionOrderDocuments`](client/src/pages/order-print/model/production-order.ts) и [`ProductionOrderPrintForm`](client/src/pages/order-print/ui/ProductionOrderPrintForm.tsx) должны продолжить работать через сохранённый `result.renderedName`.

Допустимы только тесты, подтверждающие, что строка, полученная из `product.display`, группируется и печатается как обычная производственная строка. Если production-код печатной страницы не требует изменений, не менять его.

## Тестирование

### Сервер

Добавить или обновить тесты:

- реестр:
  - scope `product-output` содержит точный MVP-набор;
  - `product.display` доступен только в `production-operation-name`;
- общий рендерер:
  - `validate` проверяет синтаксис и scope без значений;
  - поведение существующего `render` не изменилось;
- DTO продукта:
  - длина, optional/null и неправильный тип;
- `ProductsService`/`ProductDisplayTemplateService`:
  - валидный create/update;
  - неизвестная переменная;
  - preview с полным и неполным контекстом;
- `PricingService`:
  - работа с `{{ product.display }}` сохраняет ожидаемый `renderedName`;
  - работа без этой переменной ведёт себя как раньше;
  - продукт без шаблона не влияет на обычные работы;
  - ссылка на `product.display` без шаблона даёт контролируемую ошибку;
  - продуктовый шаблон рендерится один раз на позицию;
  - продуктовый шаблон не рендерится, если ни одна назначенная работа не использует `product.display`;
- Orders/OrderGroups:
  - новый результат фиксируется при создании и обычном перерасчёте;
  - ранее сохранённый результат не меняется без перерасчёта;
- миграции PostgreSQL и SQLite;
- существующие e2e производственных работ без изменения ожиданий.

### Клиент

Добавить или обновить тесты:

- общий запрос метаданных и MSW mock для `product-output`;
- создание продукта отправляет `displayTemplate`;
- пустой шаблон нормализуется;
- редактирование и preview;
- серверная ошибка привязывается к полю;
- редактор работ показывает `product.display` как переменную только шаблона;
- модель бланка группирует сборочные строки по финальному `renderedName`;
- существующие селекты и названия продукта продолжают использовать `name`.

## Критерии приёмки

- У продукта есть необязательный валидируемый `displayTemplate`.
- Существующие продукты мигрируют с `NULL` без изменения поведения.
- Пользователь может настроить и предварительно просмотреть шаблон при создании и редактировании продукта.
- Реестр является единственным источником разрешённых путей и UI-описаний.
- Работа может использовать `{{ product.display }}` только в `displayNameTemplate`.
- Работа «Сборка» с шаблоном `{{ product.display }}` сохраняет итоговую строку в существующем `productionOperationResults.renderedName`.
- Бланк-наряд отображает эту строку без распознавания работы по имени и без отдельной логики печати.
- Обычные названия продуктов и существующий UX не изменены.
- Изменение продуктового шаблона не переписывает сохранённые результаты без штатного перерасчёта.
- Обе миграции, серверные и клиентские тесты, lint и production build проходят.

## Рекомендуемые команды проверки

```text
server:
npm test
npm run test:e2e
npm run build

client:
npm test
npm run build
```

Перед завершением выполнить `git diff --check` и повторно проверить `git status`, поскольку lint-команды проекта могут модифицировать файлы.

## Вне объёма

- замена `ProductTemplate.name` или `OrderItem.snapshot.name`;
- автоматический выбор работы по имени «Сборка»;
- отдельный новый тип печатного документа;
- изменение таблицы и колонок существующего производственного бланка;
- новый формат `productionOperationResults`;
- автоматический массовый перерасчёт старых заказов;
- динамические пользовательские характеристики;
- форматтеры, условия, циклы и функции в шаблоне;
- использование `product.display` в арифметических формулах;
- автоматическое заполнение шаблона существующим продуктам.
