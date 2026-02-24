import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ChatDto {
  @ApiProperty({ example: 'What did you change in the last commit?' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({
    example: 'frontend',
    description:
      'Project context: backend or frontend. Agent can answer about app structure (e.g. sidebar, routes).',
  })
  @IsString()
  @IsIn(['backend', 'frontend'])
  @IsOptional()
  project?: 'backend' | 'frontend';

  @ApiPropertyOptional({ example: 'groq' })
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
  ai_provider?: string;
}
