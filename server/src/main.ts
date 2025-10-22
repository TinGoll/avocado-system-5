import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: (origin, callback) => {
      // Ваша логика origin остается прежней
      if (origin) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        callback(null, true);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        callback(null, true);
      }
    },
    allowedHeaders:
      'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, Observe, Authorization, access-control-allow-origin',

    methods: 'GET,PUT,PATCH,POST,DELETE,OPTIONS',

    credentials: true,
  });

  const config = app.get(ConfigService);
  const port = config.get<number>('API_PORT') || 3000;
  await app.listen(port, () => {
    console.log('\x1b[33m%s\x1b[0m', `Server started on port ${port}`);
  });
}
void bootstrap();
