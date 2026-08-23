import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { getPrismaClient } from '@scheduler/database';
import { CreateProjectDto } from './dto/create-project.dto';
import * as crypto from 'crypto';

@Injectable()
export class ProjectsService {
  private readonly prisma = getPrismaClient();

  async getProjectsByOrg(organizationId: string, userId: string) {
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        uq_org_user: {
          organizationId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('Access denied to organization');
    }

    return this.prisma.project.findMany({
      where: { organizationId },
      include: {
        queues: true,
        retryPolicies: true,
        _count: {
          select: {
            jobs: true,
            batches: true,
            scheduledJobs: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getProjectById(id: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        organization: {
          include: {
            members: {
              where: { userId },
            },
          },
        },
        queues: {
          include: {
            retryPolicy: true,
            _count: {
              select: {
                jobs: true,
                scheduledJobs: true,
                deadLetterJobs: true,
              },
            },
          },
        },
        retryPolicies: true,
      },
    });

    if (!project || project.organization.members.length === 0) {
      throw new NotFoundException(`Project not found or access denied`);
    }

    return project;
  }

  async createProject(userId: string, dto: CreateProjectDto) {
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        uq_org_user: {
          organizationId: dto.organizationId,
          userId,
        },
      },
    });

    if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
      throw new ForbiddenException('Only organization owners and admins can create projects');
    }

    const existing = await this.prisma.project.findUnique({
      where: {
        uq_org_project_slug: {
          organizationId: dto.organizationId,
          slug: dto.slug,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Project with slug ${dto.slug} already exists in this organization`);
    }

    const apiKey = `proj_live_${crypto.randomBytes(24).toString('hex')}`;

    return this.prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          organizationId: dto.organizationId,
          name: dto.name,
          slug: dto.slug,
          apiKey,
        },
      });

      // Create default exponential retry policy
      await tx.retryPolicy.create({
        data: {
          projectId: project.id,
          name: 'default-exponential',
          strategy: 'EXPONENTIAL',
          maxAttempts: 3,
          initialDelayMs: 1000,
          maxDelayMs: 60000,
          backoffMultiplier: 2.0,
          jitter: true,
        },
      });

      // Create default main queue
      await tx.queue.create({
        data: {
          projectId: project.id,
          name: 'default',
          description: 'General purpose default task queue',
          priority: 50,
          concurrencyLimit: 10,
          defaultTimeoutMs: 30000,
        },
      });

      return project;
    });
  }

  async regenerateApiKey(projectId: string, userId: string) {
    const project = await this.getProjectById(projectId, userId);
    const newApiKey = `proj_live_${crypto.randomBytes(24).toString('hex')}`;

    return this.prisma.project.update({
      where: { id: project.id },
      data: { apiKey: newApiKey },
    });
  }
}
