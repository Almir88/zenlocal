import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('prompt_logs')
export class PromptLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (user) => user.promptLogs)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'text' })
  prompt: string;

  @Column({ name: 'branch_name', type: 'varchar', length: 255, nullable: true })
  branchName: string | null;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ name: 'branch_created_at', type: 'timestamp', nullable: true })
  branchCreatedAt: Date | null;
}
