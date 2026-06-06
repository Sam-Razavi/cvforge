import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CV_REWRITE_QUEUE } from './queue.types';
import { RewriteProcessor } from './rewrite.processor';
import { OpenAIModule } from '../openai/openai.module';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('redis.host'),
          port: config.get<number>('redis.port'),
        },
      }),
    }),
    BullModule.registerQueue({ name: CV_REWRITE_QUEUE }),
    OpenAIModule,
  ],
  providers: [RewriteProcessor],
  exports: [BullModule],
})
export class QueueModule {}
