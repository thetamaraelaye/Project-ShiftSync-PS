import { Module, Global } from '@nestjs/common';
import Redis, { RedisOptions } from 'ioredis';
import { ConfigType } from '@nestjs/config';
import redisConfig from '@configs/redis.config';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      inject: [redisConfig.KEY],
      useFactory: (config: ConfigType<typeof redisConfig>) => {
        const options: RedisOptions = {
          lazyConnect: true,
        };

        const redis = new Redis(config.url, options);

        redis.on('connect', () => console.log('✅ Redis connected'));
        redis.on('error', (err) => console.error('❌ Redis error:', err));

        return redis;
      },
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {}
