export interface MatchAnalysis {
  matchScore: number;
  keywordsAdded: string[];
  missingKeywords: string[];
}

export function buildMatchAnalysisPrompt(
  cvText: string,
  jobDescription: string,
): { system: string; user: string } {
  return {
    system: `You are an ATS (Applicant Tracking System) scoring engine.
Analyse how well a CV matches a job description and return a JSON object.

Return EXACTLY this JSON shape (no markdown, no extra keys):
{
  "matchScore": <integer 0-100>,
  "keywordsAdded": [<keywords present in both CV and job description>],
  "missingKeywords": [<important keywords in job description absent from CV>]
}

Scoring guidance:
- 90-100: near-perfect match, nearly all required skills and keywords present
- 70-89: strong match, most key requirements met
- 50-69: moderate match, several important gaps
- 0-49: weak match, significant skills or experience gaps`,

    user: `JOB DESCRIPTION:
${jobDescription}

CV:
${cvText}`,
  };
}
