import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type { ExtractedSkillCandidate, StructuredResumeAnalysis } from './localResumeExtractor.ts';

function sanitizeStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
    .slice(0, 20);
}

function mapBucketToCategory(bucket: ExtractedSkillCandidate['bucket']): ExtractedSkillCandidate['category'] {
  switch (bucket) {
    case 'programmingLanguages':
    case 'frameworks':
      return 'Programming & Frameworks';
    case 'databases':
      return 'Data, Databases & Storage';
    case 'developmentTools':
      return 'DevOps & Cloud Tools';
    default:
      return 'Other Relevant Skills';
  }
}

function inferCategoryForSkill(name: string, fallback: ExtractedSkillCandidate['category']): ExtractedSkillCandidate['category'] {
  const lower = name.toLowerCase();
  if (/(playwright|selenium|pytest|cypress|jest|postman|qa|testing|junit)/i.test(lower)) {
    return 'Testing & Automation';
  }
  if (/(sql|postgres|mysql|mongo|redis|pandas|numpy|tableau|power\s*bi|data|ml|scikit)/i.test(lower)) {
    return 'Data, Databases & Storage';
  }
  if (/(docker|kubernetes|git|ci\/cd|github actions|aws|azure|gcp|linux|terraform|jenkins)/i.test(lower)) {
    return 'DevOps & Cloud Tools';
  }
  if (/(python|java|javascript|typescript|c\+\+|react|node|fastapi|django|flask|spring|next)/i.test(lower)) {
    return 'Programming & Frameworks';
  }
  return fallback;
}

export async function analyzeResumeWithGemini(rawText: string): Promise<StructuredResumeAnalysis> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY_NOT_CONFIGURED');
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const clippedText = rawText.slice(0, 24000);

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: `Extract structured career and skill information ONLY from the following resume text.
Do NOT invent or assume qualifications, skills, projects, certifications, or experience that are not explicitly present in the resume text.
For each detected skill, also include a short verbatim excerpt from the resume in skillDetails.

RESUME TEXT:
"""
${clippedText}
"""`,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      systemInstruction:
        'You are a strict academic resume parser. Extract only facts explicitly stated in the resume text. Return valid JSON matching the schema.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          technicalSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
          programmingLanguages: { type: Type.ARRAY, items: { type: Type.STRING } },
          frameworks: { type: Type.ARRAY, items: { type: Type.STRING } },
          databases: { type: Type.ARRAY, items: { type: Type.STRING } },
          developmentTools: { type: Type.ARRAY, items: { type: Type.STRING } },
          softSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
          education: { type: Type.ARRAY, items: { type: Type.STRING } },
          projects: { type: Type.ARRAY, items: { type: Type.STRING } },
          certifications: { type: Type.ARRAY, items: { type: Type.STRING } },
          experience: { type: Type.ARRAY, items: { type: Type.STRING } },
          summary: { type: Type.STRING },
          skillDetails: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                bucket: { type: Type.STRING },
                confidence: { type: Type.NUMBER },
                evidenceExcerpt: { type: Type.STRING },
              },
            },
          },
        },
      },
    },
  });

  const jsonText = (response.text ?? '').trim();
  if (!jsonText) {
    throw new Error('EMPTY_GEMINI_RESPONSE');
  }

  const parsed = JSON.parse(jsonText) as Record<string, unknown>;

  const programmingLanguages = sanitizeStringArray(parsed.programmingLanguages);
  const frameworks = sanitizeStringArray(parsed.frameworks);
  const databases = sanitizeStringArray(parsed.databases);
  const developmentTools = sanitizeStringArray(parsed.developmentTools);
  const technicalSkills = sanitizeStringArray(parsed.technicalSkills);
  const softSkills = sanitizeStringArray(parsed.softSkills);
  const education = sanitizeStringArray(parsed.education);
  const projects = sanitizeStringArray(parsed.projects);
  const certifications = sanitizeStringArray(parsed.certifications);
  const experience = sanitizeStringArray(parsed.experience);
  const summary =
    typeof parsed.summary === 'string' && parsed.summary.trim()
      ? parsed.summary.trim()
      : 'Structured resume information extracted via Gemini AI.';

  const validBuckets = new Set<ExtractedSkillCandidate['bucket']>([
    'programmingLanguages',
    'frameworks',
    'databases',
    'developmentTools',
    'technicalSkills',
    'softSkills',
  ]);

  const rawDetails = Array.isArray(parsed.skillDetails) ? parsed.skillDetails : [];
  const candidatesMap = new Map<string, ExtractedSkillCandidate>();

  for (const item of rawDetails) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;
    const name = typeof obj.name === 'string' ? obj.name.trim() : '';
    if (!name) continue;
    const rawBucket = typeof obj.bucket === 'string' ? obj.bucket : 'technicalSkills';
    const bucket = validBuckets.has(rawBucket as ExtractedSkillCandidate['bucket'])
      ? (rawBucket as ExtractedSkillCandidate['bucket'])
      : 'technicalSkills';
    const confidenceRaw = typeof obj.confidence === 'number' ? obj.confidence : 75;
    const confidence = Math.max(40, Math.min(95, Math.round(confidenceRaw)));
    const evidenceExcerpt =
      typeof obj.evidenceExcerpt === 'string' && obj.evidenceExcerpt.trim()
        ? obj.evidenceExcerpt.trim()
        : 'Extracted directly from uploaded resume content.';

    candidatesMap.set(name.toLowerCase(), {
      name,
      bucket,
      category: inferCategoryForSkill(name, mapBucketToCategory(bucket)),
      confidence,
      evidenceExcerpt,
    });
  }

  const addBucketIfMissing = (items: string[], bucket: ExtractedSkillCandidate['bucket']) => {
    for (const name of items) {
      if (!candidatesMap.has(name.toLowerCase())) {
        candidatesMap.set(name.toLowerCase(), {
          name,
          bucket,
          category: inferCategoryForSkill(name, mapBucketToCategory(bucket)),
          confidence: 74,
          evidenceExcerpt: 'Identified directly in uploaded resume.',
        });
      }
    }
  };

  addBucketIfMissing(programmingLanguages, 'programmingLanguages');
  addBucketIfMissing(frameworks, 'frameworks');
  addBucketIfMissing(databases, 'databases');
  addBucketIfMissing(developmentTools, 'developmentTools');
  addBucketIfMissing(technicalSkills, 'technicalSkills');
  addBucketIfMissing(softSkills, 'softSkills');

  return {
    technicalSkills,
    programmingLanguages,
    frameworks,
    databases,
    developmentTools,
    softSkills,
    education,
    projects,
    certifications,
    experience,
    summary,
    skillCandidates: Array.from(candidatesMap.values()),
  };
}
