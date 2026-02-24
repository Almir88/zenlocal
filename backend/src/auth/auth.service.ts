import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';

@Injectable()
export class AuthService {
  constructor(
    private jwt: JwtService,
    private config: ConfigService,
    private users: UsersService,
  ) {}

  createToken(subject: string): { access_token: string; token_type: string; expires_in: number } {
    const expiresInMinutes = this.config.get<number>('ACCESS_TOKEN_EXPIRE_MINUTES', 60);
    const payload = { sub: subject };
    const token = this.jwt.sign(payload, { expiresIn: `${expiresInMinutes}m` });
    return {
      access_token: token,
      token_type: 'bearer',
      expires_in: expiresInMinutes * 60,
    };
  }

  async login(email: string, password: string) {
    const user = await this.users.findByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const roleName = user.role?.name ?? 'user';
    const expiresInMinutes = this.config.get<number>('ACCESS_TOKEN_EXPIRE_MINUTES', 60);
    const payload = { sub: user.id, email: user.email, role: roleName, name: user.name };
    const token = this.jwt.sign(payload, { expiresIn: `${expiresInMinutes}m` });
    return {
      access_token: token,
      token_type: 'bearer',
      expires_in: expiresInMinutes * 60,
      user: { id: user.id, email: user.email, name: user.name, role: roleName },
    };
  }
}
