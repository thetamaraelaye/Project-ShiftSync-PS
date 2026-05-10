import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import basicAuth from 'express-basic-auth';
import cookieParser from 'cookie-parser';
import { env } from '@configs';
import { ResponseInterceptor, GlobalExceptionFilter } from '@common';
import { VersioningType } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Trust proxy headers (for proper IP detection behind load balancers / Vercel / Railway)
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // Cookie parser — required for httpOnly auth cookies
  app.use(cookieParser());

  // CORS with credentials for cookie-based auth
  app.enableCors({
    origin: [
      env.FRONTEND_URL ?? 'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3000',
    ],
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
