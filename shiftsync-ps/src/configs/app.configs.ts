import { registerAs } from '@nestjs/config';
import { env } from './env';

export default registerAs('app', () => ({
  port: env.PORT,
  name: env.APP_NAME,
  description: env.APP_DESC,
}));
