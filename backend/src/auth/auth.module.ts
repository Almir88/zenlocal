import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { ConsumptionModule } from '../consumption/consumption.module';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { UsersService } from './users.service';
import { PromptLogService } from './prompt-log.service';
import { SeedService } from './seed.service';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { PromptLog } from '../entities/prompt-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role, PromptLog]),
    ConsumptionModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('SECRET_KEY'),
        signOptions: {
          expiresIn: `${config.get<number>('ACCESS_TOKEN_EXPIRE_MINUTES', 60)}m`,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    UsersService,
    PromptLogService,
    SeedService,
  ],
  exports: [AuthService, JwtModule, UsersService, PromptLogService],
})
export class AuthModule {}
