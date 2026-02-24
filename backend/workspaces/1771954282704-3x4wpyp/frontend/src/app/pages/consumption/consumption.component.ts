import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface MonthlyUsage {
  month: string;
  provider: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

interface MonthRow {
  month: string;
  monthLabel: string;
  groq: { promptTokens: number; completionTokens: number; totalTokens: number };
  openai: { promptTokens: number; completionTokens: number; totalTokens: number };
  totalTokens: number;
}

@Component({
  selector: 'app-consumption',
  standalone: true,
  imports: [],
  templateUrl: './consumption.component.html',
  styleUrl: './consumption.component.scss',
})
export class ConsumptionComponent implements OnInit {
  rows: MonthRow[] = [];
  loading = true;
  error = '';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http
      .get<MonthlyUsage[]>(`${environment.apiUrl}/auth/consumption`)
      .subscribe({
        next: (data) => {
          this.rows = this.groupByMonth(data);
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          this.error = err.error?.message ?? err.error?.detail ?? 'Failed to load consumption';
        },
      });
  }

  private groupByMonth(list: MonthlyUsage[]): MonthRow[] {
    const byMonth = new Map<
      string,
      { groq: MonthRow['groq']; openai: MonthRow['openai'] }
    >();
    const empty = () => ({
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    });
    for (const u of list) {
      if (!byMonth.has(u.month)) {
        byMonth.set(u.month, { groq: empty(), openai: empty() });
      }
      const row = byMonth.get(u.month)!;
      const provider = u.provider.toLowerCase();
      if (provider === 'groq') {
        row.groq.promptTokens += u.promptTokens;
        row.groq.completionTokens += u.completionTokens;
        row.groq.totalTokens += u.totalTokens;
      } else if (provider === 'openai') {
        row.openai.promptTokens += u.promptTokens;
        row.openai.completionTokens += u.completionTokens;
        row.openai.totalTokens += u.totalTokens;
      }
    }
    const months = Array.from(byMonth.keys()).sort((a, b) => b.localeCompare(a));
    return months.map((month) => {
      const r = byMonth.get(month)!;
      const totalTokens =
        r.groq.totalTokens + r.openai.totalTokens;
      const [y, m] = month.split('-');
      const monthLabel = `${y}-${m}`;
      return {
        month,
        monthLabel,
        groq: r.groq,
        openai: r.openai,
        totalTokens,
      };
    });
  }

  formatTokens(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return String(n);
  }
}
