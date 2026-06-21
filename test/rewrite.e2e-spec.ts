/**
 * e2e smoke test for the rewrite flow.
 * External dependencies (Redis, Postgres, OpenAI) are fully replaced with
 * in-process mocks so the test suite runs without any running services.
 */

import {
  Global,
  INestApplication,
  Module,
  ValidationPipe,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { getQueueToken } from "@nestjs/bullmq";
import request from "supertest";
import { App } from "supertest/types";
import configuration from "../src/config/configuration";
import { HealthModule } from "../src/health/health.module";
import { RewriteModule } from "../src/rewrite/rewrite.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { CV_REWRITE_QUEUE } from "../src/queue/queue.types";

const FAKE_API_KEY = "cvf_testkey123";
const FAKE_KEY_ID = "key-uuid-1";
const FAKE_RECORD_ID = "rec-uuid-1";
const FAKE_JOB_ID = "bull-job-1";

const mockPrismaValue = {
  apiKey: {
    findUnique: jest.fn().mockResolvedValue({ id: FAKE_KEY_ID, active: true }),
    update: jest.fn().mockResolvedValue(undefined),
  },
  rewriteJob: {
    create: jest.fn().mockResolvedValue({ id: FAKE_RECORD_ID }),
    findUnique: jest.fn(),
  },
  $connect: jest.fn(),
  $disconnect: jest.fn(),
};

const mockQueueValue = {
  add: jest.fn().mockResolvedValue({ id: FAKE_JOB_ID }),
  getJob: jest.fn(),
  getWaitingCount: jest.fn().mockResolvedValue(2),
  close: jest.fn(),
};

@Global()
@Module({
  providers: [{ provide: PrismaService, useValue: mockPrismaValue }],
  exports: [PrismaService],
})
class MockPrismaModule {}

describe("Rewrite flow (e2e)", () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
        MockPrismaModule,
        HealthModule,
        RewriteModule,
      ],
    })
      .overrideProvider(getQueueToken(CV_REWRITE_QUEUE))
      .useValue(mockQueueValue)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    await app.init();
  });

  afterAll(() => app.close());

  describe("GET /health", () => {
    it("returns status ok", () =>
      request(app.getHttpServer())
        .get("/health")
        .expect(200)
        .expect((res) => expect(res.body.status).toBe("ok")));
  });

  describe("POST /rewrite", () => {
    it("returns 401 when API key is missing", () =>
      request(app.getHttpServer())
        .post("/rewrite")
        .send({ jobDescription: "Engineer", cvText: "My CV" })
        .expect(401));

    it("returns 400 when jobDescription is absent", () =>
      request(app.getHttpServer())
        .post("/rewrite")
        .set("x-api-key", FAKE_API_KEY)
        .send({ cvText: "My CV" })
        .expect(400));

    it("enqueues a job and returns jobId/recordId", () =>
      request(app.getHttpServer())
        .post("/rewrite")
        .set("x-api-key", FAKE_API_KEY)
        .send({
          jobDescription: "Senior Software Engineer",
          cvText: "My CV text here",
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.jobId).toBe(FAKE_JOB_ID);
          expect(res.body.recordId).toBe(FAKE_RECORD_ID);
          expect(res.body.status).toBe("queued");
        }));
  });

  describe("GET /jobs/:id", () => {
    it("returns 401 when API key is missing", () =>
      request(app.getHttpServer()).get("/jobs/some-id").expect(401));

    it("returns 404 when job does not exist in queue", () => {
      mockQueueValue.getJob.mockResolvedValueOnce(null);
      return request(app.getHttpServer())
        .get("/jobs/ghost-id")
        .set("x-api-key", FAKE_API_KEY)
        .expect(404);
    });

    it("returns job status when found", () => {
      mockQueueValue.getJob.mockResolvedValueOnce({
        getState: jest.fn().mockResolvedValue("active"),
        progress: { stage: "rewriting", percent: 40 },
      });
      return request(app.getHttpServer())
        .get(`/jobs/${FAKE_JOB_ID}`)
        .set("x-api-key", FAKE_API_KEY)
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe("active");
          expect(res.body.progress.stage).toBe("rewriting");
        });
    });
  });

  describe("GET /jobs/:id/result", () => {
    it("returns 409 when job is still processing", () => {
      mockPrismaValue.rewriteJob.findUnique.mockResolvedValueOnce({
        status: "PROCESSING",
      });
      return request(app.getHttpServer())
        .get(`/jobs/${FAKE_RECORD_ID}/result`)
        .set("x-api-key", FAKE_API_KEY)
        .expect(409);
    });

    it("returns full result for a completed job", () => {
      mockPrismaValue.rewriteJob.findUnique.mockResolvedValueOnce({
        status: "COMPLETED",
        rewrittenCv: "Polished CV",
        coverLetter: "Cover letter",
        matchScore: 92,
        keywordsAdded: ["React", "TypeScript"],
      });
      return request(app.getHttpServer())
        .get(`/jobs/${FAKE_RECORD_ID}/result`)
        .set("x-api-key", FAKE_API_KEY)
        .expect(200)
        .expect((res) => {
          expect(res.body.matchScore).toBe(92);
          expect(res.body.keywordsAdded).toContain("React");
        });
    });
  });
});
