import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    unique: true,
    comment: 'Название продукта',
  })
  name: string;

  @Column({ type: 'float', comment: 'Базовая цена' })
  basePrice: number;
}
