import { buildRewriteCvPrompt } from "./rewrite-cv.prompt";
import { buildCoverLetterPrompt } from "./cover-letter.prompt";
import { buildMatchAnalysisPrompt } from "./match-analysis.prompt";

describe("buildRewriteCvPrompt", () => {
  it("includes job description and cv in the user message", () => {
    const { user } = buildRewriteCvPrompt(
      "My CV",
      "Backend role",
      "en",
      "professional",
    );
    expect(user).toContain("My CV");
    expect(user).toContain("Backend role");
  });

  it("instructs Swedish output when language is sv", () => {
    const { system } = buildRewriteCvPrompt("cv", "jd", "sv", "professional");
    expect(system).toMatch(/Swedish/i);
  });

  it("reflects tone in system prompt", () => {
    const { system } = buildRewriteCvPrompt("cv", "jd", "en", "concise");
    expect(system).toMatch(/brief|punchy|concise/i);
  });
});

describe("buildCoverLetterPrompt", () => {
  it("includes cv and job description in user message", () => {
    const { user } = buildCoverLetterPrompt(
      "Rewritten CV",
      "PM role",
      "en",
      "confident",
    );
    expect(user).toContain("Rewritten CV");
    expect(user).toContain("PM role");
  });

  it("instructs Swedish output when language is sv", () => {
    const { system } = buildCoverLetterPrompt("cv", "jd", "sv", "professional");
    expect(system).toMatch(/Swedish/i);
  });
});

describe("buildMatchAnalysisPrompt", () => {
  it("includes both cv and job description in user message", () => {
    const { user } = buildMatchAnalysisPrompt("candidate cv", "target job");
    expect(user).toContain("candidate cv");
    expect(user).toContain("target job");
  });

  it("requests JSON output in system prompt", () => {
    const { system } = buildMatchAnalysisPrompt("cv", "jd");
    expect(system).toContain("matchScore");
    expect(system).toContain("keywordsAdded");
    expect(system).toContain("missingKeywords");
  });
});
