import { Controller, Get, Post, Body, Param, Query, Patch, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { QueryJobsDto } from './dto/query-jobs.dto';
import { CancelJobDto } from './dto/cancel-job.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Jobs')
@Controller('api/v1/jobs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a background job with payload, priority, and optional idempotency' })
  @ApiResponse({ status: 201, description: 'Job created or returned if idempotent' })
  async createJob(@Body() dto: CreateJobDto) {
    return this.jobsService.createJob(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Search and filter jobs with pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list of jobs' })
  async queryJobs(@Query() dto: QueryJobsDto) {
    return this.jobsService.queryJobs(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get complete job details, state, executions, and logs' })
  @ApiResponse({ status: 200, description: 'Job detail record' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async getJobById(@Param('id') id: string) {
    return this.jobsService.getJobById(id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a pending or running job' })
  @ApiResponse({ status: 200, description: 'Job cancelled' })
  async cancelJob(@Param('id') id: string, @Body() dto: CancelJobDto) {
    return this.jobsService.cancelJob(id, dto);
  }

  @Post(':id/reprocess')
  @ApiOperation({ summary: 'Manually reprocess a failed or completed job' })
  @ApiResponse({ status: 200, description: 'Job reset to QUEUED' })
  async reprocessJob(@Param('id') id: string) {
    return this.jobsService.reprocessJob(id);
  }

  @Get(':id/executions')
  @ApiOperation({ summary: 'Get execution history attempts for a job' })
  @ApiResponse({ status: 200, description: 'List of executions' })
  async getJobExecutions(@Param('id') id: string) {
    return this.jobsService.getJobExecutions(id);
  }

  @Get(':id/logs')
  @ApiOperation({ summary: 'Get runtime log entries for a job' })
  @ApiResponse({ status: 200, description: 'List of logs' })
  async getJobLogs(@Param('id') id: string) {
    return this.jobsService.getJobLogs(id);
  }
}
