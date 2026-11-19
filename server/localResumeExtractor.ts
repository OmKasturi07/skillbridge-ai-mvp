export interface ExtractedSkillCandidate {
  name: string;
  category:
    | 'Programming & Frameworks'
    | 'Data, Databases & Storage'
    | 'Testing & Automation'
    | 'DevOps & Cloud Tools'
    | 'Other Relevant Skills';
  confidence: number;
  evidenceExcerpt: string;
  bucket:
    | 'programmingLanguages'
    | 'frameworks'
    | 'databases'
    | 'developmentTools'
    | 'technicalSkills'
    | 'softSkills';
}

export interface StructuredResumeAnalysis {
  technicalSkills: string[];
  programmingLanguages: string[];
  frameworks: string[];
  databases: string[];
  developmentTools: string[];
  softSkills: string[];
  education: string[];
  projects: string[];
  certifications: string[];
  experience: string[];
  summary: string;
  skillCandidates: ExtractedSkillCandidate[];
}

interface SkillDictionaryEntry {
  name: string;
  patterns: RegExp[];
  category: ExtractedSkillCandidate['category'];
  bucket: ExtractedSkillCandidate['bucket'];
}

const SKILL_DICTIONARY: SkillDictionaryEntry[] = [
  // Programming Languages
  { name: 'Python', patterns: [/\bpython\b/i], category: 'Programming & Frameworks', bucket: 'programmingLanguages' },
  { name: 'TypeScript', patterns: [/\btypescript\b/i], category: 'Programming & Frameworks', bucket: 'programmingLanguages' },
  { name: 'JavaScript', patterns: [/\bjavascript\b/i, /\becmascript\b/i], category: 'Programming & Frameworks', bucket: 'programmingLanguages' },
  { name: 'Java', patterns: [/\bjava\b(?!script)/i], category: 'Programming & Frameworks', bucket: 'programmingLanguages' },
  { name: 'C++', patterns: [/\bc\+\+\b/i, /\bcpp\b/i], category: 'Programming & Frameworks', bucket: 'programmingLanguages' },
  { name: 'C', patterns: [/(?:^|[\s,/(])c(?:$|[\s,/.)])/i], category: 'Programming & Frameworks', bucket: 'programmingLanguages' },
  { name: 'Go', patterns: [/\bgolang\b/i, /\bgo\s+(?:lang|services|apis)\b/i], category: 'Programming & Frameworks', bucket: 'programmingLanguages' },
  { name: 'Rust', patterns: [/\brust\b/i], category: 'Programming & Frameworks', bucket: 'programmingLanguages' },
  { name: 'Bash / Shell', patterns: [/\bbash\b/i, /\bshell\s+script/i], category: 'DevOps & Cloud Tools', bucket: 'programmingLanguages' },
  { name: 'HTML/CSS', patterns: [/\bhtml5?\b/i, /\bcss3?\b/i], category: 'Programming & Frameworks', bucket: 'programmingLanguages' },

  // Frameworks & Libraries
  { name: 'React', patterns: [/\breact(?:\.js|js)?\b/i], category: 'Programming & Frameworks', bucket: 'frameworks' },
  { name: 'Next.js', patterns: [/\bnext\.?js\b/i], category: 'Programming & Frameworks', bucket: 'frameworks' },
  { name: 'Node.js', patterns: [/\bnode\.?js\b/i], category: 'Programming & Frameworks', bucket: 'frameworks' },
  { name: 'Express.js', patterns: [/\bexpress(?:\.js|js)?\b/i], category: 'Programming & Frameworks', bucket: 'frameworks' },
  { name: 'FastAPI', patterns: [/\bfastapi\b/i], category: 'Programming & Frameworks', bucket: 'frameworks' },
  { name: 'Django', patterns: [/\bdjango\b/i], category: 'Programming & Frameworks', bucket: 'frameworks' },
  { name: 'Flask', patterns: [/\bflask\b/i], category: 'Programming & Frameworks', bucket: 'frameworks' },
  { name: 'Spring Boot', patterns: [/\bspring\s*boot\b/i], category: 'Programming & Frameworks', bucket: 'frameworks' },
  { name: 'Tailwind CSS', patterns: [/\btailwind(?:\s*css)?\b/i], category: 'Programming & Frameworks', bucket: 'frameworks' },
  { name: 'PyTorch', patterns: [/\bpytorch\b/i], category: 'Programming & Frameworks', bucket: 'frameworks' },
  { name: 'TensorFlow', patterns: [/\btensorflow\b/i], category: 'Programming & Frameworks', bucket: 'frameworks' },
  { name: 'Scikit-learn', patterns: [/\bscikit-?learn\b/i, /\bsklearn\b/i], category: 'Data, Databases & Storage', bucket: 'frameworks' },
  { name: 'Pandas', patterns: [/\bpandas\b/i], category: 'Data, Databases & Storage', bucket: 'frameworks' },
  { name: 'NumPy', patterns: [/\bnumpy\b/i], category: 'Data, Databases & Storage', bucket: 'frameworks' },

  // Databases & Data
  { name: 'SQL', patterns: [/\bsql\b/i], category: 'Data, Databases & Storage', bucket: 'databases' },
  { name: 'PostgreSQL', patterns: [/\bpostgres(?:ql)?\b/i], category: 'Data, Databases & Storage', bucket: 'databases' },
  { name: 'MySQL', patterns: [/\bmysql\b/i], category: 'Data, Databases & Storage', bucket: 'databases' },
  { name: 'MongoDB', patterns: [/\bmongodb\b/i, /\bmongo\b/i], category: 'Data, Databases & Storage', bucket: 'databases' },
  { name: 'Redis', patterns: [/\bredis\b/i], category: 'Data, Databases & Storage', bucket: 'databases' },
  { name: 'SQLite', patterns: [/\bsqlite\b/i], category: 'Data, Databases & Storage', bucket: 'databases' },
  { name: 'Power BI', patterns: [/\bpower\s*bi\b/i], category: 'Data, Databases & Storage', bucket: 'technicalSkills' },
  { name: 'Tableau', patterns: [/\btableau\b/i], category: 'Data, Databases & Storage', bucket: 'technicalSkills' },
  { name: 'Data Visualization', patterns: [/\bmatplotlib\b/i, /\bseaborn\b/i, /\bdata\s+visualization\b/i], category: 'Data, Databases & Storage', bucket: 'technicalSkills' },

  // Testing & Automation
  { name: 'Selenium', patterns: [/\bselenium\b/i], category: 'Testing & Automation', bucket: 'developmentTools' },
  { name: 'Playwright', patterns: [/\bplaywright\b/i], category: 'Testing & Automation', bucket: 'developmentTools' },
  { name: 'PyTest', patterns: [/\bpytest\b/i], category: 'Testing & Automation', bucket: 'developmentTools' },
  { name: 'Cypress', patterns: [/\bcypress\b/i], category: 'Testing & Automation', bucket: 'developmentTools' },
  { name: 'Jest', patterns: [/\bjest\b/i], category: 'Testing & Automation', bucket: 'developmentTools' },
  { name: 'Postman', patterns: [/\bpostman\b/i], category: 'Testing & Automation', bucket: 'developmentTools' },
  { name: 'API Testing', patterns: [/\bapi\s+testing\b/i, /\brest\s+assured\b/i, /\bswagger\b/i], category: 'Testing & Automation', bucket: 'technicalSkills' },

  // DevOps & Cloud Tools
  { name: 'Git & Version Control', patterns: [/\bgit\b/i, /\bgithub\b/i, /\bgitlab\b/i], category: 'DevOps & Cloud Tools', bucket: 'developmentTools' },
  { name: 'Docker', patterns: [/\bdocker\b/i, /\bcontainerization\b/i], category: 'DevOps & Cloud Tools', bucket: 'developmentTools' },
  { name: 'Kubernetes', patterns: [/\bkubernetes\b/i, /\bk8s\b/i], category: 'DevOps & Cloud Tools', bucket: 'developmentTools' },
  { name: 'CI/CD & GitHub Actions', patterns: [/\bci\/cd\b/i, /\bgithub\s+actions\b/i, /\bjenkins\b/i], category: 'DevOps & Cloud Tools', bucket: 'developmentTools' },
  { name: 'AWS', patterns: [/\baws\b/i, /\bamazon\s+web\s+services\b/i], category: 'DevOps & Cloud Tools', bucket: 'technicalSkills' },
  { name: 'Linux CLI', patterns: [/\blinux\b/i, /\bubuntu\b/i], category: 'DevOps & Cloud Tools', bucket: 'technicalSkills' },
  { name: 'Terraform', patterns: [/\bterraform\b/i], category: 'DevOps & Cloud Tools', bucket: 'developmentTools' },

  // Technical & Architecture
  { name: 'REST API Design', patterns: [/\brest(?:ful)?\s*api/i, /\bopenapi\b/i], category: 'Other Relevant Skills', bucket: 'technicalSkills' },
  { name: 'Machine Learning', patterns: [/\bmachine\s+learning\b/i, /\bdeep\s+learning\b/i], category: 'Data, Databases & Storage', bucket: 'technicalSkills' },
  { name: 'LLM & Prompt Engineering', patterns: [/\bllm\b/i, /\bgenerative\s+ai\b/i, /\brag\b/i, /\blangchain\b/i, /\bgemini\b/i, /\bopenai\b/i], category: 'Other Relevant Skills', bucket: 'technicalSkills' },
  { name: 'Data Structures & Algorithms', patterns: [/\bdata\s+structures\b/i, /\balgorithms\b/i], category: 'Programming & Frameworks', bucket: 'technicalSkills' },

  // Soft Skills
  { name: 'Agile / Scrum', patterns: [/\bagile\b/i, /\bscrum\b/i], category: 'Other Relevant Skills', bucket: 'softSkills' },
  { name: 'Technical Communication', patterns: [/\bcommunication\b/i, /\bdocumentation\b/i, /\bpresentation\b/i], category: 'Other Relevant Skills', bucket: 'softSkills' },
  { name: 'Team Collaboration', patterns: [/\bcollaboration\b/i, /\bteamwork\b/i, /\bmentorship\b/i, /\bleadership\b/i], category: 'Other Relevant Skills', bucket: 'softSkills' },
  { name: 'Problem Solving', patterns: [/\bproblem[\s-]solving\b/i, /\bdebugging\b/i, /\btroubleshooting\b/i], category: 'Other Relevant Skills', bucket: 'softSkills' },
];

