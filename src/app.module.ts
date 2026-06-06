import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { HealthModule } from './health/health.module';
import { OpenAIModule } from './openai/openai.module';
import { PdfModule } from './pdf/pdf.module';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    PrismaModule,
    OpenAIModule,
    PdfModule,
    QueueModule,
    HealthModule,
  ],
})
export class AppModule {}
