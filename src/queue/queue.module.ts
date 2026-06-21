import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { BullBoardModule } from "@bull-board/nestjs";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { CV_REWRITE_QUEUE } from "./queue.types";
import { RewriteProcessor } from "./rewrite.processor";
import { OpenAIModule } from "../openai/openai.module";
import { EventsModule } from "../events/events.module";

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>("redis.host"),
          port: config.get<number>("redis.port"),
        },
      }),
    }),
    BullModule.registerQueue({
      name: CV_REWRITE_QUEUE,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5_000 },
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 100 },
      },
    }),
    BullBoardModule.forFeature({
      name: CV_REWRITE_QUEUE,
      adapter: BullMQAdapter,
    }),
    OpenAIModule,
    EventsModule,
  ],
  providers: [RewriteProcessor],
  exports: [BullModule],
})
export class QueueModule {}
