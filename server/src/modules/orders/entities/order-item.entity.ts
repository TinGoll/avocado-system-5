import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Order } from './order.entity';

@Entity()
export class OrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  order: Order;

  // --- Ссылки и "запеченные" данные ---

  @Column({
    nullable: true,
    comment: 'ID оригинального продукта',
  })
  originalProductId: number;

  @Column({
    type: 'jsonb',
    comment: 'Снимок основных полей продукта (name, etc.)',
  })
  productSnapshot: { name: string };

  @Column({
    type: 'jsonb',
    comment: 'Снимок выбранных опций (Материал: Дуб, Цвет: Белый)',
  })
  optionsSnapshot: { group: string; option: string }[];

  // --- Характеристики конкретной позиции ---

  @Column({ type: 'int' })
  quantity: number;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Кастомные размеры (ширина, высота и т.д.)',
  })
  dimensions: { width?: number; height?: number; [key: string]: any };

  // --- "Запеченные" данные о цене ---

  @Column({
    type: 'float',
    comment: 'Базовая цена за единицу на момент заказа',
  })
  basePrice: number;

  @Column({
    type: 'float',
    comment: 'Цена за единицу после применения всех модификаторов',
  })
  unitPrice: number;

  @Column({
    type: 'float',
    comment: 'Итоговая цена за позицию (unitPrice * quantity)',
  })
  totalPrice: number;
}
