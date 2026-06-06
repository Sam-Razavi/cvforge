import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { RewriteController } from './rewrite.controller';
import { RewriteService } from './rewrite.service';
import { CV_REWRITE_QUEUE } from '../queue/queue.types';
import { AuthModule } from '../auth/auth.module';
import { PdfModule } from '../pdf/pdf.module';

@Module({
  imports: [BullModule.registerQueue({ name: CV_REWRITE_QUEUE }), AuthModule, PdfModule],
  controllers: [RewriteController],
  providers: [RewriteService],
})
export class RewriteModule {}
