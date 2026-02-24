import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ConsumptionService, MonthlyUsage } from './consumption.service';

@ApiTags('consumption')
@Controller('consumption')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth()
export class ConsumptionController {
  constructor(private consumption: ConsumptionService) {}

  @Get()
  @ApiOperation({ summary: 'Monthly AI usage (admin only)' })
  @ApiResponse({ status: 200, description: 'Monthly usage by provider' })
  async getMonthly(): Promise<MonthlyUsage[]> {
    return this.consumption.getMonthly(24);
  }
}
