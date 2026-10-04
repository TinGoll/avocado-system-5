import { Column, CreateDateColumn } from 'typeorm';
import { getDatabaseKind } from '../database/database-kind';

const dateTimeType = () =>
  getDatabaseKind() === 'sqlite'
    ? ('datetime' as const)
    : ('timestamptz' as const);

export const FinanceDateTimeColumn = () =>
  Column({ type: dateTimeType(), nullable: true });

export const FinanceCreateDateColumn = () =>
  CreateDateColumn({ type: dateTimeType() });
