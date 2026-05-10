import { registerAs } from '@nestjs/config';
import { env } from './env';

export default registerAs('redis', () => ({
  url: env.REDIS_URL,
}));
