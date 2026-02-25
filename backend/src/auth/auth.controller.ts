import {
  Body,
  Controller,
  Get,
  Header,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { ApiKeyGuard } from './api-key.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UsersService } from './users.service';
import { PromptLogService } from './prompt-log.service';
import { ConsumptionService } from '../consumption/consumption.service';
import type { LoginResponse } from './interfaces/login-response.interface';
import type { PromptLogListItem } from './interfaces/prompt-log-list-item.interface';
import type { MonthlyUsage } from '../consumption/interfaces/monthly-usage.interface';
import type { User } from '../entities/user.entity';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private auth: AuthService,
    private users: UsersService,
    private promptLogs: PromptLogService,
    private consumption: ConsumptionService,
  ) {}

  @Post('token')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({ summary: 'Exchange X-API-Key for JWT' })
  @ApiSecurity('X-API-Key')
  getToken(): { access_token: string; token_type: string; expires_in: number } {
    return this.auth.createToken('api');
  }

  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  async login(@Body() dto: LoginDto): Promise<LoginResponse> {
    return this.auth.login(dto.email, dto.password);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Exchange refresh token for new access token' })
  async refresh(
    @Body() dto: RefreshDto,
  ): Promise<{ access_token: string; token_type: string; expires_in: number }> {
    return this.auth.refresh(dto.refresh_token);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user from JWT' })
  me(
    @Req()
    req: {
      user: { sub: string; email?: string; name?: string; role?: string };
    },
  ): { id: string; email?: string; name?: string; role?: string } {
    const u = req.user;
    return { id: u.sub, email: u.email, name: u.name, role: u.role };
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile (name, email)' })
  async updateMe(
    @Body() dto: UpdateProfileDto,
    @Req() req: { user: { sub: string } },
  ): Promise<{ id: string; email: string; name: string; role: string }> {
    const user = await this.users.updateProfile(req.user.sub, dto);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role.name,
    };
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change current user password' })
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @Req() req: { user: { sub: string } },
  ): Promise<{ message: string }> {
    await this.users.changePassword(
      req.user.sub,
      dto.currentPassword,
      dto.newPassword,
    );
    return { message: 'Password updated' };
  }

  @Post('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add user (admin only)' })
  async addUser(
    @Body() dto: CreateUserDto,
    @Req() req: { user: { sub: string } },
  ): Promise<{ id: string; email: string; name: string; role: string }> {
    const user = await this.users.create(
      dto.email,
      dto.password,
      dto.name,
      'user',
    );
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role.name,
    };
  }

  @Get('users')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate')
  @Header('Pragma', 'no-cache')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List users (admin only)' })
  listUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ): Promise<{
    items: (Omit<User, 'password' | 'role'> & { role: string })[];
    total: number;
  }> {
    return this.users.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
    }) as Promise<{
      items: (Omit<User, 'password' | 'role'> & { role: string })[];
      total: number;
    }>;
  }

  @Get('prompt-logs')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate')
  @Header('Pragma', 'no-cache')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List prompt logs (admin only)' })
  listPromptLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('userId') userId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('branchName') branchName?: string,
  ): Promise<{ items: PromptLogListItem[]; total: number }> {
    return this.promptLogs.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      userId,
      dateFrom,
      dateTo,
      branchName,
    });
  }

  @Get('consumption')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate')
  @Header('Pragma', 'no-cache')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Monthly AI usage (admin only)' })
  getConsumption(): Promise<MonthlyUsage[]> {
    return this.consumption.getMonthly(24);
  }
}
