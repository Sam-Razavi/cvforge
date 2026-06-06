import { Logger } from '@nestjs/common';
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { CV_REWRITE_QUEUE, RewriteJobData, RewriteJobResult } from './queue.types';

@Processor(CV_REWRITE_QUEUE)
export class RewriteProcessor extends WorkerHost {
  private readonly logger = new Logger(RewriteProcessor.name);

  async process(job: Job<RewriteJobData, RewriteJobResult>): Promise<RewriteJobResult> {
    this.logger.log(`Processing job ${job.id} (record: ${job.data.jobRecordId})`);

    // Stub — full implementation in Phase 6
    return {
      rewrittenCv: '',
      coverLetter: '',
      matchScore: 0,
      keywordsAdded: [],
    };
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error) {
    this.logger.error(`Job ${job?.id} failed: ${error.message}`);
  }
}
