import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import basicAuth from 'express-basic-auth';
import cookieParser from 'cookie-parser';
import { env } from '@configs';
import { ResponseInterceptor, GlobalExceptionFilter } from '@common';
import { VersioningType } from '@nestjs/common';

function normalizeOrigin(url: string): string {
  return url.trim().replace(/\/$/, '');
}

function buildAllowedOrigins(): string[] {
  const configured = (env.FRONTEND_URL ?? '')
    .split(',')
    .map((value) => normalizeOrigin(value))
    .filter(Boolean);

  return Array.from(
    new Set([
      ...configured,
      'http://localhost:3000',
      'http://localhost:3001',
      'https://project-shift-sync-ps.vercel.app',
    ]),
  );
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const allowedOrigins = buildAllowedOrigins();

  // Trust proxy headers (for proper IP detection behind load balancers / Vercel / Railway)
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // Cookie parser — required for httpOnly auth cookies
  app.use(cookieParser());

  // CORS with credentials for cookie-based auth
  app.enableCors({
    origin: (origin, callback) => {
      // Allow same-origin and non-browser clients with no Origin header.
      if (!origin) return callback(null, true);

      const normalized = normalizeOrigin(origin);
      const isExplicitlyAllowed = allowedOrigins.includes(normalized);
      const isVercelPreview = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(normalized);

      if (isExplicitlyAllowed || isVercelPreview) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
    exposedHeaders: [
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'Retry-After',
    ],
  });

  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.use(
    ['/docs'],
    basicAuth({
      challenge: true,
      users: { client: 'heyoo!' },
      unauthorizedResponse: () => {
        return {
          success: false,
          status: 'error',
          message: 'Unauthorized, please login to continue',
        };
      },
    }),
  );

  const swaggerDocsConfig = new DocumentBuilder()
    .setTitle(`${env.APP_NAME} API backend documentation`)
    .setDescription(`${env.APP_DESC}`)
    .setVersion('1.0')
    .addBearerAuth()
    .setExternalDoc('Postman Collection', '/swagger/json')
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, swaggerDocsConfig);
  SwaggerModule.setup('docs', app, documentFactory, {
    swaggerOptions: {
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      persistAuthorization: true,
    },
    jsonDocumentUrl: 'swagger/json',
    explorer: true,
  });

  const port = env.PORT;
  await app.listen(port);

  console.info(`
    ------
    API server listening on port: :${port}
    Access documentation :${port}/docs
    ------
    `);
}
bootstrap();
