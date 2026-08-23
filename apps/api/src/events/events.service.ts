import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import Redis from 'ioredis';

@Injectable()
export class EventsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventsService.name);
  private subscriber: Redis | null = null;
  private publisher: Redis | null = null;

  constructor(private readonly gateway: EventsGateway) {}

  async onModuleInit() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    try {
      this.subscriber = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => {
          if (times > 3) {
            this.logger.warn('Redis unavailable; continuing in standalone mode without Redis Pub/Sub.');
            return null;
          }
          return Math.min(times * 1000, 3000);
        },
      });

      this.publisher = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => (times > 3 ? null : 1000),
      });

      this.subscriber.on('error', (err) => {
        this.logger.debug(`Redis subscriber notice: ${err.message}`);
      });

      this.publisher.on('error', (err) => {
        this.logger.debug(`Redis publisher notice: ${err.message}`);
      });

      this.subscriber.on('connect', async () => {
        this.logger.log('Connected to Redis for real-time Pub/Sub event streaming');
        await this.subscriber?.psubscribe('scheduler:events:*');
      });

      this.subscriber.on('pmessage', (_pattern, channel, message) => {
        try {
          const parsed = JSON.parse(message);
          const eventType = channel.replace('scheduler:events:', '');
          this.gateway.broadcastJobEvent(eventType, parsed);
        } catch {
          // Ignore invalid JSON payloads
        }
      });
    } catch (err: any) {
      this.logger.warn(`Redis init deferred: ${err.message}`);
    }
  }

  async publishEvent(channel: string, payload: any) {
    // Broadcast locally to WebSocket clients
    this.gateway.broadcastJobEvent(channel, payload);

    // Publish to Redis if connected
    if (this.publisher && this.publisher.status === 'ready') {
      try {
        await this.publisher.publish(`scheduler:events:${channel}`, JSON.stringify(payload));
      } catch (err: any) {
        this.logger.debug(`Redis publish error: ${err.message}`);
      }
    }
  }

  async onModuleDestroy() {
    if (this.subscriber) {
      await this.subscriber.quit().catch(() => {});
    }
    if (this.publisher) {
      await this.publisher.quit().catch(() => {});
    }
  }
}
