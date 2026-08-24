const { prisma } = require('../config/db');
const { publisher } = require('../config/redis');

class HealthService {
  async checkHealth() {
    let dbStatus = 'healthy';
    let redisStatus = 'healthy';

    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'degraded';
    }

    try {
      if (publisher && publisher.status === 'ready') {
        await publisher.ping();
      } else {
        redisStatus = 'offline';
      }
    } catch {
      redisStatus = 'degraded';
    }

    return {
      status: 'ok',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptimeSeconds: process.uptime(),
      dependencies: {
        database: dbStatus,
        redis: redisStatus,
      },
    };
  }
}

module.exports = new HealthService();
