import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BatchesService } from './batches.service';
import { CreateBatchDto } from './dto/create-batch.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Batches')
@Controller('api/v1/batches')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BatchesController {
  constructor(private readonly batchesService: BatchesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a batch of jobs in a single transaction' })
  @ApiResponse({ status: 201, description: 'Batch created with child jobs' })
  async createBatch(@Body() dto: CreateBatchDto) {
    return this.batchesService.createBatch(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all batches for a project' })
  @ApiResponse({ status: 200, description: 'List of batches' })
  async getBatchesByProject(@Query('projectId') projectId: string) {
    return this.batchesService.getBatchesByProject(projectId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a batch and its child jobs' })
  @ApiResponse({ status: 200, description: 'Batch details with progress percentage' })
  @ApiResponse({ status: 404, description: 'Batch not found' })
  async getBatchById(@Param('id') id: string) {
    return this.batchesService.getBatchById(id);
  }
}
