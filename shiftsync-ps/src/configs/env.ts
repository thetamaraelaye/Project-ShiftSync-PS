import { get } from 'env-var';
import * as dotenv from 'dotenv';

dotenv.config();

export const env = {
  APP_NAME: get('APP_NAME').default('ShiftSync').asString(),
  APP_DESC: get('APP_DESC')
    .default('ShiftSync — Multi-Location Staff Scheduling Platform')
    .asString(),
  NODE_ENV: get('NODE_ENV').default('dev').asString(),
  PORT: get('PORT').default(8030).asPortNumber(),

  DATABASE_URL: get('DATABASE_URL').asString(),
  DIRECT_URL: get('DIRECT_URL').asString(),
  JWT_SECRET: get('JWT_SECRET').default('dev-secret-change-in-prod-min-32-chars').asString(),
  JWT_EXPIRY: get('JWT_EXPIRY').default('7d').asString(),
  REDIS_URL: get('REDIS_URL').default('redis://localhost:6379').asString(),
  MAIL_LABEL: get('MAIL_LABEL').default('ShiftSync').asString(),
  MAIL_FROM: get('MAIL_FROM').default('noreply@shiftsync.app').asString(),
  SMTP_URL: get('SMTP_URL').asString(),
  FRONTEND_URL: get('FRONTEND_URL').default('http://localhost:3001').asString(),
};
