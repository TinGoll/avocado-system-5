import { Product } from './product.entity';
import { Modifier } from 'src/modules/modifiers/entities/modifier.entity';
import { OptionValue } from 'src/modules/options/entities/option.entity';
import { Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class ProductOptionModifier {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Product, {
    onDelete: 'CASCADE',
  })
  product: Product;

  @ManyToOne(() => OptionValue, {
    onDelete: 'CASCADE',
  })
  option: OptionValue;

  @ManyToOne(() => Modifier, {
    onDelete: 'RESTRICT',
    eager: true,
  })
  modifier: Modifier;
}
