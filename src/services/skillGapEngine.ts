import type {
  CareerRole,
  CareerSkillRequirement,
  GapClassification,
  SkillGapAnalysisResult,
  SkillGapItem,
  StudentSkill,
} from '../types/skillbridge';

function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9+]/g, ' ').replace(/\s+/g, ' ').trim();
}

function findBestMatchingSkill(req: CareerSkillRequirement, skills: StudentSkill[]): StudentSkill | null {
  const targets = [req.name, ...req.aliases].map(normalizeToken);

  let bestMatch: StudentSkill | null = null;
  let bestScore = -1;

  for (const skill of skills) {
    const skillToken = normalizeToken(skill.name);
    let matchScore = 0;

    for (const target of targets) {
      if (skillToken === target) {
        matchScore = Math.max(matchScore, 100);
      } else if (skillToken.includes(target) || target.includes(skillToken)) {
        matchScore = Math.max(matchScore, 80);
      } else {
        const skillWords = new Set(skillToken.split(' ').filter((w) => w.length > 1));
        const targetWords = target.split(' ').filter((w) => w.length > 1);
        const overlap = targetWords.filter((w) => skillWords.has(w)).length;
        if (overlap > 0 && overlap >= Math.ceil(targetWords.length * 0.5)) {
          matchScore = Math.max(matchScore, 50 + overlap * 10);
        }
      }
    }

    if (matchScore > 0) {
      const weighted = matchScore * 100 + skill.confidence;
      if (weighted > bestScore) {
        bestScore = weighted;
        bestMatch = skill;
      }
    }
  }

  return bestMatch;
}

function getEffectiveSkillScore(skill: StudentSkill | null): number {
  if (!skill) return 0;
  if (skill.flaggedIncorrect) return 0;

  if (skill.status === 'Demonstrated') {
    return Math.max(70, Math.min(100, skill.confidence));
  }
  if (skill.status === 'Developing') {
    return Math.max(25, Math.min(72, Math.round(skill.confidence * 0.78)));
  }
  // Unverified skills contribute conservatively until corroborated
  return Math.max(15, Math.min(45, Math.round(skill.confidence * 0.55)));
}

function classifyGap(
  skill: StudentSkill | null,
  yourScore: number,
  requiredScore: number
): { classification: GapClassification; badgeLabel: SkillGapItem['badgeLabel'] } {
  if (!skill || skill.flaggedIncorrect) {
    return { classification: 'Missing', badgeLabel: 'Evidence Needed' };
  }
  if (skill.status === 'Unverified') {
    return { classification: 'Requires verification', badgeLabel: 'Verify Skill' };
  }
  if (skill.status === 'Demonstrated' && yourScore >= requiredScore - 5) {
    return { classification: 'Demonstrated', badgeLabel: 'Strong Alignment' };
  }
  if (requiredScore - yourScore >= 40) {
    return { classification: 'Developing', badgeLabel: 'Priority Gap' };
  }
  return { classification: 'Developing', badgeLabel: 'Developing' };
}

export function analyzeSkillGaps(career: CareerRole, skills: StudentSkill[]): SkillGapAnalysisResult {
  const items: SkillGapItem[] = career.requiredSkills.map((req) => {
    const matchedSkill = findBestMatchingSkill(req, skills);
    const yourScore = getEffectiveSkillScore(matchedSkill);
    const requiredScore = req.requiredLevel;
    const delta = yourScore - requiredScore;
    const { classification, badgeLabel } = classifyGap(matchedSkill, yourScore, requiredScore);

    let evidenceSummary = 'No matching skill or coursework evidence currently indexed in your profile.';
    if (matchedSkill) {
      evidenceSummary = `${matchedSkill.status} (${matchedSkill.confidence}% conf.) · ${matchedSkill.courseworkEvidence || matchedSkill.resumeExcerpt}`;
    }

    let takeaway = '';
    if (classification === 'Demonstrated') {
      takeaway =
        delta >= 0
          ? `Exceeds target benchmark by +${delta}%. Strong foundational asset for ${career.title} interviews.`
          : `Meets core benchmark (${yourScore}% vs ${requiredScore}% target). Continue maintaining via project deliverables.`;
    } else if (classification === 'Requires verification') {
      takeaway = `Listed as Unverified (${matchedSkill?.confidence ?? 0}%). Add coursework/GitHub evidence or confirm in My Skills to count toward verified readiness.`;
    } else if (classification === 'Developing') {
      takeaway = `Closing this ${Math.abs(delta)}% delta will meaningfully increase your ${career.title} readiness score.`;
    } else {
      takeaway = `Missing from your skill profile. Prioritizing this ${req.estimatedHours}h milestone directly addresses a core role requirement.`;
    }

    return {
      requirement: req,
      matchedSkill,
      yourScore,
      requiredScore,
      delta,
      classification,
      badgeLabel,
      evidenceSummary,
      takeaway,
    };
  });

  const totalRequired = Math.max(1, items.length);
  const demonstratedCount = items.filter((i) => i.classification === 'Demonstrated').length;
  const developingCount = items.filter((i) => i.classification === 'Developing').length;
  const missingCount = items.filter((i) => i.classification === 'Missing').length;
  const requiresVerificationCount = items.filter((i) => i.classification === 'Requires verification').length;

  // Transparent Formula 1: Skill Coverage = Sufficiently matched required skills / Total required skills * 100
  const sufficientlyMatched = demonstratedCount;
  const skillCoverage = Math.round((sufficientlyMatched / totalRequired) * 100);

  // Transparent Formula 2: Proficiency-aware Career Readiness = average(min(yourScore, requiredScore) / requiredScore) * 100
  const ratioSum = items.reduce((acc, item) => {
    const ratio = Math.min(item.yourScore, item.requiredScore) / Math.max(1, item.requiredScore);
    return acc + ratio;
  }, 0);
  const careerReadiness = Math.round((ratioSum / totalRequired) * 100);

  const strengths = items.filter((i) => i.classification === 'Demonstrated');
  const gaps = items.filter((i) => i.classification !== 'Demonstrated');

  const topPriorities = [...gaps]
    .sort((a, b) => {
      const pWeightA = a.requirement.priority === 'high' ? 20 : 0;
      const pWeightB = b.requirement.priority === 'high' ? 20 : 0;
      return b.requiredScore - b.yourScore + pWeightB - (a.requiredScore - a.yourScore + pWeightA);
    })
    .slice(0, 3);

  const totalGapHours = gaps.reduce((sum, g) => sum + g.requirement.estimatedHours, 0);
  const minWeeks = Math.max(1, Math.ceil(totalGapHours / 6));
  const maxWeeks = Math.max(minWeeks + 1, Math.ceil(totalGapHours / 4));
  const estimatedBridgeWeeks = gaps.length === 0 ? 'Ready Now' : `~${minWeeks}–${maxWeeks} Weeks`;

  return {
    career,
    skillCoverage,
    careerReadiness,
    demonstratedCount,
    developingCount,
    missingCount,
    requiresVerificationCount,
    totalRequired: items.length,
    estimatedBridgeWeeks,
    items,
    strengths,
    gaps,
    topPriorities,
  };
}