function extractMatchingLine(lines: string[], pattern: RegExp): string {
  const match = lines.find((line) => pattern.test(line));
  if (!match) return 'Detected directly in uploaded resume text.';
  return match.length > 180 ? `${match.slice(0, 177)}...` : match;
}

function extractSectionLines(lines: string[], headingKeywords: RegExp, maxItems = 4): string[] {
  const collected: string[] = [];
  let inSection = false;
  const sectionBreak = /^(skills|technical skills|core skills|education|academic|projects|key projects|experience|work experience|internships|certifications|certificates|achievements|summary|objective|publications)\b(?:\s*:|\s*$)/i;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.length < 48 && headingKeywords.test(line)) {
      inSection = true;
      continue;
    }

    if (inSection && (sectionBreak.test(line) || (line.length < 40 && /^(skills|education|projects|experience|certifications|summary)\b/i.test(line)))) {
      inSection = false;
    }

    if (inSection) {
      const cleaned = line.replace(/^[-•*]\s*/, '').trim();
      if (cleaned.length > 6 && !collected.includes(cleaned)) {
        collected.push(cleaned);
        if (collected.length >= maxItems) break;
      }
    }
  }

  // Fallback: single-line keyword scan if no explicit section header matched
  if (collected.length === 0) {
    for (const rawLine of lines) {
      const line = rawLine.replace(/^[-•*]\s*/, '').trim();
      if (line.length > 10 && headingKeywords.test(line) && !collected.includes(line)) {
        collected.push(line);
        if (collected.length >= maxItems) break;
      }
    }
  }

  return collected;
}

