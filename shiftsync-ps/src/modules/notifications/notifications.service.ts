import { Injectable } from '@nestjs/common';
import { PrismaConfig } from '@configs/database.config';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationType } from '@db';

interface SendNotificationPayload {
  userId: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  skipAdminBroadcast?: boolean;
}

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaConfig,
    private eventEmitter: EventEmitter2,
  ) {}

  @OnEvent('notification.send')
  async handleSendNotification(payload: SendNotificationPayload) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: payload.userId,
        type: payload.type as NotificationType,
        title: payload.title,
        message: payload.message,
        metadata: payload.metadata ?? {},
      },
    });

    // Trigger real-time push to connected client
    this.eventEmitter.emit('notification.created', {
      userId: payload.userId,
      notification,
    });

    // Keep admins aware of all system activity for evaluation and oversight.
    if (!payload.skipAdminBroadcast) {
      const admins = await this.prisma.user.findMany({
        where: {
          role: 'ADMIN',
          status: 'ACTIVE',
          id: { not: payload.userId },
        },
        select: { id: true },
      });

      if (admins.length > 0) {
        const adminNotifications = await Promise.all(
          admins.map((admin) =>
            this.prisma.notification.create({
              data: {
                userId: admin.id,
                type: 'GENERAL',
                title: `[System] ${payload.title}`,
                message: payload.message,
                metadata: {
                  sourceType: payload.type,
                  sourceUserId: payload.userId,
                  ...(payload.metadata ?? {}),
                },
              },
            }),
          ),
        );

        for (const adminNotification of adminNotifications) {
          this.eventEmitter.emit('notification.created', {
            userId: adminNotification.userId,
            notification: adminNotification,
          });
        }
      }
    }
  }

  async getMyNotifications(userId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly ? { isRead: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markRead(notificationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { marked: result.count };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { count };
  }
}
