import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Metrics & Observability')
@Controller('api/v1/metrics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get global system overview: queue depths, worker counts, latency percentiles' })
  @ApiResponse({ status: 200, description: 'Overview metrics object' })
  async getOverview(@Query('projectId') projectId?: string) {
    return this.metricsService.getOverview(projectId);
  }

  @Get('timeline')
  @ApiOperation({ summary: 'Get 24-hour job throughput time-series for charts' })
  @ApiResponse({ status: 200, description: 'Time-series points' })
  async getTimeline(@Query('hours') hours?: number) {
    return this.metricsService.getTimeline(hours ? Number(hours) : 24);
  }

  @Get('queues')
  @ApiOperation({ summary: 'Get metrics breakdown across all queues in a project' })
  @ApiResponse({ status: 200, description: 'Queue metrics list' })
  async getQueuesSummary(@Query('projectId') projectId: string) {
    return this.metricsService.getQueuesSummary(projectId);
  }
}
