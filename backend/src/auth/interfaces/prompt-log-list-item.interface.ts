export interface PromptLogListItemUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface PromptLogListItem {
  id: string;
  userId: string;
  prompt: string;
  branchName: string | null;
  createdAt: Date;
  branchCreatedAt: Date | null;
  user: PromptLogListItemUser | null;
}
