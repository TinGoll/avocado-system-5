import { Column, type ColumnOptions } from 'typeorm';
import { getDatabaseKind } from './database-kind';

export type DatabaseJsonColumnOptions = Omit<
  ColumnOptions,
  'type' | 'default'
> & {
  default?: ColumnOptions['default'];
  defaultEmptyObject?: boolean;
  defaultEmptyArray?: boolean;
};

export function DatabaseJsonColumn(
  options: DatabaseJsonColumnOptions = {},
): PropertyDecorator {
  const {
    defaultEmptyObject = false,
    defaultEmptyArray = false,
    ...columnOptions
  } = options;
  const isPostgres = getDatabaseKind() === 'postgres';
  const emptyJsonDefault = defaultEmptyArray ? '[]' : '{}';

  return Column({
    ...columnOptions,
    type: isPostgres ? 'jsonb' : 'simple-json',
    ...(defaultEmptyObject || defaultEmptyArray
      ? {
          default: isPostgres
            ? () => `'${emptyJsonDefault}'::jsonb`
            : () => `'${emptyJsonDefault}'`,
        }
      : {}),
  });
}
