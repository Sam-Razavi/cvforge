import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import configuration from './config/configuration';
import { AdminAuthMiddleware } from './admin/admin-auth.middleware';
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
    BullBoardModule.forRoot({ route: '/admin/queues', adapter: ExpressAdapter }),
    PrismaModule,
    OpenAIModule,
    PdfModule,
    EventsModule,
    QueueModule,
    RewriteModule,
    HealthModule,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AdminAuthMiddleware)
      .forRoutes({ path: '/admin/queues*', method: RequestMethod.ALL });
  }
}
