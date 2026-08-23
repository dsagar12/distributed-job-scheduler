import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from cwd or repo root
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const DEFAULT_DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://scheduler_user:scheduler_secret_pw@localhost:5432/distributed_job_scheduler?schema=public';

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = DEFAULT_DATABASE_URL;
}

let globalPrisma: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
  if (!globalPrisma) {
    globalPrisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || DEFAULT_DATABASE_URL,
        },
      },
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }
  return globalPrisma;
}

export const prisma = getPrismaClient();

export async function disconnectPrisma(): Promise<void> {
  if (globalPrisma) {
    await globalPrisma.$disconnect();
    globalPrisma = null;
  }
}
