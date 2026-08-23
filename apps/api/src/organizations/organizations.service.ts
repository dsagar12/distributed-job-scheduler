import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { getPrismaClient, UserRepository } from '@scheduler/database';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { OrgRole } from '@prisma/client';

@Injectable()
export class OrganizationsService {
  private readonly prisma = getPrismaClient();

  constructor(private readonly userRepo: UserRepository) {}

  async getUserOrganizations(userId: string) {
    return this.userRepo.getUserOrganizations(userId);
  }

  async getOrganizationById(id: string, userId: string) {
    const member = await this.prisma.organizationMember.findUnique({
      where: {
        uq_org_user: {
          organizationId: id,
          userId,
        },
      },
      include: {
        organization: {
          include: {
            projects: true,
            members: {
              include: {
                user: {
                  select: { id: true, email: true, fullName: true },
                },
              },
            },
          },
        },
      },
    });

    if (!member) {
      throw new NotFoundException(`Organization not found or access denied`);
    }

    return member.organization;
  }

  async createOrganization(userId: string, dto: CreateOrganizationDto) {
    const existing = await this.prisma.organization.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException(`Organization with slug ${dto.slug} already exists`);
    }

    return this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: dto.name,
          slug: dto.slug,
        },
      });

      await tx.organizationMember.create({
        data: {
          organizationId: org.id,
          userId,
          role: OrgRole.OWNER,
        },
      });

      // Default project
      const project = await tx.project.create({
        data: {
          organizationId: org.id,
          name: 'Default Project',
          slug: 'default-project',
        },
      });

      return { ...org, projects: [project] };
    });
  }
}
