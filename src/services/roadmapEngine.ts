import type {
  RoadmapPlan,
  RoadmapTask,
  SkillGapAnalysisResult,
  TaskProgressEntry,
} from '../types/skillbridge';

export function buildPersonalizedRoadmap(
  gapAnalysis: SkillGapAnalysisResult,
  progressMap: Record<string, TaskProgressEntry>,
  pinnedSkillIds: string[]
): RoadmapPlan {
  const { career, strengths, gaps } = gapAnalysis;
  const tasks: RoadmapTask[] = [];

  // Stage 1: Foundations (based on strongest matched skills or first required skill)
  const foundationSource = strengths.length > 0 ? strengths[0] : gapAnalysis.items[0];
  if (foundationSource) {
    const taskId = `${career.id}-1.1`;
    const saved = progressMap[taskId];
    const defaultStatus =
      foundationSource.classification === 'Demonstrated' && !saved ? 'completed' : saved?.status ?? 'not_started';

    tasks.push({
      id: taskId,
      code: '1.1',
      stage: 1,
      title: `${foundationSource.requirement.name} — Core Verification`,
      description: foundationSource.requirement.roleExpectation,
      targetSkillName: foundationSource.requirement.name,
      targetSkillId: foundationSource.requirement.id,
      priority: 'foundation',
      deltaLabel:
        foundationSource.delta >= 0
          ? `+${foundationSource.delta}% Surplus`
          : `${foundationSource.delta}% Delta`,
      estimatedHours: Math.max(2, Math.round(foundationSource.requirement.estimatedHours * 0.6)),
      completionCriteria: 'Verify modular code patterns and foundational coursework/project artifacts.',
      deliverableSummary: foundationSource.matchedSkill
        ? `Corroborated via ${foundationSource.matchedSkill.courseworkEvidence || foundationSource.matchedSkill.source}`
        : foundationSource.requirement.recommendedAction,
      resources: foundationSource.requirement.resources,
      status: defaultStatus,
      evidenceUrl: saved?.evidenceUrl,
      commitHash: saved?.commitHash,
      notes: saved?.notes,
    });
  }

  // Stage 2: Priority Gaps (ordered by priority & pinned status)
  const sortedGaps = [...gaps].sort((a, b) => {
    const aPinned = pinnedSkillIds.includes(a.requirement.id) ? 1 : 0;
    const bPinned = pinnedSkillIds.includes(b.requirement.id) ? 1 : 0;
    if (aPinned !== bPinned) return bPinned - aPinned;
    return a.delta - b.delta;
  });

  const pinnedGapsCount = sortedGaps.filter((g) => pinnedSkillIds.includes(g.requirement.id)).length;
  const stage2Gaps = sortedGaps.slice(0, Math.min(6, Math.max(3, pinnedGapsCount)));
  if (stage2Gaps.length === 0 && gapAnalysis.items.length > 1) {
    // All required skills are already demonstrated — offer enrichment practice milestone
    const secondItem = gapAnalysis.items[1];
    const taskId = `${career.id}-2.1`;
    const saved = progressMap[taskId];
    tasks.push({
      id: taskId,
      code: '2.1',
      stage: 2,
      title: `Advanced ${secondItem.requirement.name} Practice`,
      description: secondItem.requirement.recommendedAction,
      targetSkillName: secondItem.requirement.name,
      targetSkillId: secondItem.requirement.id,
      priority: 'medium',
      deltaLabel: 'Enrichment Sprint',
      estimatedHours: secondItem.requirement.estimatedHours,
      completionCriteria: 'Complete advanced edge-case scenarios and document architectural tradeoffs.',
      deliverableSummary: secondItem.requirement.recommendedAction,
      hasSandbox: true,
      sandboxSnippet: [
        `# ${career.title} — Verification Sprint`,
        `def verify_${secondItem.requirement.id.replace(/[^a-z0-9]/g, '_')}():`,
        `    assert True  # Edge-case assertions verified`,
      ],
      resources: secondItem.requirement.resources,
      status: saved?.status ?? 'not_started',
      evidenceUrl: saved?.evidenceUrl,
      commitHash: saved?.commitHash,
      notes: saved?.notes,
    });
  } else {
    stage2Gaps.forEach((gapItem, idx) => {
      const taskCode = `2.${idx + 1}`;
      const taskId = `${career.id}-${taskCode}`;
      const saved = progressMap[taskId];
      const isFirstActive = idx === 0 && !saved;

      const deltaText =
        gapItem.classification === 'Missing'
          ? 'Missing Evidence'
          : `${gapItem.badgeLabel} ${gapItem.delta}% Delta`;

      tasks.push({
        id: taskId,
        code: taskCode,
        stage: 2,
        title: gapItem.requirement.name,
        description: `${gapItem.requirement.recommendedAction} (${gapItem.requirement.roleExpectation})`,
        targetSkillName: gapItem.requirement.name,
        targetSkillId: gapItem.requirement.id,
        priority: gapItem.requirement.priority,
        deltaLabel: deltaText,
        estimatedHours: gapItem.requirement.estimatedHours,
        completionCriteria: `Complete hands-on exercise and attach repository or demo evidence for ${gapItem.requirement.name}.`,
        deliverableSummary: gapItem.requirement.recommendedAction,
        hasSandbox: idx === 0,
        sandboxSnippet:
          idx === 0
            ? [
                `# ${career.title} — ${gapItem.requirement.name} Lab`,
                `# Objective: ${gapItem.requirement.recommendedAction}`,
                `def run_verification_suite():`,
                `    status = "ready"`,
                `    assert status == "ready"`,
              ]
            : undefined,
        resources: gapItem.requirement.resources,
        status: saved?.status ?? (isFirstActive ? 'in_progress' : 'not_started'),
        evidenceUrl: saved?.evidenceUrl,
        commitHash: saved?.commitHash,
        notes: saved?.notes,
      });
    });
  }

  // Stage 3: Build & Demonstrate Capstone
  const capstoneId = `${career.id}-3.1`;
  const capstoneSaved = progressMap[capstoneId];
  const primaryGapNames = stage2Gaps.map((g) => g.requirement.name).slice(0, 3);
  const stackSummary =
    primaryGapNames.length > 0 ? primaryGapNames.join(' + ') : career.requiredSkills.map((s) => s.name).slice(0, 3).join(' + ');

  tasks.push({
    id: capstoneId,
    code: '3.1',
    stage: 3,
    title: `End-to-End ${career.shortTitle} Portfolio Capstone`,
    description: `Build and publish a portfolio-grade deliverable combining ${stackSummary} with automated verification, README documentation, and reproducible setup.`,
    targetSkillName: `${career.shortTitle} Capstone`,
    targetSkillId: 'capstone',
    priority: 'capstone',
    deltaLabel: 'Tier-1 Recruiter Asset',
    estimatedHours: 8,
    completionCriteria: 'Public GitHub repository with documentation, test/CI verification, and submitted evidence link.',
    deliverableSummary: `Public GitHub repository demonstrating applied ${career.title} competencies.`,
    resources: career.requiredSkills.flatMap((r) => r.resources).slice(0, 3),
    status: capstoneSaved?.status ?? 'not_started',
    evidenceUrl: capstoneSaved?.evidenceUrl,
    commitHash: capstoneSaved?.commitHash,
    notes: capstoneSaved?.notes,
  });

  const stage1Tasks = tasks.filter((t) => t.stage === 1);
  const stage2Tasks = tasks.filter((t) => t.stage === 2);
  const stage3Tasks = tasks.filter((t) => t.stage === 3);

  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const totalCount = Math.max(1, tasks.length);
  const completionPercent = Math.round((completedCount / totalCount) * 100);
  const estimatedHoursRemaining = tasks
    .filter((t) => t.status !== 'completed')
    .reduce((sum, t) => sum + t.estimatedHours, 0);

  // Recruiter visibility index grows realistically from readiness + completed milestones + attached evidence
  const evidenceBonus = tasks.filter((t) => Boolean(t.evidenceUrl)).length * 4;
  const recruiterVisibilityIndex = Math.min(
    100,
    Math.round(gapAnalysis.careerReadiness * 0.6 + completionPercent * 0.3 + evidenceBonus + 12)
  );

  return {
    career,
    stages: [
      {
        stageNumber: 1,
        title: 'Learn the Foundations',
        subtitle: '(Confirm baseline strengths & core syntax)',
        tasks: stage1Tasks,
      },
      {
        stageNumber: 2,
        title: 'Practise Priority Skills',
        subtitle: `(Close ${stage2Gaps.length} priority gap${stage2Gaps.length === 1 ? '' : 's'} from Skill Gap Analysis)`,
        tasks: stage2Tasks,
      },
      {
        stageNumber: 3,
        title: 'Build and Demonstrate',
        subtitle: '(Capstone portfolio asset for campus placements)',
        tasks: stage3Tasks,
      },
    ],
    allTasks: tasks,
    completedCount,
    totalCount: tasks.length,
    completionPercent,
    estimatedHoursRemaining,
    recruiterVisibilityIndex,
  };
}