export function extractResumeLocally(rawText: string): StructuredResumeAnalysis {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l.length > 0 && !/^--\s*\d+\s+of\s+\d+\s*--$/i.test(l));

  const programmingLanguages: string[] = [];
  const frameworks: string[] = [];
  const databases: string[] = [];
  const developmentTools: string[] = [];
  const technicalSkills: string[] = [];
  const softSkills: string[] = [];
  const skillCandidates: ExtractedSkillCandidate[] = [];

  for (const entry of SKILL_DICTIONARY) {
    const matchedPattern = entry.patterns.find((p) => p.test(rawText));
    if (!matchedPattern) continue;

    // Count occurrences across text for transparent deterministic confidence
    let mentions = 0;
    for (const line of lines) {
      if (entry.patterns.some((p) => p.test(line))) {
        mentions += 1;
      }
    }
    const confidence = Math.min(88, 58 + mentions * 8);
    const evidenceExcerpt = extractMatchingLine(lines, matchedPattern);

    skillCandidates.push({
      name: entry.name,
      category: entry.category,
      confidence,
      evidenceExcerpt,
      bucket: entry.bucket,
    });

    if (entry.bucket === 'programmingLanguages') programmingLanguages.push(entry.name);
    else if (entry.bucket === 'frameworks') frameworks.push(entry.name);
    else if (entry.bucket === 'databases') databases.push(entry.name);
    else if (entry.bucket === 'developmentTools') developmentTools.push(entry.name);
    else if (entry.bucket === 'softSkills') softSkills.push(entry.name);
    else technicalSkills.push(entry.name);
  }

  const education = extractSectionLines(lines, /\b(education|b\.?tech|bachelor|master|university|institute|college|gpa|cgpa)\b/i, 4);
  const projects = extractSectionLines(lines, /\b(projects?|capstone|built|developed)\b/i, 4);
  const certifications = extractSectionLines(lines, /\b(certifications?|certificates?|credential|aws certified|coursera|udemy)\b/i, 4);
  const experience = extractSectionLines(lines, /\b(experience|intern(?:ship)?|engineer|developer|analyst|work history)\b/i, 4);

  const totalFound = skillCandidates.length;
  const summary =
    totalFound > 0
      ? `Local demo extractor identified ${totalFound} skill signals directly from ${lines.length} lines of uploaded resume text.`
      : `Parsed ${lines.length} lines of uploaded text. No exact dictionary skill keywords matched; you can still add skills manually in My Skills.`;

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
    skillCandidates,
  };
}
