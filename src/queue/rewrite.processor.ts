import { Logger } from '@nestjs/common';
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { OpenAIService } from '../openai/openai.service';
import { EventsGateway } from '../events/events.gateway';
import { CV_REWRITE_QUEUE, RewriteJobData, RewriteJobResult, ProgressPayload } from './queue.types';

@Processor(CV_REWRITE_QUEUE, { concurrency: 5, limiter: { max: 20, duration: 60_000 } })
export class RewriteProcessor extends WorkerHost {
  private readonly logger = new Logger(RewriteProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly openai: OpenAIService,
    private readonly events: EventsGateway,
  ) {
    super();
  }

  async process(job: Job<RewriteJobData, RewriteJobResult>): Promise<RewriteJobResult> {
    const { jobRecordId, cvText, jobDescription, language, tone } = job.data;
    this.logger.log(`Processing job ${job.id} (record: ${jobRecordId})`);

    await this.progress(job, { stage: 'extracting', percent: 10 });

    await this.prisma.rewriteJob.update({
      where: { id: jobRecordId },
      data: { status: 'PROCESSING' },
    });

    await this.progress(job, { stage: 'rewriting', percent: 40 });
    const rewrittenCv = await this.openai.rewriteCv(cvText, jobDescription, language, tone);

    await this.progress(job, { stage: 'cover_letter', percent: 70 });
    const coverLetter = await this.openai.generateCoverLetter(rewrittenCv, jobDescription, language, tone);

    await this.progress(job, { stage: 'scoring', percent: 90 });
    const { matchScore, keywordsAdded } = await this.openai.analyzeMatch(rewrittenCv, jobDescription);

    await this.prisma.rewriteJob.update({
      where: { id: jobRecordId },
      data: {
        status: 'COMPLETED',
        rewrittenCv,
        coverLetter,
        matchScore,
        keywordsAdded,
        completedAt: new Date(),
      },
    });

    const result: RewriteJobResult = { rewrittenCv, coverLetter, matchScore, keywordsAdded };

    await this.progress(job, { stage: 'done', percent: 100 });
    this.events.emitCompleted(String(job.id), result);

    this.logger.log(`Job ${job.id} completed (score: ${matchScore})`);
    return result;
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<RewriteJobData> | undefined, error: Error) {
    this.logger.error(`Job ${job?.id} failed: ${error.message}`);

    if (job?.data?.jobRecordId) {
      await this.prisma.rewriteJob
        .update({
          where: { id: job.data.jobRecordId },
          data: { status: 'FAILED', error: error.message },
        })
        .catch((e) => this.logger.error(`Failed to persist error state: ${e.message}`));

      this.events.emitFailed(String(job.id), error.message);
    }
  }

  private async progress(job: Job, payload: ProgressPayload) {
    await job.updateProgress(payload);
    this.events.emitProgress(String(job.id), payload);
  }
}
