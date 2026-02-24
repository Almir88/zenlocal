import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ConsumptionModule } from '../consumption/consumption.module';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';

@Module({
  imports: [AuthModule, ConsumptionModule],
  controllers: [TaskController],
  providers: [TaskService],
  exports: [TaskService],
})
export class TaskModule {}
