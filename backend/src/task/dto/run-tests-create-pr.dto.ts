import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RunTestsCreatePrDto {
  @ApiProperty({
    example: 'feature/ai-login',
    description: 'Branch to run tests on and open PR for',
  })
  @IsString()
  @IsNotEmpty()
  branch_name: string;

  @ApiPropertyOptional({
    example: 'backend',
    description: 'Project folder in repo (backend or frontend)',
  })
  @IsString()
  @IsIn(['backend', 'frontend'])
  @IsOptional()
  project?: 'backend' | 'frontend';

  @ApiPropertyOptional({
    description: 'Repo URL. Omit to use DEFAULT_REPO_URL from .env',
  })
  @IsString()
  @IsOptional()
  repo_url?: string;
}
