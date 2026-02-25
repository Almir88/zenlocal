import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PromptLog } from '../entities/prompt-log.entity';
import type { PromptLogListItem } from './interfaces/prompt-log-list-item.interface';

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

  async count(filters?: { from?: Date; to?: Date }): Promise<number> {
    const qb = this.repo.createQueryBuilder('log');
    if (filters?.from)
      qb.andWhere('log.createdAt >= :from', { from: filters.from });
    if (filters?.to) qb.andWhere('log.createdAt <= :to', { to: filters.to });
    return qb.getCount();
  }

  async findAll(opts?: {
    page?: number;
    limit?: number;
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
    branchName?: string;
  }): Promise<{ items: PromptLogListItem[]; total: number }> {
    const empty = { items: [] as PromptLogListItem[], total: 0 };
    try {
      const page = Math.max(1, opts?.page ?? 1);
      const limit = Math.min(500, Math.max(1, opts?.limit ?? 50));
      const skip = (page - 1) * limit;

      const qb = this.repo
        .createQueryBuilder('log')
        .leftJoinAndSelect('log.user', 'user')
        .orderBy('log.createdAt', 'DESC')
        .skip(skip)
        .take(limit);

      if (opts?.userId)
        qb.andWhere('log.userId = :userId', { userId: opts.userId });
      if (opts?.dateFrom)
        qb.andWhere('log.createdAt >= :dateFrom', { dateFrom: opts.dateFrom });
      if (opts?.dateTo)
        qb.andWhere('log.createdAt <= :dateTo', { dateTo: opts.dateTo });
      if (opts?.branchName)
        qb.andWhere('log.branchName ILIKE :branch', {
          branch: `%${opts.branchName}%`,
        });

      const [logs, total] = await qb.getManyAndCount();

      const items = logs.map(({ user, ...log }) => ({
        ...log,
        user: user
          ? {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role?.name ?? '',
            }
          : null,
      }));

      return { items, total };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes('branch_created_at') ||
        msg.includes('does not exist') ||
        msg.includes('column')
      ) {
        return this.findAllWithoutBranchCreatedAt(opts);
      }
      console.error('[PromptLogService.findAll]', err);
      return empty;
    }
  }

  /**
   * Fallback when branch_created_at column is missing (migration not run).
   */
  private async findAllWithoutBranchCreatedAt(opts?: {
    page?: number;
    limit?: number;
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
    branchName?: string;
  }): Promise<{ items: PromptLogListItem[]; total: number }> {
    const page = Math.max(1, opts?.page ?? 1);
    const limit = Math.min(500, Math.max(1, opts?.limit ?? 50));
    const skip = (page - 1) * limit;

    const conditions: string[] = ['1=1'];
    const params: unknown[] = [];
    let idx = 0;
    if (opts?.userId) {
      conditions.push(`log.user_id = $${++idx}`);
      params.push(opts.userId);
    }
    if (opts?.dateFrom) {
      conditions.push(`log.created_at >= $${++idx}`);
      params.push(opts.dateFrom);
    }
    if (opts?.dateTo) {
      conditions.push(`log.created_at <= $${++idx}`);
      params.push(opts.dateTo);
    }
    if (opts?.branchName?.trim()) {
      conditions.push(`log.branch_name ILIKE $${++idx}`);
      params.push(`%${opts.branchName.trim()}%`);
    }
    const where = conditions.join(' AND ');
    const limitParam = idx + 1;
    const offsetParam = idx + 2;
    const listParams = [...params, limit, skip];

    const countResult = await this.repo.manager.query(
      `SELECT COUNT(*)::int AS c FROM prompt_logs log WHERE ${where}`,
      params,
    );
    const total = countResult?.[0]?.c ?? 0;

    const rows = await this.repo.manager.query(
      `SELECT log.id, log.user_id, log.prompt, log.branch_name, log.created_at,
              u.id AS user_id, u.email AS user_email, u.name AS user_name, r.name AS role_name
       FROM prompt_logs log
       LEFT JOIN users u ON u.id = log.user_id
       LEFT JOIN roles r ON r.id = u.role_id
       WHERE ${where}
       ORDER BY log.created_at DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      listParams,
    );

    const items: PromptLogListItem[] = (rows ?? []).map(
      (row: Record<string, unknown>) => ({
        id: row.id,
        userId: row.user_id,
        prompt: row.prompt,
        branchName: row.branch_name,
        createdAt: row.created_at,
        branchCreatedAt: null,
        user:
          row.user_id != null
            ? {
                id: row.user_id,
                email: row.user_email ?? '',
                name: row.user_name ?? '',
                role: (row.role_name as string) ?? '',
              }
            : null,
      }),
    );

    return { items, total };
  }
}
