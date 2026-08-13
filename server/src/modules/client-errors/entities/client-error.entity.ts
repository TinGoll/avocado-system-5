import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('client_errors')
@Index('IDX_client_errors_createdAt', ['createdAt'])
export class ClientError {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'text', nullable: true })
  stack!: string | null;

  @Column({ type: 'text', nullable: true })
  componentStack!: string | null;

  @Column({ type: 'text' })
  url!: string;

  @Column({ type: 'text' })
  userAgent!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
