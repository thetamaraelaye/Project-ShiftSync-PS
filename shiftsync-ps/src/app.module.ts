import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GlobalModule } from './global.module';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import appConfigs from './configs/app.configs';
import redisConfig from './configs/redis.config';
import smtpConfig from './configs/smtp.config';
import { RedisModule } from '@shared';
import { FileModule } from './modules/file/file.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { PugAdapter } from '@nestjs-modules/mailer/dist/adapters/pug.adapter';
import { BullModule, BullRootModuleOptions } from '@nestjs/bull';
import * as path from 'path';

// Domain modules
import { AuthModule } from './modules/auth/auth.module';
import { LocationsModule } from './modules/locations/locations.module';
import { UsersModule } from './modules/users/users.module';
import { ShiftsModule } from './modules/shifts/shifts.module';
import { SchedulingModule } from './modules/scheduling/scheduling.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { CoverageModule } from './modules/coverage/coverage.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditModule } from './modules/audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfigs, redisConfig, smtpConfig],
      ignoreEnvFile: true,
    }),
    EventEmitterModule.forRoot(),
    // Rate limiting — tiered limits. In dev, limits are very generous to avoid blocking tests.
    ThrottlerModule.forRoot([
      // Default: generous for dev, strict in production
      {
        name: 'default',
        ttl: 60_000,
        limit: process.env.NODE_ENV === 'production' ? 300 : 9999,
      },
      // Strict: login and password change — brute-force protection
      {
        name: 'auth',
        ttl: 60_000,
        limit: process.env.NODE_ENV === 'production' ? 5 : 50,
      },
      // Burst: short-window flood protection
      {
        name: 'burst',
        ttl: 10_000,
        limit: process.env.NODE_ENV === 'production' ? 60 : 9999,
      },
    ]),
    GlobalModule,
    BullModule.forRootAsync({
      imports: [ConfigModule.forFeature(redisConfig)],
      inject: [redisConfig.KEY],
      useFactory: (config: ConfigType<typeof redisConfig>): BullRootModuleOptions => ({
        url: config.url,
      }),
    }),
    MailerModule.forRootAsync({
      inject: [smtpConfig.KEY],
      useFactory: (config: ConfigType<typeof smtpConfig>) => ({
        transport: config.url,
        defaults: {
          from: `"${config.label}" <${config.from}>`,
        },
        template: {
          dir: path.join(__dirname, 'shared', 'mail', 'templates'),
          adapter: new PugAdapter(),
          options: {
            strict: true,
            partials: {
              dir: path.join(__dirname, 'shared', 'mail', 'templates', 'partials'),
            },
          },
        },
        preview: false,
      }),
    }),
    RedisModule,
    FileModule,

    // Domain modules
    AuthModule,
    LocationsModule,
    UsersModule,
    ShiftsModule,
    SchedulingModule,
    AssignmentsModule,
    CoverageModule,
    RealtimeModule,
    AnalyticsModule,
    NotificationsModule,
    AuditModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global rate limiting guard — applied to ALL routes by default
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
