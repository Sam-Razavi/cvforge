import { ConflictException, NotFoundException } from "@nestjs/common";
import { RewriteService } from "./rewrite.service";
import { RewriteDto } from "./dto/rewrite.dto";

const makePrisma = () => ({
  rewriteJob: {
    create: jest.fn(),
    findUnique: jest.fn(),
  },
});

const makeQueue = () => ({
  add: jest.fn().mockResolvedValue({ id: "q-1" }),
  getJob: jest.fn(),
  getWaitingCount: jest.fn().mockResolvedValue(0),
});

describe("RewriteService", () => {
  let prisma: ReturnType<typeof makePrisma>;
  let queue: ReturnType<typeof makeQueue>;
  let service: RewriteService;

  beforeEach(() => {
    prisma = makePrisma();
    queue = makeQueue();
    service = new RewriteService(prisma as never, queue as never);
  });

  describe("enqueue", () => {
    it("creates a DB record and adds job to the queue", async () => {
      prisma.rewriteJob.create.mockResolvedValue({ id: "rec-1" });
      const dto: Partial<RewriteDto> = {
        jobDescription: "Software Engineer role",
      };

      const result = await service.enqueue(dto as RewriteDto, "cv text");

      expect(prisma.rewriteJob.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            jobDescription: "Software Engineer role",
          }),
        }),
      );
      expect(queue.add).toHaveBeenCalledWith(
        "rewrite",
        expect.objectContaining({ jobRecordId: "rec-1", cvText: "cv text" }),
        expect.any(Object),
      );
      expect(result).toMatchObject({
        jobId: "q-1",
        recordId: "rec-1",
        status: "queued",
      });
    });

    it("stores apiKeyId on the record when provided", async () => {
      prisma.rewriteJob.create.mockResolvedValue({ id: "rec-2" });

      await service.enqueue({ jobDescription: "Dev" }, "cv", "key-abc");

      expect(prisma.rewriteJob.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ apiKeyId: "key-abc" }),
        }),
      );
    });

    it("omits apiKeyId when not provided", async () => {
      prisma.rewriteJob.create.mockResolvedValue({ id: "rec-3" });

      await service.enqueue({ jobDescription: "Dev" }, "cv");

      const callData = prisma.rewriteJob.create.mock.calls[0][0].data;
      expect(callData).not.toHaveProperty("apiKeyId");
    });
  });

  describe("getStatus", () => {
    it("throws NotFoundException when job is absent from the queue", async () => {
      queue.getJob.mockResolvedValue(null);
      await expect(service.getStatus("ghost")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("returns state and progress for an existing job", async () => {
      queue.getJob.mockResolvedValue({
        getState: jest.fn().mockResolvedValue("active"),
        progress: { stage: "rewriting", percent: 40 },
      });

      const result = await service.getStatus("job-1");

      expect(result).toEqual({
        jobId: "job-1",
        status: "active",
        progress: { stage: "rewriting", percent: 40 },
      });
    });
  });

  describe("getResult", () => {
    it("throws NotFoundException when record does not exist", async () => {
      prisma.rewriteJob.findUnique.mockResolvedValue(null);
      await expect(service.getResult("ghost")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("throws ConflictException when job is still processing", async () => {
      prisma.rewriteJob.findUnique.mockResolvedValue({ status: "PROCESSING" });
      await expect(service.getResult("rec-1")).rejects.toThrow(
        ConflictException,
      );
    });

    it("returns all output fields for a completed job", async () => {
      prisma.rewriteJob.findUnique.mockResolvedValue({
        status: "COMPLETED",
        rewrittenCv: "Updated CV",
        coverLetter: "Cover letter text",
        matchScore: 87,
        keywordsAdded: ["TypeScript", "NestJS"],
      });

      const result = await service.getResult("rec-1");

      expect(result).toEqual({
        rewrittenCv: "Updated CV",
        coverLetter: "Cover letter text",
        matchScore: 87,
        keywordsAdded: ["TypeScript", "NestJS"],
      });
    });
  });
});
