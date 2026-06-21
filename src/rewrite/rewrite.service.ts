import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import { CV_REWRITE_QUEUE, RewriteJobData } from "../queue/queue.types";
import { RewriteDto } from "./dto/rewrite.dto";

@Injectable()
export class RewriteService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(CV_REWRITE_QUEUE) private readonly queue: Queue,
  ) {}

  async enqueue(dto: RewriteDto, cvText: string, apiKeyId?: string) {
    const record = await this.prisma.rewriteJob.create({
      data: {
        inputCvText: cvText,
        jobDescription: dto.jobDescription,
        language: dto.language ?? "en",
        tone: dto.tone ?? "professional",
        ...(apiKeyId ? { apiKeyId } : {}),
      },
    });

    const jobData: RewriteJobData = {
      jobRecordId: record.id,
      cvText,
      jobDescription: dto.jobDescription,
      language: dto.language ?? "en",
      tone: dto.tone ?? "professional",
    };

    const job = await this.queue.add("rewrite", jobData, {
      priority: dto.priority ?? 5,
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
    });

    const waitingCount = await this.queue.getWaitingCount();

    return {
      jobId: job.id,
      recordId: record.id,
      status: "queued" as const,
      position: waitingCount,
    };
  }

  async getStatus(jobId: string) {
    const job = await this.queue.getJob(jobId);
    if (!job) throw new NotFoundException(`Job ${jobId} not found`);

    const state = await job.getState();
    const progress = job.progress as Record<string, unknown> | number;

    return { jobId, status: state, progress };
  }

  async getResult(recordId: string) {
    const record = await this.prisma.rewriteJob.findUnique({
      where: { id: recordId },
    });
    if (!record) throw new NotFoundException(`Record ${recordId} not found`);
    if (record.status !== "COMPLETED") {
      throw new ConflictException(
        `Job is not yet complete (status: ${record.status})`,
      );
    }

    return {
      rewrittenCv: record.rewrittenCv,
      coverLetter: record.coverLetter,
      matchScore: record.matchScore,
      keywordsAdded: record.keywordsAdded,
    };
  }
}
