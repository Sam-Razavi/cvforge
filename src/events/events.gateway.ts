import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ProgressPayload, RewriteJobResult } from '../queue/queue.types';

@WebSocketGateway({ cors: { origin: '*' } })
export class EventsGateway {
  @WebSocketServer()
  private readonly server!: Server;

  private readonly logger = new Logger(EventsGateway.name);

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @MessageBody() data: { jobId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.jobId);
    this.logger.debug(`Client ${client.id} subscribed to job ${data.jobId}`);
    return { event: 'subscribed', jobId: data.jobId };
  }

  emitProgress(jobId: string, payload: ProgressPayload) {
    this.server.to(jobId).emit('progress', payload);
  }

  emitCompleted(jobId: string, result: RewriteJobResult) {
    this.server.to(jobId).emit('completed', result);
  }

  emitFailed(jobId: string, error: string) {
    this.server.to(jobId).emit('failed', { error });
  }
}
