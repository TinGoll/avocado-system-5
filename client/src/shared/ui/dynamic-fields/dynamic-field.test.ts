import { dynamicFieldsToObject, objectToDynamicFields } from './dynamic-field';

describe('dynamic fields conversion', () => {
  it('preserves strings, numbers and booleans', () => {
    const value = { color: 'green', thickness: 20, available: true };

    expect(dynamicFieldsToObject(objectToDynamicFields(value))).toEqual(value);
  });

  it('ignores empty keys and trims field names', () => {
    expect(
      dynamicFieldsToObject([
        { key: '  holes ', value: 4 },
        { key: ' ', value: 'ignored' },
      ]),
    ).toEqual({ holes: 4 });
  });
});
