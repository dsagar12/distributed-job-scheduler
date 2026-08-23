import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ChaosService } from './chaos.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ExpireLeaseDto {
  @IsString()
  @IsNotEmpty()
  jobId: string;
}

export class KillWorkerDto {
  @IsString()
  @IsNotEmpty()
  workerId: string;
}

export class ForceFailJobDto {
  @IsString()
  @IsNotEmpty()
  jobId: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

@ApiTags('Chaos Engineering Lab')
@Controller('api/v1/chaos')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChaosController {
  constructor(private readonly chaosService: ChaosService) {}

  @Post('expire-lease')
  @ApiOperation({ summary: 'Simulate lease expiration by backdating leaseUntil into the past' })
  @ApiResponse({ status: 200, description: 'Lease expired simulated' })
  async expireLease(@Body() dto: ExpireLeaseDto) {
    return this.chaosService.simulateLeaseExpiry(dto.jobId);
  }

  @Post('kill-worker')
  @ApiOperation({ summary: 'Simulate worker node failure / heartbeat freeze' })
  @ApiResponse({ status: 200, description: 'Worker marked as DEAD' })
  async killWorker(@Body() dto: KillWorkerDto) {
    return this.chaosService.simulateWorkerKill(dto.workerId);
  }

  @Post('fail-job')
  @ApiOperation({ summary: 'Inject artificial execution failure into in-flight job' })
  @ApiResponse({ status: 200, description: 'Job failed' })
  async forceFail(@Body() dto: ForceFailJobDto) {
    return this.chaosService.forceJobFailure(dto.jobId, dto.reason);
  }

  @Post('trigger-sweeper')
  @ApiOperation({ summary: 'Trigger on-demand scheduler crash recovery sweeper' })
  @ApiResponse({ status: 200, description: 'Recovery sweep executed' })
  async triggerSweeper() {
    return this.chaosService.triggerRecoverySweep();
  }

  @Get('timeline')
  @ApiOperation({ summary: 'Get history of chaos engineering events and recovery actions' })
  @ApiResponse({ status: 200, description: 'List of chaos timeline events' })
  async getTimeline() {
    return this.chaosService.getTimeline();
  }
}
