import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);
  const port = config.get<number>('port') ?? 3000;
  const corsOrigins = config.get<string[]>('cors.origins') ?? [];

  app.enableCors({ origin: corsOrigins });

  await app.listen(port);
}
bootstrap();
