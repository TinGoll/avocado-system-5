import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { DatabaseJsonColumn } from '../../database/database-json-column';

export enum CustomerLevel {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
}

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text', unique: true })
  name!: string;

  @Column({ type: 'text', nullable: true })
  companyName?: string | null;

  @Column({ type: 'text', nullable: true })
  address?: string | null;

  @Column({ type: 'text', nullable: true })
  phone?: string | null;

  @Column({ type: 'text', nullable: true })
  email?: string | null;

  @Column({ type: 'text', nullable: true })
  comment?: string | null;

  @DatabaseJsonColumn({ defaultEmptyObject: true })
  attributes!: Record<string, string | number | boolean>;

  @Column({
    type: 'simple-enum',
    enum: CustomerLevel,
    enumName: 'customers_level_enum',
  })
  level!: CustomerLevel;
}
