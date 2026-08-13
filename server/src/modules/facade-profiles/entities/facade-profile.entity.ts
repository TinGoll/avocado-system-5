import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DatabaseJsonColumn } from 'src/modules/database/database-json-column';

@Entity('facade_profiles')
export class FacadeProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', unique: true })
  name: string;

  @DatabaseJsonColumn({ defaultEmptyObject: true })
  characteristics: Record<string, string | number | boolean>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
