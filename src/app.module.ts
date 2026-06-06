import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { EventsModule } from './events/events.module';
import { HealthModule } from './health/health.module';
import { OpenAIModule } from './openai/openai.module';
import { PdfModule } from './pdf/pdf.module';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';
import { RewriteModule } from './rewrite/rewrite.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    PrismaModule,
    OpenAIModule,
    PdfModule,
    EventsModule,
    QueueModule,
    RewriteModule,
    HealthModule,
  ],
})
export class AppModule {}
