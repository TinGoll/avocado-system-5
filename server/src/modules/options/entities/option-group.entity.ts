import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class OptionGroup {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    unique: true,
    comment: 'Название группы, например, "Материал" или "Цвет"',
  })
  name: string;
}
