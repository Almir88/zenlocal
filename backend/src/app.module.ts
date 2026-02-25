import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { TaskModule } from './task/task.module';
import { ConsumptionModule } from './consumption/consumption.module';
import { Role } from './entities/role.entity';
import { User } from './entities/user.entity';
import { PromptLog } from './entities/prompt-log.entity';
import { AiUsageLog } from './entities/ai-usage-log.entity';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 10,
      },
      {
        name: 'medium',
        ttl: 60_000,
        limit: 100,
      },
    ]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('DATABASE_URL');
        const password = config.get<string>('DATABASE_PASSWORD');
        return {
          type: 'postgres',
          ...(url && !password
            ? { url }
            : {
                host: config.get<string>('DATABASE_HOST', 'localhost'),
                port: config.get<number>('DATABASE_PORT', 5432),
                username: config.get<string>('DATABASE_USER', 'postgres'),
                password: config.get<string>('DATABASE_PASSWORD'),
                database: config.get<string>('DATABASE_NAME', 'zenlocal'),
              }),
          entities: [Role, User, PromptLog, AiUsageLog],
          synchronize: false,
          logging: config.get<string>('LOG_LEVEL') === 'debug',
        };
      },
      inject: [ConfigService],
    }),
    AuthModule,
    TaskModule,
    ConsumptionModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
