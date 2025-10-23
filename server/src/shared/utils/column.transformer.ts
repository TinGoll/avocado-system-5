export class ColumnNumericTransformer {
  /**
   * Используется для преобразования данных из БД число.
   * @param value - значение из базы данных
   */
  from(value: string): number | null {
    if (value === null) {
      return null;
    }
    return parseFloat(value);
  }

  /**
   * Используется для преобразования данных из число в БД строка.
   * @param value - значение
   */
  to(value: number): number {
    return value;
  }
}
