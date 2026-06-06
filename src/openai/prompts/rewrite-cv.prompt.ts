import { RewriteJobData } from '../../queue/queue.types';

export function buildRewriteCvPrompt(
  cvText: string,
  jobDescription: string,
  language: RewriteJobData['language'],
  tone: RewriteJobData['tone'],
): { system: string; user: string } {
  const toneGuide: Record<RewriteJobData['tone'], string> = {
    professional: 'formal, precise, and achievement-focused',
    confident: 'assertive, direct, and impact-driven',
    concise: 'brief, punchy, and bullet-point-friendly',
  };

  const langInstruction =
    language === 'sv'
      ? 'Write the entire rewritten CV in Swedish.'
      : 'Write the entire rewritten CV in English.';

  return {
    system: `You are an expert CV writer and ATS (Applicant Tracking System) specialist.
Your task is to rewrite the candidate's CV to maximise relevance for a specific job description.

Rules:
- Surface and naturally integrate keywords from the job description into the CV.
- Quantify achievements wherever possible (e.g. "reduced latency by 40%").
- Never invent experience, roles, or skills the candidate does not have.
- Preserve all real experience; reorder and reframe to highlight what matches the role.
- Use a ${toneGuide[tone]} tone throughout.
- ${langInstruction}
- Return ONLY the rewritten CV text with no commentary, preamble, or markdown fences.`,

    user: `JOB DESCRIPTION:
${jobDescription}

ORIGINAL CV:
${cvText}`,
  };
}
