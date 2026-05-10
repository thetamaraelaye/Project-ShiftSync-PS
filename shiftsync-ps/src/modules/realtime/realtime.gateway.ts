import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

function normalizeOrigin(url: string): string {
  return url.trim().replace(/\/$/, '');
}

function buildAllowedOrigins(): string[] {
  const configured = (process.env.FRONTEND_URL ?? '')
    .split(',')
    .map((value) => normalizeOrigin(value))
    .filter(Boolean);

  return Array.from(new Set([...configured, 'http://localhost:3000', 'http://localhost:3001']));
}

@WebSocketGateway({
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      const normalized = normalizeOrigin(origin);
      const allowedOrigins = buildAllowedOrigins();
      const isExplicitlyAllowed = allowedOrigins.includes(normalized);
      const isVercelPreview = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(normalized);

      if (isExplicitlyAllowed || isVercelPreview) {
        return callback(null, true);
      }

      return callback(new Error(`Socket CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
  },
  namespace: '/realtime',
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('RealtimeGateway');

  constructor(private jwtService: JwtService) {}

  // ─── Connection / Auth ────────────────────────────────────────────────────

  async handleConnection(client: Socket) {
    try {
      // Try to read the token from (1) the httpOnly cookie, (2) auth payload, (3) Authorization header
      const cookieHeader = client.handshake.headers?.cookie ?? '';
      const cookieToken = cookieHeader
        .split(';')
        .map((c) => c.trim())
        .find((c) => c.startsWith('access_token='))
        ?.replace('access_token=', '');

      const token =
        cookieToken ||
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token — disconnecting`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      client.data.user = { ...payload, id: payload.sub };

      // Join personal room — used for targeted notifications
      client.join(`user:${payload.sub}`);

      // Managers join their location rooms for schedule updates
      if (payload.role === 'MANAGER' && payload.locationIds?.length) {
        for (const locationId of payload.locationIds) {
          client.join(`location:${locationId}`);
        }
      }

      // Admin joins a global room
      if (payload.role === 'ADMIN') {
        client.join('admin:global');
      }

      this.logger.log(`Client connected: ${client.id} (${payload.role} ${payload.sub})`);
    } catch {
      this.logger.warn(`Client ${client.id} invalid token — disconnecting`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // ─── Client → Server: join a location room (staff viewing a location's schedule) ──

  @SubscribeMessage('join:location')
  handleJoinLocation(
    @MessageBody() data: { locationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`location:${data.locationId}`);
  }

  @SubscribeMessage('leave:location')
  handleLeaveLocation(
    @MessageBody() data: { locationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`location:${data.locationId}`);
  }

  // ─── Server → Client: Domain events (emitted from services via EventEmitter2) ──

  @OnEvent('shift.assigned')
  handleShiftAssigned(payload: {
    shiftId: string;
    locationId: string;
    userId: string;
    staffName: string;
    actorId: string;
  }) {
    // Broadcast to everyone watching this location's schedule
    this.server.to(`location:${payload.locationId}`).emit('shift:assigned', {
      shiftId: payload.shiftId,
      userId: payload.userId,
      staffName: payload.staffName,
    });

    // Alert the second manager if there was a race — the service handles this via ConflictException,
    // but we also broadcast a soft notification so both managers get real-time awareness
    this.server.to(`location:${payload.locationId}`).emit('schedule:refresh', {
      locationId: payload.locationId,
    });
  }

  @OnEvent('shift.unassigned')
  handleShiftUnassigned(payload: { shiftId: string; locationId: string; userId: string }) {
    this.server.to(`location:${payload.locationId}`).emit('shift:unassigned', {
      shiftId: payload.shiftId,
      userId: payload.userId,
    });
    this.server.to(`location:${payload.locationId}`).emit('schedule:refresh', {
      locationId: payload.locationId,
    });
  }

  @OnEvent('schedule.published')
  handleSchedulePublished(payload: { locationId: string; weekStart: string; publishedBy: string }) {
    this.server.to(`location:${payload.locationId}`).emit('schedule:published', {
      locationId: payload.locationId,
      weekStart: payload.weekStart,
    });
  }

  @OnEvent('swap.requested')
  handleSwapRequested(payload: {
    requestId: string;
    targetId: string;
    shiftId: string;
    locationId: string;
  }) {
    this.server.to(`user:${payload.targetId}`).emit('swap:request', {
      requestId: payload.requestId,
      shiftId: payload.shiftId,
    });
  }

  @OnEvent('swap.status_changed')
  handleSwapStatusChanged(payload: {
    requestId: string;
    status: string;
    requesterId: string;
    targetId?: string;
    locationId?: string;
  }) {
    this.server.to(`user:${payload.requesterId}`).emit('swap:status', {
      requestId: payload.requestId,
      status: payload.status,
    });

    if (payload.targetId) {
      this.server.to(`user:${payload.targetId}`).emit('swap:status', {
        requestId: payload.requestId,
        status: payload.status,
      });
    }

    if (payload.locationId) {
      this.server.to(`location:${payload.locationId}`).emit('schedule:refresh', {
        locationId: payload.locationId,
      });
    }
  }

  @OnEvent('notification.created')
  handleNotificationCreated(payload: { userId: string; notification: any }) {
    this.server.to(`user:${payload.userId}`).emit('notification:new', payload.notification);
  }

  // ─── Broadcast to all admins ──────────────────────────────────────────────

  broadcastToAdmin(event: string, data: any) {
    this.server.to('admin:global').emit(event, data);
  }
}
