import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PromptLog } from '../entities/prompt-log.entity';

@Injectable()
export class PromptLogService {
  constructor(
    @InjectRepository(PromptLog)
    private repo: Repository<PromptLog>,
  ) {}

  async log(
    userId: string,
    prompt: string,
    branchName: string | null,
  ): Promise<{ id: string }> {
    const entry = this.repo.create({ userId, prompt, branchName });
    const saved = await this.repo.save(entry);
    return { id: saved.id };
  }

  async setBranchCreatedAt(logId: string): Promise<void> {
    await this.repo.update(logId, {
      branchCreatedAt: new Date(),
    });
  }

  async findAll() {
    const logs = await this.repo.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: 200,
    });
    return logs.map(({ user, ...log }) => ({
      ...log,
      user: user ? { id: user.id, email: user.email, name: user.name, role: user.role?.name } : null,
    }));
  }
}
