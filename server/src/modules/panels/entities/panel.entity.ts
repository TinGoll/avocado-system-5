import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DatabaseJsonColumn } from 'src/modules/database/database-json-column';

@Entity('panels')
export class Panel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', unique: true })
  name: string;

  @DatabaseJsonColumn({ defaultEmptyObject: true })
  characteristics: Record<string, string | number | boolean>; // Уникальные характеристики (размеры и т.д.)

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
