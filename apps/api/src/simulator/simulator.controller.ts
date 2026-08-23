import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SimulatorService } from './simulator.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class BurstSimulationDto {
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  queueId: string;

  @IsInt()
  @Min(1)
  @Max(1000)
  count: number;

  @IsOptional()
  @IsEnum(['BALANCED', 'HIGH_BIAS', 'RANDOM'])
  priorityDistribution?: 'BALANCED' | 'HIGH_BIAS' | 'RANDOM';

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  failurePercentage?: number;

  @IsOptional()
  @IsInt()
  @Min(1000)
  timeoutMs?: number;
}

@ApiTags('Queue Load Simulator')
@Controller('api/v1/simulator')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SimulatorController {
  constructor(private readonly simulatorService: SimulatorService) {}

  @Post('burst')
  @ApiOperation({ summary: 'Inject a synthetic burst of jobs with configurable load & priority parameters' })
  @ApiResponse({ status: 201, description: 'Load burst enqueued' })
  async injectBurst(@Body() dto: BurstSimulationDto) {
    return this.simulatorService.injectLoadBurst(dto);
  }

  @Get('telemetry/:queueId')
  @ApiOperation({ summary: 'Get real-time authoritative backend telemetry for the target simulated queue' })
  @ApiResponse({ status: 200, description: 'Authoritative telemetry data' })
  async getTelemetry(@Param('queueId') queueId: string) {
    return this.simulatorService.getSimulationTelemetry(queueId);
  }
}
