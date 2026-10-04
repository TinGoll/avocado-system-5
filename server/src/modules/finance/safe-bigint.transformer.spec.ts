import { SafeBigintTransformer } from './safe-bigint.transformer';

describe('SafeBigintTransformer', () => {
  const transformer = new SafeBigintTransformer();

  it('reads PostgreSQL strings and SQLite integers identically', () => {
    expect(transformer.from('12345')).toBe(12345);
    expect(transformer.from(12345)).toBe(12345);
    expect(transformer.to(12345)).toBe(12345);
  });

  it.each(['1.5', 'not-a-number', '9007199254740992'])(
    'rejects unsafe database value %s',
    (value) => expect(() => transformer.from(value)).toThrow(RangeError),
  );
});
