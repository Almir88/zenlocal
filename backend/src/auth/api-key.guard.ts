import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const apiKey = this.config.get<string>('API_KEY');
    if (!apiKey) {
      throw new UnauthorizedException(
        'Server not configured (API_KEY missing in .env)',
      );
    }
    const request = context.switchToHttp().getRequest<Request>();
    const key = request.headers['x-api-key'] as string | undefined;
    if (!key?.trim() || key.trim() !== apiKey) {
      throw new UnauthorizedException('Invalid or missing API key');
    }
    return true;
  }
}
