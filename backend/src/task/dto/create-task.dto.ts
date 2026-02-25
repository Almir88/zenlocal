import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export type AiProvider =
  | 'groq'
  | 'openai'
  | 'sudodog'
  | 'langchain'
  | 'crewai'
  | 'autogen'
  | 'autogpt'
  | 'botpress'
  | 'rasa';

export class CreateTaskDto {
  @ApiPropertyOptional({
    example: 'https://github.com/Almir88/zenlocal.git',
    description:
      'Repo URL or repo name. Omit to use DEFAULT_REPO_URL from .env',
  })
  @IsString()
  @IsOptional()
  repo_url?: string;

  @ApiProperty({ example: 'Add login page with email and password' })
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @ApiPropertyOptional({ example: 'feature/ai-login' })
  @IsString()
  @IsOptional()
  branch_name?: string;

  @ApiPropertyOptional({
    description:
      'When true, use existing branch (branch_name required). New changes are applied on top of that branch instead of creating a new one.',
  })
  @IsOptional()
  continue_on_branch?: boolean;

  @ApiPropertyOptional({
    example: 'groq',
    description:
      'AI provider: groq, openai, sudodog, or frameworks (langchain, crewai, autogen, autogpt, botpress, rasa). Only groq/openai generate code. Uses first configured if omitted.',
  })
  @IsString()
  @IsIn([
    'groq',
    'openai',
    'sudodog',
    'langchain',
    'crewai',
    'autogen',
    'autogpt',
    'botpress',
    'rasa',
  ])
  @IsOptional()
  ai_provider?: AiProvider;

  @ApiPropertyOptional({
    example: 'backend',
    description:
      'Project root in repo: backend or frontend. AI will only list and edit files under this folder.',
  })
  @IsString()
  @IsIn(['backend', 'frontend'])
  @IsOptional()
  project?: 'backend' | 'frontend';

  @ApiPropertyOptional({
    description:
      'When false, skip AI verification of the implementation. Default true.',
  })
  @IsOptional()
  run_verification?: boolean;

  @ApiPropertyOptional({
    description:
      'When false, only apply changes and push branch; do not run tests or create PR. Client will call run-tests-and-create-pr separately.',
  })
  @IsOptional()
  create_pr?: boolean;
}
