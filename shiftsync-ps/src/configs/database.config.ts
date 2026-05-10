import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma/client';
import { env } from './env';

/**
 * Prefer the direct Supabase connection (port 5432) for runtime queries.
 * The pooler (port 6543) is designed for serverless/edge — in a single
 * Node process it adds latency and intermittently drops connections.
 * The pooler URL is only used for prisma migrate / db push.
 */
const runtimeUrl = env.DIRECT_URL ?? env.DATABASE_URL;

@Injectable()
export class PrismaConfig extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('Prisma');

  constructor() {
    super({
      datasources: { db: { url: runtimeUrl } },
      log: [{ emit: 'event', level: 'error' }],
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log(`Connected to PostgreSQL`);
  }
}
