import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { ApiKeyGuard } from './api-key.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';
import { PromptLogService } from './prompt-log.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private auth: AuthService,
    private users: UsersService,
    private promptLogs: PromptLogService,
  ) {}

  @Post('token')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({ summary: 'Exchange X-API-Key for JWT' })
  @ApiSecurity('X-API-Key')
  getToken(): { access_token: string; token_type: string; expires_in: number } {
    return this.auth.createToken('api');
  }

  @Post('login')
  @ApiOperation({ summary: 'Login with email and password (for dashboard)' })
  async login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user from JWT' })
  me(@Req() req: { user: { sub: string; email?: string; name?: string; role?: string } }) {
    const u = req.user;
    return { id: u.sub, email: u.email, name: u.name, role: u.role };
  }

  @Post('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add user (admin only)' })
  async addUser(@Body() dto: CreateUserDto) {
    const user = await this.users.create(dto.email, dto.password, dto.name, 'user');
    return { id: user.id, email: user.email, name: user.name, role: user.role.name };
  }

  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List users (admin only)' })
  listUsers() {
    return this.users.findAll();
  }

  @Get('prompt-logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List prompt logs (admin only)' })
  listPromptLogs() {
    return this.promptLogs.findAll();
  }
}
