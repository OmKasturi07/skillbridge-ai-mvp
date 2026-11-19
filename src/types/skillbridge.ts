export type SkillCategory =
  | 'Programming & Frameworks'
  | 'Data, Databases & Storage'
  | 'Testing & Automation'
  | 'DevOps & Cloud Tools'
  | 'Other Relevant Skills';

export type SkillStatus = 'Demonstrated' | 'Developing' | 'Unverified';

export type SkillSource =
  | 'Demo Profile'
  | 'Resume (Gemini AI)'
  | 'Resume (Local Demo)'
  | 'Manual Entry'
  | 'Coursework & GitHub';

export interface StudentSkill {
  id: string;
  name: string;
  category: SkillCategory;
  status: SkillStatus;
  confidence: number; // 0 - 100
  source: SkillSource;
  resumeExcerpt: string;
  courseworkEvidence: string;
  identifiedReason: string;
  locked?: boolean;
  flaggedIncorrect?: boolean;
  updatedAt: string;
}

export interface StudentProfile {
  fullName: string;
  firstName: string;
  initials: string;
  degree: string;
  cohort: string;
  semester: string;
  institution: string;
  email: string;
  placementId: string;
  advisorName: string;
  advisorTitle: string;
  isDemoProfile: boolean;
}

export type ExtractionMode = 'demo-profile' | 'gemini' | 'demo-local';

export interface ExtractedResumeReviewData {
  fileName: string;
  fileSizeBytes: number;
  format: string;
  extractedCharacters: number;
  extractedTextPreview: string;
  mode: 'gemini' | 'demo-local';
  geminiFallbackReason?: 'not_configured' | 'timeout' | 'quota' | 'unavailable' | null;
  notice: string;
  analysis: {
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
    skillCandidates: Array<{
      name: string;
      category: SkillCategory;
      confidence: number;
      evidenceExcerpt: string;
      bucket: string;
    }>;
  };
}

export interface ResumeMetadata {
  fileName: string;
  fileSizeLabel: string;
  uploadedAt: string;
  extractionMode: ExtractionMode;
  notice: string;
  hasCustomUpload: boolean;
  summary: string;
  education: string[];
  projects: string[];
  certifications: string[];
  experience: string[];
}

export interface LearningResource {
  id: string;
  title: string;
  provider: string;
  url: string;
  type: 'Official Documentation' | 'Video Playlist' | 'Course' | 'Practice & Projects' | 'Interactive Lab';
  durationLabel: string;
  tags: Array<'free' | 'cert' | 'video' | 'practice' | 'doc'>;
  whyUseful: string;
  isSampleDemo?: boolean;
}

export interface CareerSkillRequirement {
  id: string;
  name: string;
  aliases: string[];
  category: SkillCategory;
  icon: string;
  requiredLevel: number; // 0 - 100
  priority: 'high' | 'medium';
  roleExpectation: string;
  whyItMatters: string;
  recommendedAction: string;
  estimatedHours: number;
  resources: LearningResource[];
}

export interface CareerRole {
  id: string;
  title: string;
  shortTitle: string;
  trackCode: string;
  pathwayName: string;
  icon: string;
  description: string;
  prepWindow: string;
  complexityTier: string;
  targetSubtitle: string;
  salaryRange: string;
  partnerFirmsCount: number;
  whyRecommendedTemplate: string;
  requiredSkills: CareerSkillRequirement[];
}

export type GapClassification =
  | 'Demonstrated'
  | 'Developing'
  | 'Missing'
  | 'Requires verification';

export interface SkillGapItem {
  requirement: CareerSkillRequirement;
  matchedSkill: StudentSkill | null;
  yourScore: number;
  requiredScore: number;
  delta: number; // yourScore - requiredScore
  classification: GapClassification;
  badgeLabel: 'Strong Alignment' | 'Priority Gap' | 'Developing' | 'Evidence Needed' | 'Verify Skill';
  evidenceSummary: string;
  takeaway: string;
}

export interface SkillGapAnalysisResult {
  career: CareerRole;
  skillCoverage: number; // Sufficiently matched required skills / Total required skills * 100
  careerReadiness: number; // Weighted proficiency-aware readiness score 0 - 100
  demonstratedCount: number;
  developingCount: number;
  missingCount: number;
  requiresVerificationCount: number;
  totalRequired: number;
  estimatedBridgeWeeks: string;
  items: SkillGapItem[];
  strengths: SkillGapItem[];
  gaps: SkillGapItem[];
  topPriorities: SkillGapItem[];
}

export type LearningProgressStatus = 'not_started' | 'in_progress' | 'completed';

export interface TaskProgressEntry {
  status: LearningProgressStatus;
  evidenceUrl?: string;
  commitHash?: string;
  notes?: string;
  completedAt?: string;
  updatedAt: string;
}

export interface RoadmapTask {
  id: string;
  code: string; // e.g., "1.1", "2.1"
  stage: 1 | 2 | 3;
  title: string;
  description: string;
  targetSkillName: string;
  targetSkillId: string;
  priority: 'foundation' | 'high' | 'medium' | 'capstone';
  deltaLabel: string;
  estimatedHours: number;
  completionCriteria: string;
  deliverableSummary: string;
  hasSandbox?: boolean;
  sandboxSnippet?: string[];
  resources: LearningResource[];
  status: LearningProgressStatus;
  evidenceUrl?: string;
  commitHash?: string;
  notes?: string;
}

export interface RoadmapPlan {
  career: CareerRole;
  stages: Array<{
    stageNumber: 1 | 2 | 3;
    title: string;
    subtitle: string;
    tasks: RoadmapTask[];
  }>;
  allTasks: RoadmapTask[];
  completedCount: number;
  totalCount: number;
  completionPercent: number;
  estimatedHoursRemaining: number;
  recruiterVisibilityIndex: number;
}

export interface AdvisorMessage {
  id: string;
  text: string;
  sentAt: string;
}

export interface PersistedStudentState {
  version: number;
  profile: StudentProfile;
  resumeMetadata: ResumeMetadata;
  skills: StudentSkill[];
  targetCareerId: string;
  savedCareerIds: string[];
  comparedCareerIds: string[];
  pinnedSkillIdsInRoadmap: string[];
  roadmapTaskProgress: Record<string, TaskProgressEntry>;
  advisorMessages: AdvisorMessage[];
}
