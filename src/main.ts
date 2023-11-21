import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as compression from 'compression';
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
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
bootstrap();
