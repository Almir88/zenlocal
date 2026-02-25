import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import type { LoginResponse } from './interfaces/login-response.interface';

@Injectable()
export class AuthService {
  constructor(
    private jwt: JwtService,
    private config: ConfigService,
    private users: UsersService,
  ) {}

  createToken(subject: string): {
    access_token: string;
    token_type: string;
    expires_in: number;
  } {
    const expiresInMinutes = this.config.get<number>(
      'ACCESS_TOKEN_EXPIRE_MINUTES',
      60,
    );
    const payload = { sub: subject };
    const token = this.jwt.sign(payload, { expiresIn: `${expiresInMinutes}m` });
    return {
      access_token: token,
      token_type: 'bearer',
      expires_in: expiresInMinutes * 60,
    };
  }

  private createRefreshToken(subject: string): string {
    const expireDays = this.config.get<number>('REFRESH_TOKEN_EXPIRE_DAYS', 7);
    const payload = { sub: subject, type: 'refresh' };
    return this.jwt.sign(payload, { expiresIn: `${expireDays}d` });
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    const user = await this.users.findByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const roleName = user.role?.name ?? 'user';
    const expiresInMinutes = this.config.get<number>(
      'ACCESS_TOKEN_EXPIRE_MINUTES',
      60,
    );
    const payload = {
      sub: user.id,
      email: user.email,
      role: roleName,
      name: user.name,
    };
    const access_token = this.jwt.sign(payload, {
      expiresIn: `${expiresInMinutes}m`,
    });
    const refresh_token = this.createRefreshToken(user.id);
    return {
      access_token,
      refresh_token,
      token_type: 'bearer',
      expires_in: expiresInMinutes * 60,
      user: { id: user.id, email: user.email, name: user.name, role: roleName },
    };
  }

  async refresh(refreshToken: string): Promise<{
    access_token: string;
    token_type: string;
    expires_in: number;
  }> {
    if (!refreshToken?.trim()) {
      throw new UnauthorizedException('Refresh token required');
    }
    let payload: { sub?: string; type?: string };
    try {
      payload = this.jwt.verify(refreshToken) as {
        sub?: string;
        type?: string;
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    if (payload.type !== 'refresh' || !payload.sub) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const user = await this.users.findOne(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const roleName = user.role?.name ?? 'user';
    const expiresInMinutes = this.config.get<number>(
      'ACCESS_TOKEN_EXPIRE_MINUTES',
      60,
    );
    const accessPayload = {
      sub: user.id,
      email: user.email,
      role: roleName,
      name: user.name,
    };
    const access_token = this.jwt.sign(accessPayload, {
      expiresIn: `${expiresInMinutes}m`,
    });
    return {
      access_token,
      token_type: 'bearer',
      expires_in: expiresInMinutes * 60,
    };
  }
}
