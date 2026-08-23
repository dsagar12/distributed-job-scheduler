import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(EventsGateway.name);

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    this.logger.log(`WebSocket Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`WebSocket Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe:project')
  handleSubscribeProject(client: Socket, projectId: string) {
    client.join(`project:${projectId}`);
    this.logger.debug(`Client ${client.id} subscribed to project:${projectId}`);
    return { status: 'subscribed', room: `project:${projectId}` };
  }

  @SubscribeMessage('subscribe:queue')
  handleSubscribeQueue(client: Socket, queueId: string) {
    client.join(`queue:${queueId}`);
    return { status: 'subscribed', room: `queue:${queueId}` };
  }

  broadcastJobEvent(event: string, payload: any) {
    if (this.server) {
      this.server.emit(event, payload);
      if (payload.projectId) {
        this.server.to(`project:${payload.projectId}`).emit(event, payload);
      }
      if (payload.queueId) {
        this.server.to(`queue:${payload.queueId}`).emit(event, payload);
      }
    }
  }

  broadcastWorkerEvent(event: string, payload: any) {
    if (this.server) {
      this.server.emit(event, payload);
    }
  }

  broadcastMetrics(metrics: any) {
    if (this.server) {
      this.server.emit('metrics:updated', metrics);
    }
  }
}
