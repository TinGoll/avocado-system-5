import { Column, type ColumnOptions } from 'typeorm';
import { getDatabaseKind } from './database-kind';

export type DatabaseJsonColumnOptions = Omit<
  ColumnOptions,
  'type' | 'default'
> & {
  default?: ColumnOptions['default'];
  defaultEmptyObject?: boolean;
};

export function DatabaseJsonColumn(
  options: DatabaseJsonColumnOptions = {},
): PropertyDecorator {
  const { defaultEmptyObject = false, ...columnOptions } = options;
  const isPostgres = getDatabaseKind() === 'postgres';

  return Column({
    ...columnOptions,
    type: isPostgres ? 'jsonb' : 'simple-json',
    ...(defaultEmptyObject
      ? { default: isPostgres ? () => "'{}'::jsonb" : () => "'{}'" }
      : {}),
  });
}
