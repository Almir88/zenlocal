import { Injectable, OnModuleInit } from '@nestjs/common';
import { UsersService } from './users.service';

@Injectable()
export class SeedService implements OnModuleInit {
  constructor(private users: UsersService) {}

  async onModuleInit(): Promise<void> {
    const admin = await this.users.findByEmail('admin@zenlocal.dev');
    if (!admin) {
      await this.users.create(
        'admin@zenlocal.dev',
        'admin123',
        'Almir',
        'admin',
      );
    }
  }
}
