export interface PromptLogRow {
  id: string;
  userId: string;
  prompt: string;
  branchName: string | null;
  createdAt: string;
  branchCreatedAt: string | null;
  user: { id: string; email: string; name: string; role: string } | null;
}
