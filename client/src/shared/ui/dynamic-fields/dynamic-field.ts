export type DynamicFieldValue = string | number | boolean;
export type DynamicField = { key: string; value: DynamicFieldValue };

export const objectToDynamicFields = (value?: object): DynamicField[] =>
  Object.entries(value ?? {}).map(([key, fieldValue]) => ({
    key,
    value: fieldValue as DynamicFieldValue,
  }));

export const dynamicFieldsToObject = (fields: DynamicField[] = []) =>
  Object.fromEntries(
    fields
      .filter(({ key }) => key.trim())
      .map(({ key, value }) => [key.trim(), value]),
  );
