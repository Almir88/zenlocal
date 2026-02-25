export interface MonthlyUsage {
  month: string;
  provider: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface MonthRow {
  month: string;
  monthLabel: string;
  groq: { promptTokens: number; completionTokens: number; totalTokens: number };
  openai: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  totalTokens: number;
}
