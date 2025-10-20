import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum ModifierType {
  PERCENTAGE_MULTIPLIER = 'percentage_multiplier', // Множитель (1.2 => +20%)
  FIXED_ADDITION = 'fixed_addition', // Фиксированная надбавка
}

@Entity()
export class Modifier {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    comment: 'Внутреннее название, например, "Наценка за материал"',
  })
  name: string;

  @Column({ type: 'enum', enum: ModifierType })
  type: ModifierType;

  @Column({ type: 'float' })
  value: number;
}
