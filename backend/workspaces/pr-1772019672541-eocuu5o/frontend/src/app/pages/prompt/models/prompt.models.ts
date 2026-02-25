export interface AgentMessage {
  type: 'step' | 'result' | 'error';
  message?: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  steps?: string[];
}

export interface RepoFileItem {
  name: string;
  type: 'dir' | 'file';
  path: string;
}

export interface ImplementResult {
  branch?: string;
  pr_url?: string;
  message?: string;
}

export interface TestsAndPrResult {
  pr_url: string | null;
  test_passed: boolean;
  message: string;
}

export type DiffLineType = 'add' | 'del' | 'ctx';

export interface DiffLine {
  line: string;
  type: DiffLineType;
}

export interface AppliedFileDiff {
  path: string;
  diff: string;
}
