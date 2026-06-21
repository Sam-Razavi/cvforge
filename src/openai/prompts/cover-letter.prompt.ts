import { RewriteJobData } from "../../queue/queue.types";

export function buildCoverLetterPrompt(
  rewrittenCv: string,
  jobDescription: string,
  language: RewriteJobData["language"],
  tone: RewriteJobData["tone"],
): { system: string; user: string } {
  const toneGuide: Record<RewriteJobData["tone"], string> = {
    professional: "formal and polished",
    confident: "assertive and direct",
    concise: "brief and to-the-point",
  };

  const langInstruction =
    language === "sv"
      ? "Write the entire cover letter in Swedish."
      : "Write the entire cover letter in English.";

  return {
    system: `You are an expert career coach who writes compelling cover letters.
Your task is to write a concise, tailored cover letter for a specific job.

Rules:
- Open with the role name and a strong hook that references the candidate's most relevant strength.
- Reference two or three concrete achievements or skills from the CV that directly match the job description.
- Close with a confident call to action.
- Keep it to three short paragraphs — no longer.
- Use a ${toneGuide[tone]} tone.
- ${langInstruction}
- Return ONLY the cover letter text with no commentary, preamble, or markdown fences.`,

    user: `JOB DESCRIPTION:
${jobDescription}

CANDIDATE CV:
${rewrittenCv}`,
  };
}
