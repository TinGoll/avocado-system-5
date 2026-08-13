import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

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

  @Column({
    type: 'simple-enum',
    enum: CustomerLevel,
    enumName: 'customers_level_enum',
  })
  level!: CustomerLevel;
}
