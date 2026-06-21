import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { OpenAIService } from "./openai.service";

// Minimal stub that matches the OpenAI SDK interface used by the service
const mockCreate = jest.fn();
jest.mock("openai", () => {
  return jest.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate } },
  }));
});

function makeCompletion(content: string) {
  return { choices: [{ message: { content } }] };
}

describe("OpenAIService", () => {
  let service: OpenAIService;

  beforeEach(async () => {
    mockCreate.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenAIService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === "openai.apiKey") return "test-key";
              if (key === "openai.model") return "gpt-4o-mini";
              return undefined;
            },
          },
        },
      ],
    }).compile();

    service = module.get(OpenAIService);
  });

  describe("rewriteCv", () => {
    it("returns the model text content", async () => {
      mockCreate.mockResolvedValueOnce(makeCompletion("Rewritten CV content"));

      const result = await service.rewriteCv(
        "old cv",
        "job desc",
        "en",
        "professional",
      );

      expect(result).toBe("Rewritten CV content");
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gpt-4o-mini",
          messages: expect.arrayContaining([
            expect.objectContaining({ role: "system" }),
            expect.objectContaining({ role: "user" }),
          ]),
        }),
      );
    });

    it("returns empty string when content is null", async () => {
      mockCreate.mockResolvedValueOnce(
        makeCompletion(null as unknown as string),
      );
      const result = await service.rewriteCv("cv", "jd", "sv", "concise");
      expect(result).toBe("");
    });
  });

  describe("generateCoverLetter", () => {
    it("returns cover letter text", async () => {
      mockCreate.mockResolvedValueOnce(
        makeCompletion("Dear Hiring Manager..."),
      );

      const result = await service.generateCoverLetter(
        "cv text",
        "job desc",
        "en",
        "confident",
      );

      expect(result).toBe("Dear Hiring Manager...");
    });
  });

  describe("analyzeMatch", () => {
    it("parses JSON response into MatchAnalysis shape", async () => {
      const payload = {
        matchScore: 82,
        keywordsAdded: ["TypeScript", "Node.js"],
        missingKeywords: ["Kubernetes"],
      };
      mockCreate.mockResolvedValueOnce(makeCompletion(JSON.stringify(payload)));

      const result = await service.analyzeMatch("cv text", "job desc");

      expect(result.matchScore).toBe(82);
      expect(result.keywordsAdded).toEqual(["TypeScript", "Node.js"]);
      expect(result.missingKeywords).toEqual(["Kubernetes"]);
    });

    it("requests json_object response format", async () => {
      mockCreate.mockResolvedValueOnce(
        makeCompletion(
          '{"matchScore":0,"keywordsAdded":[],"missingKeywords":[]}',
        ),
      );
      await service.analyzeMatch("cv", "jd");
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ response_format: { type: "json_object" } }),
      );
    });
  });
});
