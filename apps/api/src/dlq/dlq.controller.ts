import { Controller, Get, Post, Delete, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DlqService } from './dlq.service';
import { QueryDlqDto } from './dto/query-dlq.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Dead Letter Queue')
@Controller('api/v1/dlq')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DlqController {
  constructor(private readonly dlqService: DlqService) {}

  @Get()
  @ApiOperation({ summary: 'List all exhausted / failed jobs in Dead Letter Queue' })
  @ApiResponse({ status: 200, description: 'Paginated list of DLQ jobs' })
  async listDeadLetterJobs(@Query() dto: QueryDlqDto) {
    return this.dlqService.listDeadLetterJobs(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Inspect a specific DLQ job with original payload, error, and stack trace' })
  @ApiResponse({ status: 200, description: 'DLQ job details' })
  @ApiResponse({ status: 404, description: 'DLQ job not found' })
  async getDeadLetterJobById(@Param('id') id: string) {
    return this.dlqService.getDeadLetterJobById(id);
  }

  @Post(':id/reprocess')
  @ApiOperation({ summary: 'Reprocess a dead-letter job (resets to QUEUED with fresh attempt budget)' })
  @ApiResponse({ status: 200, description: 'Job reprocessed successfully' })
  async reprocessDeadLetterJob(@Param('id') id: string) {
    return this.dlqService.reprocessDeadLetterJob(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Resolve / remove a job from DLQ without re-running' })
  @ApiResponse({ status: 200, description: 'DLQ record resolved' })
  async resolveDeadLetterJob(@Param('id') id: string) {
    return this.dlqService.resolveDeadLetterJob(id);
  }
}
