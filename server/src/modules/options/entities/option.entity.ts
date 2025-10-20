import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { OptionGroup } from './option-group.entity';

@Entity()
export class OptionValue {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ comment: 'Значение опции, например, "Дуб", "Ольха", "Белый лак"' })
  name: string;

  @ManyToOne(() => OptionGroup, { eager: true, onDelete: 'RESTRICT' })
  group: OptionGroup;
}
