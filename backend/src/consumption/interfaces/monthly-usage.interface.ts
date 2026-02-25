export interface MonthlyUsage {
  month: string;
  provider: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}
