import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiUsageLog } from '../entities/ai-usage-log.entity';
import { MonthlyUsage } from './interfaces/monthly-usage.interface';

@Injectable()
export class ConsumptionService {
  constructor(
    @InjectRepository(AiUsageLog)
    private repo: Repository<AiUsageLog>,
  ) {}

  async record(
    provider: string,
    model: string,
    usage: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    },
  ): Promise<void> {
    const promptTokens = usage.prompt_tokens ?? 0;
    const completionTokens = usage.completion_tokens ?? 0;
    const totalTokens = usage.total_tokens ?? promptTokens + completionTokens;
    const entry = this.repo.create({
      provider,
      model,
      promptTokens,
      completionTokens,
      totalTokens,
    });
    await this.repo.save(entry);
  }

  async getSummaryForMonths(
    limitMonths = 6,
  ): Promise<{ month: string; groq: number; openai: number; total: number }[]> {
    const raw = await this.getMonthly(limitMonths);
    const byMonth = new Map<string, { groq: number; openai: number }>();
    for (const u of raw) {
      if (!byMonth.has(u.month)) byMonth.set(u.month, { groq: 0, openai: 0 });
      const row = byMonth.get(u.month)!;
      const p = u.provider.toLowerCase();
      if (p === 'groq') row.groq += u.totalTokens;
      else if (p === 'openai') row.openai += u.totalTokens;
    }
    return Array.from(byMonth.entries())
      .map(([month, v]) => ({
        month,
        groq: v.groq,
        openai: v.openai,
        total: v.groq + v.openai,
      }))
      .sort((a, b) => b.month.localeCompare(a.month));
  }

  async getMonthly(limitMonths = 24): Promise<MonthlyUsage[]> {
    const result = await this.repo
      .createQueryBuilder('u')
      .select("to_char(u.created_at, 'YYYY-MM')", 'month')
      .addSelect('u.provider', 'provider')
      .addSelect('SUM(u.prompt_tokens)', 'promptTokens')
      .addSelect('SUM(u.completion_tokens)', 'completionTokens')
      .addSelect('SUM(u.total_tokens)', 'totalTokens')
      .where('u.created_at >= :since', {
        since: new Date(Date.now() - limitMonths * 31 * 24 * 60 * 60 * 1000),
      })
      .groupBy("to_char(u.created_at, 'YYYY-MM')")
      .addGroupBy('u.provider')
      .orderBy('month', 'DESC')
      .getRawMany<{
        month: string;
        provider: string;
        promptTokens: string;
        completionTokens: string;
        totalTokens: string;
      }>();

    return result.map((r) => ({
      month: r.month,
      provider: r.provider,
      promptTokens: parseInt(r.promptTokens, 10) || 0,
      completionTokens: parseInt(r.completionTokens, 10) || 0,
      totalTokens: parseInt(r.totalTokens, 10) || 0,
    }));
  }
}
