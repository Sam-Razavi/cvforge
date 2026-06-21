export const CV_REWRITE_QUEUE = "cv-rewrite";

export interface RewriteJobData {
  jobRecordId: string;
  cvText: string;
  jobDescription: string;
  language: "en" | "sv";
  tone: "professional" | "confident" | "concise";
}

export interface RewriteJobResult {
  rewrittenCv: string;
  coverLetter: string;
  matchScore: number;
  keywordsAdded: string[];
}

export interface ProgressPayload {
  stage: "extracting" | "rewriting" | "cover_letter" | "scoring" | "done";
  percent: number;
}
