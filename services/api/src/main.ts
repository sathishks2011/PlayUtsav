import 'reflect-metadata';
import * as path from 'node:path';
import { config as loadEnv } from 'dotenv';
import cookieParser from 'cookie-parser';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './modules/app.module';

loadEnv({ path: path.join(__dirname, '../.env') });

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: ['http://localhost:5173', 'http://192.168.2.1:5173', 'http://10.5.0.2:5173', 'http://172.25.128.1:5173'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    },
  });

  // Enable cookie parsing for JWT tokens
  app.use(cookieParser());

  const config = new DocumentBuilder()
    .setTitle('PlayUtsav API')
    .setVersion('0.1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`API running on http://localhost:${port}`);
  console.log(`API also accessible on network at http://192.168.2.1:${port}`);
}

bootstrap();
