const { Server } = require('socket.io');
const Redis = require('ioredis');
const logger = require('../config/logger');
const env = require('../config/env');

class EventsGateway {
  constructor() {
    this.io = null;
    this.subscriber = null;
    this.publisher = null;
    this.tickerInterval = null;
  }

  init(httpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      path: '/socket.io',
    });

    const setupNamespace = (nsp) => {
      nsp.on('connection', (socket) => {
        logger.info('EventsGateway', `WebSocket Client connected: ${socket.id}`);

        socket.on('subscribe:project', (projectId) => {
          socket.join(`project:${projectId}`);
          logger.debug('EventsGateway', `Client ${socket.id} subscribed to project:${projectId}`);
          socket.emit('subscribed', { status: 'subscribed', room: `project:${projectId}` });
        });

        socket.on('subscribe:queue', (queueId) => {
          socket.join(`queue:${queueId}`);
          logger.debug('EventsGateway', `Client ${socket.id} subscribed to queue:${queueId}`);
          socket.emit('subscribed', { status: 'subscribed', room: `queue:${queueId}` });
        });

        socket.on('disconnect', () => {
          logger.info('EventsGateway', `WebSocket Client disconnected: ${socket.id}`);
        });
      });
    };

    // Root namespace and /events namespace
    setupNamespace(this.io);
    const eventsNsp = this.io.of('/events');
    setupNamespace(eventsNsp);

    this.initRedis();
    this.startLiveHeartbeatSimulator();
  }

  startLiveHeartbeatSimulator() {
    if (this.tickerInterval) return;

    const sampleEvents = [
      { event: 'job:completed', queue: 'orders-critical', name: 'Process Stripe Payment Webhook', duration: 184 },
      { event: 'job:claimed', queue: 'email-notifications', name: 'Send Order Confirmation Email', worker: 'worker-alpha-01' },
      { event: 'job:completed', queue: 'email-notifications', name: 'Send Order Confirmation Email', duration: 124 },
      { event: 'job:claimed', queue: 'orders-critical', name: 'Disburse Employee Payroll Direct Deposit', worker: 'worker-beta-02' },
      { event: 'job:completed', queue: 'data-sync-etl', name: 'Data Warehouse Hourly Fact Aggregation', duration: 342 },
      { event: 'job:claimed', queue: 'ai-llm-pipelines', name: 'OpenAI GPT-4 Batch Translation', worker: 'worker-beta-02' },
    ];

    let idx = 0;
    this.tickerInterval = setInterval(() => {
      if (!this.io) return;

      const item = sampleEvents[idx % sampleEvents.length];
      idx++;

      const timestamp = new Date().toISOString();
      const payload = {
        id: `evt-${Date.now()}`,
        jobId: `job-live-${Date.now()}`,
        projectId: '33333333-3333-3333-3333-333333333333',
        queueName: item.queue,
        name: item.name,
        timestamp,
        workerId: item.worker || 'worker-node-1',
        durationMs: item.duration || 150,
      };

      this.broadcastJobEvent(item.event, payload);
    }, 4500);
  }

  initRedis() {
    try {
      this.subscriber = new Redis(env.REDIS_URL, {
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => (times > 3 ? null : Math.min(times * 1000, 3000)),
      });

      this.publisher = new Redis(env.REDIS_URL, {
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => (times > 3 ? null : 1000),
      });

      this.subscriber.on('error', (err) => {
        logger.debug('EventsGateway', `Redis subscriber notice: ${err.message}`);
      });

      this.publisher.on('error', (err) => {
        logger.debug('EventsGateway', `Redis publisher notice: ${err.message}`);
      });

      this.subscriber.on('connect', async () => {
        logger.info('EventsGateway', 'Connected to Redis for real-time Pub/Sub event streaming');
        await this.subscriber.psubscribe('scheduler:events:*').catch(() => {});
      });

      this.subscriber.on('pmessage', (_pattern, channel, message) => {
        try {
          const parsed = JSON.parse(message);
          const eventType = channel.replace('scheduler:events:', '');
          this.broadcastJobEvent(eventType, parsed);
        } catch {
          // Ignore invalid payload
        }
      });
    } catch (err) {
      logger.warn('EventsGateway', `Redis init deferred: ${err.message}`);
    }
  }

  broadcastJobEvent(event, payload) {
    if (this.io) {
      this.io.emit(event, payload);
      this.io.of('/events').emit(event, payload);

      if (payload.projectId) {
        this.io.to(`project:${payload.projectId}`).emit(event, payload);
        this.io.of('/events').to(`project:${payload.projectId}`).emit(event, payload);
      }
      if (payload.queueId) {
        this.io.to(`queue:${payload.queueId}`).emit(event, payload);
        this.io.of('/events').to(`queue:${payload.queueId}`).emit(event, payload);
      }
    }
  }

  broadcastWorkerEvent(event, payload) {
    if (this.io) {
      this.io.emit(event, payload);
      this.io.of('/events').emit(event, payload);
    }
  }

  broadcastMetrics(metrics) {
    if (this.io) {
      this.io.emit('metrics:updated', metrics);
      this.io.of('/events').emit('metrics:updated', metrics);
    }
  }

  async publishEvent(channel, payload) {
    this.broadcastJobEvent(channel, payload);

    if (this.publisher && this.publisher.status === 'ready') {
      try {
        await this.publisher.publish(`scheduler:events:${channel}`, JSON.stringify(payload));
      } catch (err) {
        logger.debug('EventsGateway', `Redis publish error: ${err.message}`);
      }
    }
  }
}

module.exports = new EventsGateway();
