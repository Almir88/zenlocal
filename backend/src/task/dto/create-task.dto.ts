import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export type AiProvider = 'groq' | 'openai';

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
    example: 'groq',
    description: 'AI provider: groq or openai. Uses first configured if omitted.',
  })
  @IsString()
  @IsIn(['groq', 'openai'])
  @IsOptional()
  ai_provider?: AiProvider;
}
