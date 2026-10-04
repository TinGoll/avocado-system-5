import type { ValueTransformer } from 'typeorm';
import { assertSafeMinorAmount } from './finance-money';

export class SafeBigintTransformer implements ValueTransformer {
  to(value: number): number {
    assertSafeMinorAmount(value);
    return value;
  }

  from(value: string | number): number {
    const parsed = typeof value === 'number' ? value : Number(value);
    assertSafeMinorAmount(parsed);
    return parsed;
  }
}
