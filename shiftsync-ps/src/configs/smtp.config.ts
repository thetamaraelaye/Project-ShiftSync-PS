import { registerAs } from '@nestjs/config';
import { env } from './env';

export default registerAs('smtp', () => ({
  url: env.SMTP_URL,
  from: env.MAIL_FROM,
  label: env.MAIL_LABEL,
}));
