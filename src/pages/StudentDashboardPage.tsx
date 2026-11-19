import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStudent } from '../context/StudentContext';
import type { SkillStatus } from '../types/skillbridge';

export const StudentDashboardPage: React.FC = () => {
  const {
    state,
    activeCareer,
    activeGapAnalysis,
    activeRoadmap,
    setTaskStatus,
  } = useStudent();
  const navigate = useNavigate();

  const [expandedSkillId, setExpandedSkillId] = useState<string | null>(null);
  const [milestoneToast, setMilestoneToast] = useState(false);
  const navTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (navTimerRef.current) window.clearTimeout(navTimerRef.current);
    };
  }, []);

  const strongestSkills = useMemo(() => {
    const rank = (s: SkillStatus) =>
      s === 'Demonstrated' ? 3 : s === 'Developing' ? 2 : 1;
    return [...state.skills]
      .sort((a, b) => {
        const flaggedDiff = Number(Boolean(a.flaggedIncorrect)) - Number(Boolean(b.flaggedIncorrect));
        if (flaggedDiff !== 0) return flaggedDiff;
        return rank(b.status) - rank(a.status) || b.confidence - a.confidence;
      })
      .slice(0, 4);
  }, [state.skills]);

  const verifiedSkillCount = useMemo(
    () => state.skills.filter((s) => s.status === 'Demonstrated').length,
    [state.skills]
  );

  const inProgressTasksCount = useMemo(
    () => activeRoadmap.allTasks.filter((t) => t.status === 'in_progress').length,
    [activeRoadmap.allTasks]
  );

  const nextMoveTask = useMemo(() => {
    return (
      activeRoadmap.allTasks.find((t) => t.status === 'in_progress') ||
      activeRoadmap.allTasks.find((t) => t.status === 'not_started') ||
      activeRoadmap.allTasks[0]
    );
  }, [activeRoadmap.allTasks]);

  const ringCircumference = 2 * Math.PI * 68; // ~427.25
  const ringOffset =
    ringCircumference - (activeGapAnalysis.careerReadiness / 100) * ringCircumference;

  const cohortMedian = 54;
  const deltaFromMedian = activeGapAnalysis.careerReadiness - cohortMedian;

  const handleLetsDoIt = () => {
    if (nextMoveTask && nextMoveTask.status === 'not_started') {
      setTaskStatus(nextMoveTask.id, 'in_progress');
    }
    setMilestoneToast(true);
    if (navTimerRef.current) window.clearTimeout(navTimerRef.current);
    navTimerRef.current = window.setTimeout(() => {
      navigate('/my-roadmap');
    }, 550);
  };

  return (
    <div className="bg-[#FAF9F6] w-full pt-8 pb-14 flex-grow">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 flex flex-col gap-8">
        {/* Expressive Greeting Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EEEAFE] text-[#7865F5] text-[11px] font-bold tracking-wide uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7865F5] animate-pulse"></span>
                Portfolio Synchronized
              </span>
              <span className="text-xs text-[#696682] font-medium">
                • Fall Placement Sprint Active · {activeRoadmap.completionPercent}% Roadmap Done
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-[#17152E]">
              Hey, {state.profile.firstName}! <span>👋</span>
            </h1>
            <p className="mt-2 text-base md:text-lg text-[#696682] font-medium">
              Your future looks good on you.{' '}
              <span className="text-[#17152E] font-semibold">
                Let&apos;s build your next milestone.
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/skill-gap-analysis"
              className="px-4 py-2 rounded-xl bg-white border border-[#EBE7DF] hover:border-[#7865F5]/40 text-xs font-bold text-[#17152E] shadow-xs transition-all"
            >
              Inspect Gap Matrix
            </Link>
            <Link
              to="/my-roadmap"
              className="px-4 py-2 rounded-xl bg-[#7865F5] hover:bg-[#6450E8] text-xs font-bold text-white shadow-xs transition-all"
            >
              Continue Roadmap →
            </Link>
          </div>
        </div>

        {/* MAIN HERO READINESS CARD */}
        <section className="relative overflow-hidden rounded-3xl bg-white border border-[#EBE7DF] p-6 lg:p-9 shadow-[0_4px_24px_-4px_rgba(23,21,46,0.05)] card-hover-lift">
          <div className="absolute -right-20 -top-20 w-96 h-96 rounded-full bg-[#EEEAFE]/80 blur-3xl pointer-events-none"></div>
          <div className="absolute left-1/3 -bottom-24 w-80 h-80 rounded-full bg-[#D7F36A]/15 blur-3xl pointer-events-none"></div>

          <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Circular Progress Ring */}
            <div className="lg:col-span-5 flex flex-col sm:flex-row items-center gap-6">
              <div className="relative w-44 h-44 flex-shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                  <defs>
                    <linearGradient id="dashHeroGradient" x1="0%" x2="100%" y1="0%" y2="100%">
                      <stop offset="0%" stopColor="#7865F5" />
                      <stop offset="70%" stopColor="#9A8BF9" />
                      <stop offset="100%" stopColor="#D7F36A" />
                    </linearGradient>
                  </defs>
                  <circle
                    className="text-[#EEEAFE] stroke-current"
                    cx="80"
                    cy="80"
                    fill="transparent"
                    r="68"
                    strokeWidth="12"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    fill="transparent"
                    r="68"
                    stroke="url(#dashHeroGradient)"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringOffset}
                    strokeLinecap="round"
                    strokeWidth="12"
                    className="transition-all duration-700 ease-out"
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#696682] font-mono">
                    CAREER READINESS
                  </span>
                  <div className="flex items-baseline">
                    <span className="text-4xl font-black text-[#17152E] tracking-tight">
                      {activeGapAnalysis.careerReadiness}
                    </span>
                    <span className="font-mono text-sm text-[#696682] font-bold">/100</span>
                  </div>
                  <span className="mt-1 inline-flex items-center gap-1 font-mono text-[11px] font-bold text-[#364100] bg-[#D7F36A] px-2 py-0.5 rounded-full">
                    <span className="material-symbols-outlined text-[12px]">trending_up</span>
                    {activeGapAnalysis.skillCoverage}% Cov.
                  </span>
                </div>
              </div>

              <div className="flex flex-col text-center sm:text-left gap-1.5">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#7865F5] font-mono">
                  Curriculum Alignment
                </span>
                <h2 className="text-xl lg:text-2xl font-black text-[#17152E] leading-snug">
                  {activeCareer.title}
                </h2>
                <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start pt-1">
                  <span className="px-2.5 py-1 rounded-lg bg-[#EEEAFE] text-[#17152E] font-mono text-xs font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#7865F5]"></span>
                    {verifiedSkillCount} Verified
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-[#FFF2DE] text-[#8F4700] font-mono text-xs font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#E58000]"></span>
                    {inProgressTasksCount} In Progress
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-[#FFE6E6] text-[#A81818] font-mono text-xs font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#E02424]"></span>
                    {activeGapAnalysis.gaps.length} Target Gaps
                  </span>
                </div>
              </div>
            </div>

            {/* Bridge Motif & Curriculum Match Context */}
            <div className="lg:col-span-7 flex flex-col justify-between gap-5 bg-[#F5F2FF] border border-[#EEEAFE] rounded-2xl p-5 md:p-6">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="material-symbols-outlined text-[#7865F5] text-xl">
                      account_tree
                    </span>
                    <h3 className="text-base font-extrabold text-[#17152E]">
                      Curriculum &amp; Skill Match Index
                    </h3>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#D7F36A] text-[#364100] text-[10px] font-mono font-bold tracking-tight">
                      Apex CS &apos;26 Cohort Benchmark
                    </span>
                  </div>
                  <p className="text-xs md:text-sm text-[#696682] font-medium leading-relaxed max-w-xl">
                    Skill-match against {activeCareer.title} rubrics, not an employment probability. Calculated live from your {state.skills.length} skills and {activeRoadmap.completedCount}/{activeRoadmap.totalCount} completed roadmap milestones.
                  </p>
                </div>
                <div className="flex items-center gap-1 self-start shrink-0 px-2.5 py-1 rounded-lg bg-white border border-[#E4DFFA] text-[#696682] text-xs font-mono">
                  <span className="material-symbols-outlined text-[#7865F5] text-sm">
                    verified_user
                  </span>
                  <span>
                    {state.resumeMetadata.hasCustomUpload ? 'Resume Synced' : 'Tri-Source Demo'}
                  </span>
                </div>
              </div>

              {/* Stylized Geometric Vector Bridge Graphic */}
              <div className="w-full bg-white/90 border border-[#E9E4F7] rounded-xl p-3.5 relative overflow-hidden">
                <div className="flex items-center justify-between text-[11px] font-mono font-bold text-[#696682] mb-1 gap-2">
                  <span className="flex items-center gap-1 text-[#17152E]">
                    <span className="w-2 h-2 rounded-full bg-[#7865F5]"></span>
                    Foundation: {state.skills.length} Skills
                  </span>
                  <span className="hidden sm:flex text-[#7865F5] font-semibold items-center gap-1">
                    <span className="material-symbols-outlined text-xs">auto_awesome</span>
                    SkillBridge AI Synthesis
                  </span>
                  <span className="flex items-center gap-1 text-[#17152E]">
                    <span className="w-2 h-2 rounded-full bg-[#364100]"></span>
                    Target: {activeCareer.shortTitle}
                  </span>
                </div>

                <div className="relative w-full h-12 flex items-center">
                  <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 600 48">
                    <defs>
                      <linearGradient id="dashBridgeGradient" x1="0%" x2="100%" y1="0%" y2="0%">
                        <stop offset="0%" stopColor="#7865F5" />
                        <stop offset="50%" stopColor="#9A8BF9" />
                        <stop offset="85%" stopColor="#A7E436" />
                        <stop offset="100%" stopColor="#364100" />
                      </linearGradient>
                      <linearGradient id="dashBridgeGlow" x1="0%" x2="100%" y1="0%" y2="0%">
                        <stop offset="0%" stopColor="#7865F5" stopOpacity="0.1" />
                        <stop offset="50%" stopColor="#7865F5" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#D7F36A" stopOpacity="0.3" />
                      </linearGradient>
                    </defs>
                    <path d="M 20 40 L 580 40" stroke="#E3DEF5" strokeDasharray="4 4" strokeWidth="2" />
                    <path
                      d="M 20 40 Q 300 0 580 40 L 580 44 L 20 44 Z"
                      fill="url(#dashBridgeGlow)"
                    />
                    <path
                      d="M 20 40 Q 300 2 580 40"
                      fill="none"
                      stroke="url(#dashBridgeGradient)"
                      strokeLinecap="round"
                      strokeWidth="3.5"
                    />
                    <line stroke="#D3CBF5" strokeWidth="1.5" x1="120" x2="120" y1="40" y2="24" />
                    <line stroke="#D3CBF5" strokeWidth="1.5" x1="200" x2="200" y1="40" y2="15" />
                    <line stroke="#A79AF3" strokeWidth="2" x1="300" x2="300" y1="40" y2="11" />
                    <line stroke="#BFD77B" strokeWidth="1.5" x1="400" x2="400" y1="40" y2="15" />
                    <line stroke="#BFD77B" strokeWidth="1.5" x1="480" x2="480" y1="40" y2="24" />
                    <circle cx="20" cy="40" fill="#7865F5" r="5" stroke="#FFFFFF" strokeWidth="2" />
                    <circle cx="300" cy="11" fill="#9A8BF9" r="5" stroke="#FFFFFF" strokeWidth="2" />
                    <circle cx="580" cy="40" fill="#D7F36A" r="5" stroke="#17152E" strokeWidth="2" />
                  </svg>
                </div>

                <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[#696682] pt-1 border-t border-[#F0ECFA]">
                  <span>
                    Apex CS &apos;26 Median: <strong className="text-[#17152E]">{cohortMedian}/100</strong>
                  </span>
                  <span className="font-bold text-[#7865F5]">
                    {state.profile.firstName}: {activeGapAnalysis.careerReadiness}/100 (
                    {deltaFromMedian >= 0 ? `+${deltaFromMedian}` : deltaFromMedian} pts vs median)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* THREE SUPPORTING FOCUS COLUMNS */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Column 1: Strongest Skills */}
          <div className="lg:col-span-4 flex flex-col justify-between rounded-3xl bg-white border border-[#EBE7DF] p-6 shadow-sm card-hover-lift">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#EEEAFE] text-[#7865F5] flex items-center justify-center font-bold">
                    <span className="material-symbols-outlined text-lg">bolt</span>
                  </div>
                  <h3 className="text-lg font-black text-[#17152E] tracking-tight">
                    Strongest Skills
                  </h3>
                </div>
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-full bg-[#FAF9F6] text-[#696682] border border-[#E7E3D8]">
                  Top {strongestSkills.length}
                </span>
              </div>
              <p className="text-xs text-[#696682] font-medium mb-3">
                Top proficiencies from your active skill profile.{' '}
                <span className="text-[#7865F5] font-semibold">(Click any skill to inspect evidence)</span>
              </p>

              <div className="space-y-3">
                {strongestSkills.map((skill) => {
                  const isOpen = expandedSkillId === skill.id;
                  const abbr = skill.name
                    .replace(/[^A-Za-z0-9]/g, '')
                    .slice(0, 3)
                    .toUpperCase();
                  return (
                    <button
                      key={skill.id}
                      type="button"
                      onClick={() =>
                        setExpandedSkillId((prev) => (prev === skill.id ? null : skill.id))
                      }
                      className="w-full text-left p-2.5 rounded-xl hover:bg-[#F5F2FF] border border-transparent hover:border-[#EEEAFE] cursor-pointer transition-all duration-200 group/skill"
                    >
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-mono text-[10px] font-bold bg-[#EAE5FE] text-[#7865F5] px-1.5 py-0.5 rounded shrink-0">
                            {abbr}
                          </span>
                          <span className="font-bold text-[#17152E] group-hover/skill:text-[#7865F5] transition-colors truncate">
                            {skill.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] text-[#696682]">{skill.status}</span>
                          <span className="font-mono font-bold text-[#17152E]">
                            {skill.confidence}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[#EEEAFE] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#7865F5] transition-all duration-500"
                          style={{ width: `${skill.confidence}%` }}
                        ></div>
                      </div>
                      {isOpen && (
                        <div className="mt-2 p-2.5 rounded-lg bg-white border border-[#E4DFFA] text-[11px] text-[#696682] font-medium">
                          <div className="font-bold text-[#17152E] mb-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs text-[#2E7D32]">
                              check_circle
                            </span>
                            {skill.courseworkEvidence}
                          </div>
                          <span>&ldquo;{skill.resumeExcerpt}&rdquo;</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <Link
              to="/my-skills"
              className="mt-6 pt-4 border-t border-[#F0ECE1] inline-flex items-center justify-between text-xs font-bold text-[#7865F5] hover:text-[#6450E8] group transition-colors"
            >
              <span>View all {state.skills.length} profile skills</span>
              <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </Link>
          </div>

          {/* Column 2: Your Next Move (Dark Midnight Card) */}
          <div className="lg:col-span-4 relative flex flex-col justify-between rounded-3xl bg-[#17152E] text-white p-6 shadow-xl overflow-hidden card-hover-lift">
            <div className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-[#7865F5]/30 blur-2xl pointer-events-none"></div>
            <div className="absolute -left-10 -top-10 w-44 h-44 rounded-full bg-[#D7F36A]/15 blur-2xl pointer-events-none"></div>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md text-[#D7F36A] font-mono text-[10px] font-extrabold tracking-wider uppercase border border-[#D7F36A]/30">
                  ⚡ HIGH IMPACT MILESTONE
                </span>
                <span className="material-symbols-outlined text-[#7865F5] text-xl">
                  rocket_launch
                </span>
              </div>

              <h3 className="text-xl lg:text-2xl font-black text-white leading-snug tracking-tight mb-2">
                {nextMoveTask ? nextMoveTask.title : 'Complete Roadmap Capstone'}
              </h3>
              <p className="text-xs lg:text-sm text-[#D3CFE6] font-medium leading-relaxed mb-5">
                {nextMoveTask
                  ? `Closing ${nextMoveTask.targetSkillName} advances your ${activeCareer.shortTitle} roadmap (${activeRoadmap.completionPercent}% complete).`
                  : 'All current milestones are complete!'}
              </p>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex flex-col">
                  <span className="text-[10px] font-mono uppercase text-[#B7B3CF]">
                    EFFORT ESTIMATE
                  </span>
                  <span className="text-sm font-bold text-white flex items-center gap-1 mt-0.5">
                    <span className="material-symbols-outlined text-sm text-[#D7F36A]">
                      schedule
                    </span>
                    ~{nextMoveTask?.estimatedHours ?? 6} hrs effort
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex flex-col">
                  <span className="text-[10px] font-mono uppercase text-[#B7B3CF]">
                    ROADMAP PROGRESS
                  </span>
                  <span className="text-sm font-bold text-[#D7F36A] flex items-center gap-1 mt-0.5">
                    <span className="material-symbols-outlined text-sm">trending_up</span>
                    {activeRoadmap.completedCount}/{activeRoadmap.totalCount} Done
                  </span>
                </div>
              </div>

              {milestoneToast && (
                <div className="mb-4 p-3 rounded-xl bg-[#D7F36A]/20 border border-[#D7F36A]/40 text-xs text-[#D7F36A] font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">task_alt</span>
                  <span>Milestone active — opening My Roadmap...</span>
                </div>
              )}
            </div>

            <div className="relative z-10 space-y-2 pt-2">
              <button
                type="button"
                onClick={handleLetsDoIt}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#D7F36A] text-[#17152E] font-black text-sm tracking-wide flex items-center justify-center gap-2 glow-lime hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
              >
                <span>Let&apos;s Do It</span>
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </button>
              <Link
                to="/my-roadmap"
                className="w-full py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-[#D3CFE6] transition-colors flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">segment</span>
                <span>View Step-by-Step Breakdown</span>
              </Link>
            </div>
          </div>

          {/* Column 3: Career Match Target */}
          <div className="lg:col-span-4 flex flex-col justify-between rounded-3xl bg-white border border-[#EBE7DF] p-6 shadow-sm card-hover-lift">
            <div>
              <div className="flex items-start justify-between mb-2 gap-2">
                <div>
                  <span className="font-mono text-[10px] uppercase font-bold text-[#696682] tracking-wider">
                    CAREER MATCH TARGET
                  </span>
                  <h3 className="text-lg font-black text-[#17152E] tracking-tight mt-0.5">
                    {activeCareer.title}
                  </h3>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#D7F36A]/80 text-[#364100] font-mono text-xs font-black shadow-xs shrink-0">
                  <span className="material-symbols-outlined text-xs">local_fire_department</span>
                  {activeGapAnalysis.careerReadiness}% Fit
                </span>
              </div>

              <p className="text-xs text-[#696682] font-medium mb-4">
                {activeCareer.description}
              </p>

              <div className="space-y-4">
                <div>
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#696682] block mb-1.5">
                    Overlapping Strengths:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {activeGapAnalysis.strengths.length === 0 ? (
                      <span className="text-xs text-[#696682]">
                        Add or verify matching skills in My Skills.
                      </span>
                    ) : (
                      activeGapAnalysis.strengths.slice(0, 4).map((s) => (
                        <span
                          key={s.requirement.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#EEEAFE] text-[#17152E] text-xs font-semibold"
                        >
                          <span className="material-symbols-outlined text-xs text-[#2E7D32]">
                            check_circle
                          </span>
                          {s.requirement.name.split(' ')[0]}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#A81818] block mb-1.5">
                    {activeGapAnalysis.gaps.length} Priority Gaps to Close:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {activeGapAnalysis.gaps.length === 0 ? (
                      <span className="text-xs font-semibold text-[#2E7D32]">
                        No remaining gaps for this track!
                      </span>
                    ) : (
                      activeGapAnalysis.gaps.slice(0, 3).map((g) => (
                        <span
                          key={g.requirement.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FFEFEF] border border-[#FFD5D5] text-[#A81818] text-xs font-semibold"
                        >
                          <span className="material-symbols-outlined text-xs">add</span>
                          {g.requirement.name.split(' & ')[0]}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-[#F7F5EE] border border-[#EBE6DA] text-xs text-[#17152E]/80 flex items-start gap-2">
                  <span className="material-symbols-outlined text-[#7865F5] text-base shrink-0 mt-0.5">
                    psychology
                  </span>
                  <span className="leading-relaxed">
                    <strong className="text-[#17152E] font-bold">Why this role?</strong>{' '}
                    {activeCareer.whyRecommendedTemplate}
                  </span>
                </div>
              </div>
            </div>

            <Link
              to="/explore-careers"
              className="mt-6 pt-4 border-t border-[#F0ECE1] inline-flex items-center justify-between text-xs font-bold text-[#7865F5] hover:text-[#6450E8] group transition-colors"
            >
              <span>Explore Full Role Breakdown</span>
              <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </Link>
          </div>
        </section>

        {/* Bottom Minimal Footing Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to="/upload-resume"
            className="flex items-center justify-between p-4 rounded-2xl bg-white border border-[#EAE6DE] shadow-xs hover:border-[#7865F5]/40 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#EEEAFE] text-[#7865F5] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-lg">description</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs md:text-sm font-bold text-[#17152E] truncate flex items-center gap-1.5">
                  📄 {state.resumeMetadata.fileName}
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32]"></span>
                </span>
                <span className="text-[11px] font-mono text-[#696682] truncate">
                  {state.resumeMetadata.uploadedAt} · {state.resumeMetadata.fileSizeLabel}
                  {state.resumeMetadata.education[0] ? ` · ${state.resumeMetadata.education[0]}` : ''}
                </span>
              </div>
            </div>
            <span className="p-2 rounded-xl text-[#696682] hover:text-[#7865F5] shrink-0">
              <span className="material-symbols-outlined text-lg">sync</span>
            </span>
          </Link>

          <Link
            to="/explore-careers"
            className="flex items-center justify-between p-4 rounded-2xl bg-white border border-[#EAE6DE] shadow-xs hover:border-[#7865F5]/40 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#D7F36A]/80 text-[#364100] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-lg">business_center</span>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs md:text-sm font-bold text-[#17152E] truncate">
                    Campus Placement Sprint
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-[#D7F36A] text-[#364100] font-mono text-[9px] font-extrabold uppercase">
                    Open
                  </span>
                </div>
                <span className="text-[11px] font-mono text-[#696682] truncate">
                  {activeCareer.partnerFirmsCount} hiring partners interviewing {activeCareer.shortTitle} profiles
                </span>
              </div>
            </div>
            <span className="p-2 rounded-xl text-[#7865F5] shrink-0">
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </span>
          </Link>
        </section>
      </div>
    </div>
  );
};
