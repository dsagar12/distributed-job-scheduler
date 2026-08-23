import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@ApiTags('Organizations')
@Controller('api/v1/organizations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrganizationsController {
  constructor(private readonly orgsService: OrganizationsService) {}

  @Get()
  @ApiOperation({ summary: 'List all organizations for the current user' })
  @ApiResponse({ status: 200, description: 'List of organizations' })
  async listUserOrganizations(@CurrentUser() user: AuthenticatedUser) {
    return this.orgsService.getUserOrganizations(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of an organization with projects and members' })
  @ApiResponse({ status: 200, description: 'Organization details' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async getOrganizationById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.orgsService.getOrganizationById(id, user.userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new organization' })
  @ApiResponse({ status: 201, description: 'Organization successfully created' })
  async createOrganization(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateOrganizationDto) {
    return this.orgsService.createOrganization(user.userId, dto);
  }
}
