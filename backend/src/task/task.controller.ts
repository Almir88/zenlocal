import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import * as express from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateTaskDto } from './dto/create-task.dto';
import { ChatDto } from './dto/chat.dto';
import { TaskService } from './task.service';

@ApiTags('Task')
@Controller('task')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'user')
@ApiBearerAuth()
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  @ApiOperation({
    summary: 'Create branch, apply AI changes, push and open PR',
  })
  @ApiResponse({ status: 201, description: 'Task completed' })
  @ApiResponse({ status: 400, description: 'Bad request or OpenAI error' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async create(
    @Body() dto: CreateTaskDto,
    @Req() req: { user: { sub: string } },
  ) {
    return this.taskService.runTask(dto, req.user.sub);
  }

  @Get('branches')
  @ApiOperation({ summary: 'List branches from the repo (GitHub API)' })
  @ApiResponse({
    status: 200,
    description: 'List of branch names and default branch',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async listBranches(@Query('repo_url') repoUrl?: string) {
    return this.taskService.listBranches(repoUrl);
  }

  @Get('repo-files')
  @ApiOperation({
    summary:
      'List top-level files/folders in the selected project (frontend/backend)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of { name, type, path }',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async listRepoFiles(
    @Query('repo_url') repoUrl?: string,
    @Query('project') project?: 'backend' | 'frontend',
  ) {
    return this.taskService.listProjectFiles(
      repoUrl,
      project === 'frontend' ? 'frontend' : 'backend',
    );
  }

  @Post('chat')
  @ApiOperation({ summary: 'Chat with the AI (no git, conversational reply)' })
  @ApiResponse({ status: 201, description: 'AI reply' })
  @ApiResponse({ status: 400, description: 'Bad request or AI error' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async chat(@Body() dto: ChatDto, @Req() req: { user: { sub: string } }) {
    return this.taskService.chat(dto);
  }

  @Post('stream')
  @ApiOperation({
    summary:
      'Same as POST /task but streams step-by-step messages (NDJSON) to the client',
  })
  @ApiResponse({
    status: 201,
    description: 'Stream of step + result/error events',
  })
  @ApiResponse({ status: 400, description: 'Bad request or OpenAI error' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async createStream(
    @Body() dto: CreateTaskDto,
    @Req() req: { user: { sub: string } },
    @Res() res: express.Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const send = (obj: object) => {
      res.write(JSON.stringify(obj) + '\n');
      (res as express.Response & { flush?: () => void }).flush?.();
    };

    try {
      const result = await this.taskService.runTask(dto, req.user.sub, send);
      send({ type: 'result', ...result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Request failed';
      send({ type: 'error', message });
    } finally {
      res.end();
    }
  }
}
