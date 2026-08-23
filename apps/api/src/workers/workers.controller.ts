import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WorkersService } from './workers.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Workers')
@Controller('api/v1/workers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

  @Get()
  @ApiOperation({ summary: 'List all registered workers in the fleet with active status and capacity' })
  @ApiResponse({ status: 200, description: 'List of worker nodes' })
  async getAllWorkers() {
    return this.workersService.getAllWorkers();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details and telemetry history for a specific worker node' })
  @ApiResponse({ status: 200, description: 'Worker node details and heartbeats' })
  @ApiResponse({ status: 404, description: 'Worker not found' })
  async getWorkerById(@Param('id') id: string) {
    return this.workersService.getWorkerById(id);
  }
}
