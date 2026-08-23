import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { QueuesService } from './queues.service';
import { CreateQueueDto } from './dto/create-queue.dto';
import { UpdateQueueDto } from './dto/update-queue.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Queues')
@Controller('api/v1/queues')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QueuesController {
  constructor(private readonly queuesService: QueuesService) {}

  @Get()
  @ApiOperation({ summary: 'List all queues for a project with real-time metrics' })
  @ApiResponse({ status: 200, description: 'List of queues' })
  async getQueuesByProject(@Query('projectId') projectId: string) {
    return this.queuesService.getQueuesByProject(projectId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a specific queue by UUID' })
  @ApiResponse({ status: 200, description: 'Queue details' })
  @ApiResponse({ status: 404, description: 'Queue not found' })
  async getQueueById(@Param('id') id: string) {
    return this.queuesService.getQueueById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new job queue' })
  @ApiResponse({ status: 201, description: 'Queue successfully created' })
  async createQueue(@Body() dto: CreateQueueDto) {
    return this.queuesService.createQueue(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update queue settings and concurrency limits' })
  @ApiResponse({ status: 200, description: 'Queue updated' })
  async updateQueue(@Param('id') id: string, @Body() dto: UpdateQueueDto) {
    return this.queuesService.updateQueue(id, dto);
  }

  @Patch(':id/pause')
  @ApiOperation({ summary: 'Pause a queue' })
  @ApiResponse({ status: 200, description: 'Queue paused' })
  async pauseQueue(@Param('id') id: string) {
    return this.queuesService.setPaused(id, true);
  }

  @Patch(':id/resume')
  @ApiOperation({ summary: 'Resume a paused queue' })
  @ApiResponse({ status: 200, description: 'Queue resumed' })
  async resumeQueue(@Param('id') id: string) {
    return this.queuesService.setPaused(id, false);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a queue' })
  @ApiResponse({ status: 200, description: 'Queue deleted' })
  async deleteQueue(@Param('id') id: string) {
    return this.queuesService.deleteQueue(id);
  }

  @Get(':id/metrics')
  @ApiOperation({ summary: 'Get aggregated job status counts for a queue' })
  @ApiResponse({ status: 200, description: 'Queue metrics' })
  async getQueueMetrics(@Param('id') id: string) {
    return this.queuesService.getQueueMetrics(id);
  }
}
