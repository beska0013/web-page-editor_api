import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as compression from 'compression';
import * as express from 'express';
import { JSDOM } from 'jsdom';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: [
      'http://localhost:8080',
      'https://www.intempt.com',
      'https://intempt.com',
    ],
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['*'],
    // credentials: true,
  });

  const { window } = new JSDOM(
    '<!DOCTYPE html><html lang="en"><body></body></html>',
  );
  global.window = window as unknown as Window & typeof globalThis;
  global.document = window.document;
  global.DOMParser = new JSDOM().window.DOMParser;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  await app.listen(3000).then(() => {
    console.log('Server is running on http://localhost:3000');
  });
  app.use(
    compression({
      filter: () => {
        return true;
      },
      threshold: 40,
    }),
  );
}
bootstrap().then((r) => r);
