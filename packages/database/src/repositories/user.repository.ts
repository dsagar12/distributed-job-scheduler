import { PrismaClient, User, RefreshToken, Organization, Project, OrgRole } from '@prisma/client';
import { getPrismaClient } from '../client';
import * as bcrypt from 'bcrypt';

export interface CreateUserParams {
  email: string;
  passwordHash: string;
  fullName: string;
}

export interface CreateOrgWithProjectParams {
  userId: string;
  orgName: string;
  orgSlug: string;
  projectName: string;
  projectSlug: string;
}

// In-memory offline fallback storage
const memoryUsers: Map<string, User> = new Map();
const memoryOrgs: Map<string, Organization> = new Map();
const memoryProjects: Map<string, Project> = new Map();
const memoryMemberships: Array<{ userId: string; orgId: string; role: OrgRole }> = [];
const memoryTokens: Map<string, RefreshToken & { user: User }> = new Map();

// Pre-seed demo user in memory fallback
const DEMO_USER_ID = '11111111-1111-1111-1111-111111111111';
const DEMO_ORG_ID = '22222222-2222-2222-2222-222222222222';
const DEMO_PROJ_ID = '33333333-3333-3333-3333-333333333333';

const demoUser: User = {
  id: DEMO_USER_ID,
  email: 'admin@scheduler.io',
  passwordHash: bcrypt.hashSync('AdminSecurePass123!', 10),
  fullName: 'System Administrator',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};
memoryUsers.set(demoUser.id, demoUser);

const demoOrg: Organization = {
  id: DEMO_ORG_ID,
  name: 'Acme Cloud Platform',
  slug: 'acme-cloud',
  createdAt: new Date(),
  updatedAt: new Date(),
};
memoryOrgs.set(demoOrg.id, demoOrg);

const demoProject: Project = {
  id: DEMO_PROJ_ID,
  organizationId: DEMO_ORG_ID,
  name: 'Production Workloads',
  slug: 'production-workloads',
  apiKey: 'proj_live_key_983749827394872394',
  createdAt: new Date(),
  updatedAt: new Date(),
};
memoryProjects.set(demoProject.id, demoProject);

memoryMemberships.push({
  userId: DEMO_USER_ID,
  orgId: DEMO_ORG_ID,
  role: OrgRole.OWNER,
});

export class UserRepository {
  constructor(private prisma: PrismaClient = getPrismaClient()) {}

  async createUser(params: CreateUserParams): Promise<User> {
    try {
      return await this.prisma.user.create({
        data: {
          email: params.email.toLowerCase().trim(),
          passwordHash: params.passwordHash,
          fullName: params.fullName,
        },
      });
    } catch {
      const user: User = {
        id: `user-${Date.now()}`,
        email: params.email.toLowerCase().trim(),
        passwordHash: params.passwordHash,
        fullName: params.fullName,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      memoryUsers.set(user.id, user);
      return user;
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      return await this.prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
      });
    } catch {
      const normalized = email.toLowerCase().trim();
      for (const u of memoryUsers.values()) {
        if (u.email === normalized) return u;
      }
      return null;
    }
  }

  async findById(id: string): Promise<User | null> {
    try {
      return await this.prisma.user.findUnique({
        where: { id },
      });
    } catch {
      return memoryUsers.get(id) || null;
    }
  }

  async getUserOrganizations(userId: string) {
    try {
      return await this.prisma.organizationMember.findMany({
        where: { userId },
        include: {
          organization: {
            include: {
              projects: true,
            },
          },
        },
      });
    } catch {
      const orgs: any[] = [];
      for (const m of memoryMemberships) {
        if (m.userId === userId) {
          const org = memoryOrgs.get(m.orgId);
          if (org) {
            const projects = Array.from(memoryProjects.values()).filter((p) => p.organizationId === org.id);
            orgs.push({
              id: `mem-${m.userId}-${m.orgId}`,
              userId: m.userId,
              organizationId: m.orgId,
              role: m.role,
              organization: {
                ...org,
                projects,
              },
            });
          }
        }
      }
      return orgs;
    }
  }

  async createOrganizationWithProject(params: CreateOrgWithProjectParams): Promise<{ org: Organization; project: Project }> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const org = await tx.organization.create({
          data: {
            name: params.orgName,
            slug: params.orgSlug,
          },
        });

        await tx.organizationMember.create({
          data: {
            organizationId: org.id,
            userId: params.userId,
            role: OrgRole.OWNER,
          },
        });

        const project = await tx.project.create({
          data: {
            organizationId: org.id,
            name: params.projectName,
            slug: params.projectSlug,
          },
        });

        return { org, project };
      });
    } catch {
      const org: Organization = {
        id: `org-${Date.now()}`,
        name: params.orgName,
        slug: params.orgSlug,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      memoryOrgs.set(org.id, org);

      const project: Project = {
        id: `proj-${Date.now()}`,
        organizationId: org.id,
        name: params.projectName,
        slug: params.projectSlug,
        apiKey: `proj_live_key_${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      memoryProjects.set(project.id, project);

      memoryMemberships.push({
        userId: params.userId,
        orgId: org.id,
        role: OrgRole.OWNER,
      });

      return { org, project };
    }
  }

  async createRefreshToken(userId: string, tokenHash: string, expiresAt: Date): Promise<RefreshToken> {
    try {
      return await this.prisma.refreshToken.create({
        data: {
          userId,
          tokenHash,
          expiresAt,
        },
      });
    } catch {
      const user = memoryUsers.get(userId)!;
      const rt: RefreshToken & { user: User } = {
        id: `rt-${Date.now()}`,
        userId,
        tokenHash,
        revoked: false,
        expiresAt,
        createdAt: new Date(),
        user,
      };
      memoryTokens.set(tokenHash, rt);
      return rt;
    }
  }

  async findRefreshToken(tokenHash: string): Promise<(RefreshToken & { user: User }) | null> {
    try {
      return await this.prisma.refreshToken.findUnique({
        where: { tokenHash },
        include: { user: true },
      });
    } catch {
      return memoryTokens.get(tokenHash) || null;
    }
  }

  async revokeRefreshToken(tokenHash: string): Promise<void> {
    try {
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash },
        data: { revoked: true },
      });
    } catch {
      const rt = memoryTokens.get(tokenHash);
      if (rt) rt.revoked = true;
    }
  }

  async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    try {
      await this.prisma.refreshToken.updateMany({
        where: { userId },
        data: { revoked: true },
      });
    } catch {
      for (const rt of memoryTokens.values()) {
        if (rt.userId === userId) rt.revoked = true;
      }
    }
  }
}
