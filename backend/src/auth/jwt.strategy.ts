import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    const secret = config.get<string>('SECRET_KEY');
    if (!secret) {
      throw new Error('SECRET_KEY is required in .env');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  validate(payload: {
    sub: string;
    email?: string;
    role?: string;
    name?: string;
  }): { sub: string; email?: string; role?: string; name?: string } {
    if (!payload?.sub) {
      throw new UnauthorizedException('Invalid token');
    }
    return payload;
  }
}
