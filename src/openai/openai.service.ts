import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";
import { RewriteJobData } from "../queue/queue.types";
import { buildRewriteCvPrompt } from "./prompts/rewrite-cv.prompt";
import { buildCoverLetterPrompt } from "./prompts/cover-letter.prompt";
import {
  buildMatchAnalysisPrompt,
  MatchAnalysis,
} from "./prompts/match-analysis.prompt";

@Injectable()
export class OpenAIService {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly logger = new Logger(OpenAIService.name);

  constructor(private readonly config: ConfigService) {
    this.client = new OpenAI({ apiKey: config.get<string>("openai.apiKey") });
    this.model = config.get<string>("openai.model") ?? "gpt-4o-mini";
  }

  async rewriteCv(
    cvText: string,
    jobDescription: string,
    language: RewriteJobData["language"],
    tone: RewriteJobData["tone"],
  ): Promise<string> {
    const { system, user } = buildRewriteCvPrompt(
      cvText,
      jobDescription,
      language,
      tone,
    );
    this.logger.debug(`rewriteCv: model=${this.model}`);

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    return response.choices[0].message.content ?? "";
  }

  async generateCoverLetter(
    rewrittenCv: string,
    jobDescription: string,
    language: RewriteJobData["language"],
    tone: RewriteJobData["tone"],
  ): Promise<string> {
    const { system, user } = buildCoverLetterPrompt(
      rewrittenCv,
      jobDescription,
      language,
      tone,
    );
    this.logger.debug(`generateCoverLetter: model=${this.model}`);

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    return response.choices[0].message.content ?? "";
  }

  async analyzeMatch(
    cvText: string,
    jobDescription: string,
  ): Promise<MatchAnalysis> {
    const { system, user } = buildMatchAnalysisPrompt(cvText, jobDescription);
    this.logger.debug(`analyzeMatch: model=${this.model}`);

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0].message.content ?? "{}";
    return JSON.parse(raw) as MatchAnalysis;
  }
}
