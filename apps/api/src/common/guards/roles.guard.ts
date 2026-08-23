import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OrgRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

const ROLE_HIERARCHY: Record<OrgRole, number> = {
  [OrgRole.OWNER]: 4,
  [OrgRole.ADMIN]: 3,
  [OrgRole.MEMBER]: 2,
  [OrgRole.VIEWER]: 1,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<OrgRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const orgId = request.headers['x-organization-id'] || request.query.organizationId || request.body?.organizationId;

    if (!user) {
      throw new ForbiddenException('User context is missing');
    }

    // If specific organization roles are stored in user object
    const userRole = (user.roles && orgId ? user.roles[orgId] : user.defaultRole) || OrgRole.MEMBER;
    const userLevel = ROLE_HIERARCHY[userRole as OrgRole] || 1;

    const minRequiredLevel = Math.min(...requiredRoles.map((r) => ROLE_HIERARCHY[r] || 1));

    if (userLevel >= minRequiredLevel) {
      return true;
    }

    throw new ForbiddenException(`Insufficient permissions. Required role: ${requiredRoles.join(' or ')}`);
  }
}
