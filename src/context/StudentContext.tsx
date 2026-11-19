import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { CAREER_CATALOG, getCareerById } from '../data/careers';
import { analyzeSkillGaps } from '../services/skillGapEngine';
import { buildPersonalizedRoadmap } from '../services/roadmapEngine';
import { clearStudentState, loadStudentState, saveStudentState } from '../services/storageService';
import type {
  AdvisorMessage,
  CareerRole,
  ExtractedResumeReviewData,
  LearningProgressStatus,
  PersistedStudentState,
  RoadmapPlan,
  SkillCategory,
  SkillGapAnalysisResult,
  SkillStatus,
  StudentSkill,
} from '../types/skillbridge';

interface CareerMatchPreview {
  career: CareerRole;
  analysis: SkillGapAnalysisResult;
}

interface StudentContextValue {
  state: PersistedStudentState;
  activeCareer: CareerRole;
  activeGapAnalysis: SkillGapAnalysisResult;
  activeRoadmap: RoadmapPlan;
  allCareerMatches: CareerMatchPreview[];
  recoveredFromCorruption: boolean;
  // Skills CRUD
  addSkill: (input: {
    name: string;
    category: SkillCategory;
    status?: SkillStatus;
    confidence?: number;
    evidence?: string;
    source?: StudentSkill['source'];
  }) => StudentSkill;
  updateSkill: (
    skillId: string,
    patch: Partial<Pick<StudentSkill, 'name' | 'category' | 'status' | 'confidence' | 'resumeExcerpt' | 'courseworkEvidence' | 'locked' | 'flaggedIncorrect'>>
  ) => void;
  deleteSkill: (skillId: string) => void;
  lockSkill: (skillId: string) => void;
  reportIncorrectSkill: (skillId: string) => void;
  // Resume Ingestion
  applyExtractedResume: (
    review: ExtractedResumeReviewData,
    selectedCandidates: ExtractedResumeReviewData['analysis']['skillCandidates'],
    mergeMode: 'merge' | 'replace'
  ) => void;
  // Careers & Comparisons
  setTargetCareer: (careerId: string) => void;
  toggleSavedCareer: (careerId: string) => void;
  toggleCompareCareer: (careerId: string) => void;
  setComparedCareers: (careerIds: string[]) => void;
  // Roadmap & Gap Sync
  pinSkillToRoadmap: (skillRequirementId: string) => void;
  setTaskStatus: (taskId: string, status: LearningProgressStatus) => void;
  submitTaskEvidence: (
    taskId: string,
    payload: { evidenceUrl: string; commitHash?: string; notes?: string }
  ) => void;
  sendAdvisorMessage: (text: string) => void;
  // Demo Reset
  resetDemoData: () => void;
}

const StudentContext = createContext<StudentContextValue | null>(null);

