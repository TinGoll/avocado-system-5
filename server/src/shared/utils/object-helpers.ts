import { OrderItem } from 'src/modules/orders/entities/order-item.entity';
import { Order } from 'src/modules/orders/entities/order.entity';
import { PriceModifier } from 'src/modules/price-modifiers/entities/price-modifier.entity';
import { ProductionOperation } from 'src/modules/production-operations/entities/production-operation.entity';
import { ProductTemplate } from 'src/modules/products/entities/product-template.entity';

// Тип для "счетчика". Используем длину кортежа для отслеживания глубины.
type Prev = [never, 0, 1, 2, 3, 4, 5, ...0[]];

type StopRecursing =
  | Order
  | OrderItem
  | ProductTemplate
  | PriceModifier
  | ProductionOperation
  | Date;

/**
 * Генерирует все возможные "пути" для вложенного объекта с ограничением глубины.
 * @template T - Объект для анализа.
 * @template D - Счетчик глубины рекурсии (по умолчанию 5).
 */
export type Paths<T, D extends number = 5> = [D] extends [never]
  ? never
  : T extends object
    ? {
        // Для каждого ключа K в объекте T...
        [K in keyof T]-?: K extends string | number
          ? // сам ключ K является валидным путем
            | `${K}`
              // Проверяем тип СВОЙСТВА (T[K]), а не всего объекта T.
              | (T[K] extends StopRecursing
                  ? never // Если свойство - это сложная сущность, не идем вглубь.
                  : // Иначе, рекурсивно строим путь.
                    Paths<T[K], Prev[D]> extends infer P
                    ? P extends string | number // Убеждаемся, что вложенный путь валиден
                      ? `${K}.${P}` // Соединяем текущий ключ и вложенный путь
                      : never
                    : never)
          : never;
      }[keyof T]
    : never;
/**
 * Определяет тип значения по заданному пути P в объекте T.
 */
export type PathValue<T, P extends string> = P extends `${infer K}.${infer R}`
  ? K extends keyof T
    ? PathValue<T[K], R>
    : undefined
  : P extends keyof T
    ? T[P]
    : undefined;

// Перегрузка функции для случая без значения по умолчанию
export function get<T extends object, P extends Paths<T>>(
  obj: T,
  path: P,
): PathValue<T, P>;

// Перегрузка для случая со значением по умолчанию
export function get<T extends object, P extends Paths<T>, D>(
  obj: T,
  path: P,
  defaultValue: D,
): NonNullable<PathValue<T, P>> | D;

export function get<T extends object, P extends Paths<T>, D>(
  obj: T,
  path: P,
  defaultValue?: D,
): PathValue<T, P> | D | undefined {
  // Преобразуем строковый путь в массив ключей
  const keys = path.split('.') as (keyof T)[];

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const result = keys.reduce(
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
    (currentObject, key) => (currentObject ? currentObject[key] : undefined),
    obj as any,
  );

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return result !== undefined && result !== null ? result : defaultValue;
}
