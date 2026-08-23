import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SchedulesService } from './schedules.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Schedules')
@Controller('api/v1/schedules')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a recurring cron schedule or delayed schedule definition' })
  @ApiResponse({ status: 201, description: 'Schedule definition created' })
  async createSchedule(@Body() dto: CreateScheduleDto) {
    return this.schedulesService.createSchedule(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all recurring schedules for a project' })
  @ApiResponse({ status: 200, description: 'List of schedules' })
  async getSchedulesByProject(@Query('projectId') projectId: string) {
    return this.schedulesService.getSchedulesByProject(projectId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a schedule definition' })
  @ApiResponse({ status: 200, description: 'Schedule details' })
  @ApiResponse({ status: 404, description: 'Schedule not found' })
  async getScheduleById(@Param('id') id: string) {
    return this.schedulesService.getScheduleById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update schedule status (pause/resume) or cron expression' })
  @ApiResponse({ status: 200, description: 'Schedule updated' })
  async updateSchedule(@Param('id') id: string, @Body() dto: UpdateScheduleDto) {
    return this.schedulesService.updateSchedule(id, dto);
  }

  @Post(':id/trigger')
  @ApiOperation({ summary: 'Manually trigger an execution of this schedule immediately' })
  @ApiResponse({ status: 200, description: 'Job enqueued and schedule updated' })
  async triggerScheduleNow(@Param('id') id: string) {
    return this.schedulesService.triggerScheduleNow(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a schedule definition' })
  @ApiResponse({ status: 200, description: 'Schedule deleted' })
  async deleteSchedule(@Param('id') id: string) {
    return this.schedulesService.deleteSchedule(id);
  }
}
