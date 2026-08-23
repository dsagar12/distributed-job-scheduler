import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { getPrismaClient } from '@scheduler/database';

@ApiTags('Health & Readiness')
@Controller()
export class HealthController {
  private readonly prisma = getPrismaClient();

  @Get(['health', 'api/v1/health'])
  @ApiOperation({ summary: 'Overall system health check' })
  @ApiResponse({ status: 200, description: 'System healthy' })
  async getHealth(@Res() res: Response) {
    const status = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      database: 'connected',
      redis: 'optional',
    };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      status.database = 'standalone (in-memory)';
      status.status = 'standalone';
    }

    return res.status(HttpStatus.OK).json(status);
  }

  @Get('health/live')
  @ApiOperation({ summary: 'Kubernetes/Docker liveness probe' })
  getLiveness(@Res() res: Response) {
    return res.status(HttpStatus.OK).json({ status: 'alive' });
  }

  @Get('health/ready')
  @ApiOperation({ summary: 'Kubernetes/Docker readiness probe' })
  async getReadiness(@Res() res: Response) {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return res.status(HttpStatus.OK).json({ status: 'ready', database: 'ready' });
    } catch (err: any) {
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'not_ready',
        database: 'unavailable',
        error: err.message,
      });
    }
  }
}
