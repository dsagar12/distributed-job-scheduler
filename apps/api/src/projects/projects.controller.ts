import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@ApiTags('Projects')
@Controller('api/v1/projects')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'List all projects within an organization' })
  @ApiResponse({ status: 200, description: 'List of projects' })
  async getProjectsByOrg(
    @Query('organizationId') organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.getProjectsByOrg(organizationId, user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a specific project by UUID' })
  @ApiResponse({ status: 200, description: 'Project details' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async getProjectById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.getProjectById(id, user.userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new project in an organization' })
  @ApiResponse({ status: 201, description: 'Project successfully created' })
  async createProject(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateProjectDto) {
    return this.projectsService.createProject(user.userId, dto);
  }

  @Post(':id/regenerate-key')
  @ApiOperation({ summary: 'Regenerate API key for a project' })
  @ApiResponse({ status: 200, description: 'New API key generated' })
  async regenerateApiKey(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.regenerateApiKey(id, user.userId);
  }
}