export const StudentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [initial] = useState(() => loadStudentState());
  const [state, setState] = useState<PersistedStudentState>(initial.state);
  const [recoveredFromCorruption] = useState(initial.recoveredFromCorruption);

  useEffect(() => {
    saveStudentState(state);
  }, [state]);

  const activeCareer = useMemo(() => getCareerById(state.targetCareerId), [state.targetCareerId]);

  const activeGapAnalysis = useMemo(
    () => analyzeSkillGaps(activeCareer, state.skills),
    [activeCareer, state.skills]
  );

  const activeRoadmap = useMemo(
    () => buildPersonalizedRoadmap(activeGapAnalysis, state.roadmapTaskProgress, state.pinnedSkillIdsInRoadmap),
    [activeGapAnalysis, state.roadmapTaskProgress, state.pinnedSkillIdsInRoadmap]
  );

  const allCareerMatches = useMemo(() => {
    return CAREER_CATALOG.map((career) => ({
      career,
      analysis: analyzeSkillGaps(career, state.skills),
    })).sort((a, b) => b.analysis.careerReadiness - a.analysis.careerReadiness);
  }, [state.skills]);

  const addSkill = useCallback(
    (input: {
      name: string;
      category: SkillCategory;
      status?: SkillStatus;
      confidence?: number;
      evidence?: string;
      source?: StudentSkill['source'];
    }): StudentSkill => {
      const trimmedName = input.name.trim();
      const newSkill: StudentSkill = {
        id: `skill-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: trimmedName,
        category: input.category,
        status: input.status ?? 'Unverified',
        confidence: input.confidence ?? (input.status === 'Demonstrated' ? 80 : input.status === 'Developing' ? 58 : 40),
        source: input.source ?? 'Manual Entry',
        resumeExcerpt: input.evidence?.trim()
          ? input.evidence.trim()
          : 'Student-provided skill entry awaiting coursework or repository verification.',
        courseworkEvidence: input.evidence?.trim()
          ? `Student note: ${input.evidence.trim()}`
          : 'Student-provided — not yet verified via Apex transcript or GitHub.',
        identifiedReason: 'Added manually by student in My Skills workspace.',
        locked: false,
        updatedAt: new Date().toISOString(),
      };

      setState((prev) => ({
        ...prev,
        skills: [newSkill, ...prev.skills],
      }));

      return newSkill;
    },
    []
  );

  const updateSkill = useCallback(
    (
      skillId: string,
      patch: Partial<
        Pick<
          StudentSkill,
          'name' | 'category' | 'status' | 'confidence' | 'resumeExcerpt' | 'courseworkEvidence' | 'locked' | 'flaggedIncorrect'
        >
      >
    ) => {
      setState((prev) => ({
        ...prev,
        skills: prev.skills.map((skill) =>
          skill.id === skillId
            ? {
                ...skill,
                ...patch,
                name: patch.name !== undefined ? patch.name.trim() || skill.name : skill.name,
                updatedAt: new Date().toISOString(),
              }
            : skill
        ),
      }));
    },
    []
  );

  const deleteSkill = useCallback((skillId: string) => {
    setState((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s.id !== skillId),
    }));
  }, []);

  const lockSkill = useCallback((skillId: string) => {
    setState((prev) => ({
      ...prev,
      skills: prev.skills.map((skill) =>
        skill.id === skillId
          ? {
              ...skill,
              locked: true,
              flaggedIncorrect: false,
              status: skill.status === 'Unverified' ? 'Developing' : skill.status,
              confidence: Math.max(skill.confidence, 75),
              updatedAt: new Date().toISOString(),
            }
          : skill
      ),
    }));
  }, []);

  const reportIncorrectSkill = useCallback((skillId: string) => {
    setState((prev) => ({
      ...prev,
      skills: prev.skills.map((skill) =>
        skill.id === skillId
          ? {
              ...skill,
              flaggedIncorrect: !skill.flaggedIncorrect,
              updatedAt: new Date().toISOString(),
            }
          : skill
      ),
    }));
  }, []);

  const applyExtractedResume = useCallback(
    (
      review: ExtractedResumeReviewData,
      selectedCandidates: ExtractedResumeReviewData['analysis']['skillCandidates'],
      mergeMode: 'merge' | 'replace'
    ) => {
      const sizeLabel =
        review.fileSizeBytes >= 1024 * 1024
          ? `${(review.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.max(1, Math.round(review.fileSizeBytes / 1024))} KB`;

      const sourceLabel: StudentSkill['source'] =
        review.mode === 'gemini' ? 'Resume (Gemini AI)' : 'Resume (Local Demo)';

      const now = new Date().toISOString();

      const mappedSkills: StudentSkill[] = selectedCandidates.map((cand, idx) => ({
        id: `resume-skill-${Date.now()}-${idx}`,
        name: cand.name,
        category: cand.category,
        status: cand.confidence >= 80 ? 'Demonstrated' : cand.confidence >= 60 ? 'Developing' : 'Unverified',
        confidence: cand.confidence,
        source: sourceLabel,
        resumeExcerpt: cand.evidenceExcerpt,
        courseworkEvidence:
          review.analysis.projects[0] ||
          review.analysis.education[0] ||
          'Extracted from uploaded resume document.',
        identifiedReason:
          review.mode === 'gemini'
            ? 'Structured extraction via server-side Gemini AI from uploaded resume text.'
            : 'Deterministic keyword & section extraction from uploaded resume text (Demo Mode).',
        locked: false,
        updatedAt: now,
      }));

      setState((prev) => {
        let nextSkills: StudentSkill[];
        if (mergeMode === 'replace') {
          nextSkills = mappedSkills;
        } else {
          const existingMap = new Map(prev.skills.map((s) => [s.name.toLowerCase(), s]));
          for (const candidate of mappedSkills) {
            const existing = existingMap.get(candidate.name.toLowerCase());
            if (existing) {
              existingMap.set(candidate.name.toLowerCase(), {
                ...existing,
                resumeExcerpt: candidate.resumeExcerpt,
                confidence: Math.max(existing.confidence, candidate.confidence),
                source: candidate.source,
                updatedAt: now,
              });
            } else {
              existingMap.set(candidate.name.toLowerCase(), candidate);
            }
          }
          nextSkills = Array.from(existingMap.values());
        }

        return {
          ...prev,
          profile: {
            ...prev.profile,
            isDemoProfile: false,
          },
          resumeMetadata: {
            fileName: review.fileName,
            fileSizeLabel: sizeLabel,
            uploadedAt: `Synced just now (${review.mode === 'gemini' ? 'Gemini AI' : 'Local Demo'})`,
            extractionMode: review.mode,
            notice: review.notice,
            hasCustomUpload: true,
            summary: review.analysis.summary,
            education: review.analysis.education,
            projects: review.analysis.projects,
            certifications: review.analysis.certifications,
            experience: review.analysis.experience,
          },
          skills: nextSkills,
        };
      });
    },
    []
  );

  const setTargetCareer = useCallback((careerId: string) => {
    setState((prev) => ({
      ...prev,
      targetCareerId: careerId,
      savedCareerIds: prev.savedCareerIds.includes(careerId)
        ? prev.savedCareerIds
        : [careerId, ...prev.savedCareerIds],
    }));
  }, []);

  const toggleSavedCareer = useCallback((careerId: string) => {
    setState((prev) => {
      const exists = prev.savedCareerIds.includes(careerId);
      return {
        ...prev,
        savedCareerIds: exists
          ? prev.savedCareerIds.filter((id) => id !== careerId)
          : [...prev.savedCareerIds, careerId],
      };
    });
  }, []);

  const toggleCompareCareer = useCallback((careerId: string) => {
    setState((prev) => {
      const exists = prev.comparedCareerIds.includes(careerId);
      if (exists) {
        return {
          ...prev,
          comparedCareerIds: prev.comparedCareerIds.filter((id) => id !== careerId),
        };
      }
      const next = [...prev.comparedCareerIds, careerId].slice(-2);
      return {
        ...prev,
        comparedCareerIds: next,
      };
    });
  }, []);

  const setComparedCareers = useCallback((careerIds: string[]) => {
    setState((prev) => ({
      ...prev,
      comparedCareerIds: careerIds.slice(0, 2),
    }));
  }, []);

  const pinSkillToRoadmap = useCallback((skillRequirementId: string) => {
    setState((prev) => ({
      ...prev,
      pinnedSkillIdsInRoadmap: prev.pinnedSkillIdsInRoadmap.includes(skillRequirementId)
        ? prev.pinnedSkillIdsInRoadmap
        : [skillRequirementId, ...prev.pinnedSkillIdsInRoadmap],
    }));
  }, []);

  const setTaskStatus = useCallback((taskId: string, status: LearningProgressStatus) => {
    const now = new Date().toISOString();
    setState((prev) => {
      const existing = prev.roadmapTaskProgress[taskId];
      return {
        ...prev,
        roadmapTaskProgress: {
          ...prev.roadmapTaskProgress,
          [taskId]: {
            ...existing,
            status,
            completedAt: status === 'completed' ? now : undefined,
            updatedAt: now,
          },
        },
      };
    });
  }, []);

  const submitTaskEvidence = useCallback(
    (taskId: string, payload: { evidenceUrl: string; commitHash?: string; notes?: string }) => {
      const now = new Date().toISOString();
      setState((prev) => {
        const existing = prev.roadmapTaskProgress[taskId];
        return {
          ...prev,
          roadmapTaskProgress: {
            ...prev.roadmapTaskProgress,
            [taskId]: {
              ...existing,
              status: existing?.status ?? 'in_progress',
              evidenceUrl: payload.evidenceUrl.trim(),
              commitHash: payload.commitHash?.trim() || undefined,
              notes: payload.notes?.trim() || undefined,
              updatedAt: now,
            },
          },
        };
      });
    },
    []
  );

  const sendAdvisorMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const msg: AdvisorMessage = {
      id: `msg-${Date.now()}`,
      text: trimmed,
      sentAt: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      advisorMessages: [...prev.advisorMessages, msg],
    }));
  }, []);

  const resetDemoData = useCallback(() => {
    const fresh = clearStudentState();
    setState(fresh);
  }, []);

  const value: StudentContextValue = {
    state,
    activeCareer,
    activeGapAnalysis,
    activeRoadmap,
    allCareerMatches,
    recoveredFromCorruption,
    addSkill,
    updateSkill,
    deleteSkill,
    lockSkill,
    reportIncorrectSkill,
    applyExtractedResume,
    setTargetCareer,
    toggleSavedCareer,
    toggleCompareCareer,
    setComparedCareers,
    pinSkillToRoadmap,
    setTaskStatus,
    submitTaskEvidence,
    sendAdvisorMessage,
    resetDemoData,
  };

  return <StudentContext.Provider value={value}>{children}</StudentContext.Provider>;
};

export function useStudent(): StudentContextValue {
  const ctx = useContext(StudentContext);
  if (!ctx) {
    throw new Error('useStudent must be used inside StudentProvider');
  }
  return ctx;
}
