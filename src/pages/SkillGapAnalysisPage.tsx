import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CAREER_CATALOG } from '../data/careers';
import { useStudent } from '../context/StudentContext';
import type { SkillGapItem } from '../types/skillbridge';

function badgeColorClasses(badge: SkillGapItem['badgeLabel']) {
  if (badge === 'Strong Alignment') {
    return 'bg-emerald-100 text-emerald-800';
  }
  if (badge === 'Priority Gap') {
    return 'bg-amber-100 text-amber-800';
  }
  if (badge === 'Developing') {
    return 'bg-[#EEEAFE] text-[#5842D3]';
  }
  if (badge === 'Verify Skill') {
    return 'bg-[#FFF4D6] text-[#8A5A00]';
  }
  return 'bg-slate-100 text-slate-700';
}

export const SkillGapAnalysisPage: React.FC = () => {
  const {
    state,
    activeCareer,
    activeGapAnalysis,
    setTargetCareer,
    pinSkillToRoadmap,
  } = useStudent();
  const navigate = useNavigate();

  const [filterMode, setFilterMode] = useState<'all' | 'strengths' | 'gaps'>('all');
  const [selectedSkillReqId, setSelectedSkillReqId] = useState<string>(
    activeGapAnalysis.topPriorities[0]?.requirement.id ||
      activeGapAnalysis.items[0]?.requirement.id ||
      ''
  );
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);
  const [pinnedNotice, setPinnedNotice] = useState<string | null>(null);
  const roleSwitcherRef = useRef<HTMLDivElement>(null);
  const pinTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const firstGapOrItem =
      activeGapAnalysis.topPriorities[0]?.requirement.id ||
      activeGapAnalysis.items[0]?.requirement.id ||
      '';
    setSelectedSkillReqId(firstGapOrItem);
  }, [activeCareer.id]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (roleSwitcherRef.current && !roleSwitcherRef.current.contains(e.target as Node)) {
        setRoleSwitcherOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setRoleSwitcherOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
      if (pinTimerRef.current) window.clearTimeout(pinTimerRef.current);
    };
  }, []);

  const filteredItems = useMemo(() => {
    if (filterMode === 'strengths') return activeGapAnalysis.strengths;
    if (filterMode === 'gaps') return activeGapAnalysis.gaps;
    return activeGapAnalysis.items;
  }, [filterMode, activeGapAnalysis]);

  const inspectedItem = useMemo(() => {
    return (
      activeGapAnalysis.items.find((i) => i.requirement.id === selectedSkillReqId) ||
      filteredItems[0] ||
      activeGapAnalysis.items[0]
    );
  }, [activeGapAnalysis.items, filteredItems, selectedSkillReqId]);

  const circumference = 2 * Math.PI * 50; // ~314.159
  const strokeDashoffset =
    circumference - (activeGapAnalysis.careerReadiness / 100) * circumference;

  const handlePinToRoadmap = (reqId: string, skillName: string) => {
    pinSkillToRoadmap(reqId);
    setPinnedNotice(`Pinned "${skillName}" to your Personalized Roadmap.`);
    if (pinTimerRef.current) window.clearTimeout(pinTimerRef.current);
    pinTimerRef.current = window.setTimeout(() => setPinnedNotice(null), 3000);
  };

  return (
    <div className="bg-[#FAF9F6] w-full pt-8 pb-14 flex-grow">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Introduction & Target Role Selector Bar */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#DBD6F8]/60">
            <div>
              <h1 className="text-3xl font-extrabold text-[#1A1832] tracking-tight mb-1.5">
                Your gap is your next opportunity.
              </h1>
              <p className="text-sm md:text-base text-[#474554]">
                See how your current skills compare with your target career, and discover what to focus on next.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap relative" ref={roleSwitcherRef}>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EAE5FF] text-[#1A1832] text-xs font-medium border border-[#5842D3]/15 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-[#546500]"></span>
                <span className="text-[#5C5A6B]">Target Role:</span>
                <span className="font-bold text-[#5842D3]">{activeCareer.title}</span>
              </div>

              <button
                type="button"
                onClick={() => setRoleSwitcherOpen((v) => !v)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-[#C9C4D7]/60 text-[#474554] hover:text-[#5842D3] hover:bg-[#F0EBFF] transition-all text-xs font-semibold shadow-xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">swap_horiz</span>
                <span>Change Target Role</span>
              </button>

              <Link
                to="/explore-careers"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[#5C5A6B] hover:text-[#1A1832] text-xs font-medium transition-colors"
              >
                <span className="material-symbols-outlined text-base">arrow_back</span>
                <span>Return to Explore Careers</span>
              </Link>

              {roleSwitcherOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-white border border-[#EAE5FF] shadow-xl p-2 z-40">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#5C5A6B]">
                    Switch Target Career
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-0.5">
                    {CAREER_CATALOG.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setTargetCareer(c.id);
                          setRoleSwitcherOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between cursor-pointer ${
                          c.id === activeCareer.id
                            ? 'bg-[#7865F5] text-white font-bold'
                            : 'hover:bg-[#F6F1FF] text-[#1A1832]'
                        }`}
                      >
                        <span>{c.title}</span>
                        <span className="material-symbols-outlined text-sm">{c.icon}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {pinnedNotice && (
          <div className="mb-6 p-3 rounded-xl bg-[#D3EF66]/60 border border-[#546500]/25 text-xs font-bold text-[#181E00] flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-[#546500]">check_circle</span>
              {pinnedNotice}
            </span>
            <Link to="/my-roadmap" className="text-[#4226BD] underline">
              Go to My Roadmap →
            </Link>
          </div>
        )}

        {/* Career-Fit Overview Card */}
        <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-[#DBD6F8]/50 mb-10 relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Radial Progress Ring */}
            <div className="lg:col-span-4 flex flex-col items-center text-center p-4 rounded-xl bg-[#F6F1FF]/80 border border-[#DBD6F8]/40">
              <div className="relative my-2 flex items-center justify-center">
                <svg className="w-40 h-40 -rotate-90 transform" viewBox="0 0 120 120">
                  <circle
                    className="text-[#EAE5FF]"
                    cx="60"
                    cy="60"
                    fill="transparent"
                    r="50"
                    stroke="currentColor"
                    strokeWidth="10"
                  />
                  <circle
                    className="text-[#7865F5] transition-all duration-700"
                    cx="60"
                    cy="60"
                    fill="transparent"
                    r="50"
                    stroke="currentColor"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    strokeWidth="10"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-extrabold text-[#1A1832] tracking-tight leading-none">
                    {activeGapAnalysis.careerReadiness}%
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#5842D3] mt-1">
                    Career Readiness
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-[#5C5A6B] max-w-[250px] leading-snug mt-1">
                Skill Coverage: <strong className="font-mono text-[#1A1832]">{activeGapAnalysis.skillCoverage}%</strong> ({activeGapAnalysis.demonstratedCount}/{activeGapAnalysis.totalRequired} benchmarks met). Not a hiring guarantee.
              </p>
            </div>

            {/* Alignment Overview & 3 Metric Badges */}
            <div className="lg:col-span-8 flex flex-col justify-between space-y-5">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D3EF66] text-[#181E00] text-xs font-bold uppercase tracking-wide">
                    <span className="material-symbols-outlined text-[15px]">insights</span>
                    Alignment Overview
                  </span>
                  <span className="text-xs text-[#5C5A6B]">
                    · Evaluated across {state.skills.length} active profile skills
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-[#1A1832] mb-2">
                  {activeGapAnalysis.gaps.length === 0
                    ? `All ${activeGapAnalysis.totalRequired} target competencies demonstrated for ${activeCareer.title}.`
                    : `${activeGapAnalysis.demonstratedCount} strong benchmark${
                        activeGapAnalysis.demonstratedCount === 1 ? '' : 's'
                      } with ${activeGapAnalysis.gaps.length} skill gap${
                        activeGapAnalysis.gaps.length === 1 ? '' : 's'
                      } to bridge.`}
                </h2>
                <p className="text-sm text-[#474554] leading-relaxed">
                  Calculated transparently from your verified skills, proficiency confidence, and target role weights for <strong className="text-[#1A1832]">{activeCareer.title}</strong> ({activeGapAnalysis.developingCount} developing, {activeGapAnalysis.missingCount} missing, {activeGapAnalysis.requiresVerificationCount} requiring verification).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="p-3.5 rounded-xl bg-[#F6F1FF] border border-[#DBD6F8]/50 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-xl">check_circle</span>
                  </div>
                  <div>
                    <p className="text-base font-bold text-[#1A1832]">
                      {activeGapAnalysis.demonstratedCount} Skills
                    </p>
                    <p className="text-[11px] text-[#5C5A6B]">Demonstrated / Matched</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#F6F1FF] border border-[#DBD6F8]/50 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#EEEAFE] text-[#7865F5] flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-xl">target</span>
                  </div>
                  <div>
                    <p className="text-base font-bold text-[#1A1832]">
                      {activeGapAnalysis.gaps.length} Skill Gaps
                    </p>
                    <p className="text-[11px] text-[#5C5A6B]">
                      {activeGapAnalysis.topPriorities.length} high-impact priorities
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#F6F1FF] border border-[#DBD6F8]/50 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#EAE5FF] text-[#5842D3] flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-xl">schedule</span>
                  </div>
                  <div>
                    <p className="text-base font-bold text-[#1A1832]">
                      {activeGapAnalysis.estimatedBridgeWeeks}
                    </p>
                    <p className="text-[11px] text-[#5C5A6B]">Focused bridge sprint</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Current Skills vs. Required Skills */}
        <section className="mb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#5842D3]"></span>
                <span className="text-xs uppercase tracking-wider text-[#5842D3] font-bold">
                  Interactive Feature
                </span>
              </div>
              <h2 className="text-2xl font-bold text-[#1A1832]">
                Current Skills vs. Required Skills
              </h2>
              <p className="text-sm text-[#474554] mt-0.5">
                See what your profile demonstrates today and what {activeCareer.shortTitle} expects.
              </p>
            </div>

            {/* Filter & Legend Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-3 text-xs bg-[#F6F1FF] px-3 py-1.5 rounded-xl border border-[#DBD6F8]/50">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#7865F5]"></span>
                  <span className="text-[#5C5A6B]">Your Evidence</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#546500]"></span>
                  <span className="text-[#5C5A6B]">Role Expectation</span>
                </div>
              </div>

              <div className="inline-flex p-1 rounded-xl bg-[#EAE5FF] border border-[#DBD6F8]/40">
                <button
                  type="button"
                  onClick={() => setFilterMode('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filterMode === 'all'
                      ? 'bg-[#7865F5] text-white shadow-xs'
                      : 'text-[#5C5A6B] hover:text-[#1A1832]'
                  }`}
                >
                  All Skills ({activeGapAnalysis.items.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('strengths')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filterMode === 'strengths'
                      ? 'bg-[#7865F5] text-white shadow-xs'
                      : 'text-[#5C5A6B] hover:text-[#1A1832]'
                  }`}
                >
                  Strengths ({activeGapAnalysis.strengths.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('gaps')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filterMode === 'gaps'
                      ? 'bg-[#7865F5] text-white shadow-xs'
                      : 'text-[#5C5A6B] hover:text-[#1A1832]'
                  }`}
                >
                  Gaps ({activeGapAnalysis.gaps.length})
                </button>
              </div>
            </div>
          </div>

          {/* 2-Column Comparison Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Interactive Skill Comparison Cards */}
            <div className="lg:col-span-7 space-y-3">
              {filteredItems.map((item) => {
                const isSelected = inspectedItem?.requirement.id === item.requirement.id;
                const deltaText =
                  item.classification === 'Missing'
                    ? 'Missing'
                    : item.delta >= 0
                    ? `+${item.delta}% Surplus`
                    : `${item.delta}% Delta`;

                return (
                  <button
                    key={item.requirement.id}
                    type="button"
                    onClick={() => setSelectedSkillReqId(item.requirement.id)}
                    className={`w-full text-left cursor-pointer p-4 rounded-2xl bg-white transition-all group ${
                      isSelected
                        ? 'border-2 border-[#7865F5] shadow-md shadow-[#7865F5]/10'
                        : 'border border-[#DBD6F8]/50 hover:border-[#7865F5]/50 shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            item.classification === 'Demonstrated'
                              ? 'bg-emerald-100 text-emerald-700'
                              : item.classification === 'Missing'
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-[#EEEAFE] text-[#7865F5]'
                          }`}
                        >
                          <span className="material-symbols-outlined text-lg">
                            {item.requirement.icon}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-[#1A1832] group-hover:text-[#5842D3] transition-colors">
                            {item.requirement.name}
                          </h3>
                          <p className="text-[11px] text-[#5C5A6B] line-clamp-1">
                            {item.matchedSkill
                              ? `${item.matchedSkill.status} (${item.matchedSkill.source})`
                              : 'No matching skill evidence in profile'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${badgeColorClasses(
                            item.badgeLabel
                          )}`}
                        >
                          {item.badgeLabel}
                        </span>
                        <p
                          className={`font-mono text-[11px] font-bold mt-0.5 ${
                            item.delta >= 0
                              ? 'text-emerald-700'
                              : item.classification === 'Missing'
                              ? 'text-slate-500'
                              : 'text-[#5842D3]'
                          }`}
                        >
                          {deltaText}
                        </p>
                      </div>
                    </div>

                    {/* Paired Progress Bars */}
                    <div className="space-y-1.5 pt-1 border-t border-[#DBD6F8]/25">
                      <div>
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="text-[#5C5A6B] flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#7865F5]"></span>
                            Your Evidence
                          </span>
                          <span className="font-mono font-bold text-[#5842D3]">
                            {item.yourScore}%
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-[#E4DFFF] overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              item.yourScore > 0 ? 'bg-[#7865F5]' : 'bg-slate-400'
                            }`}
                            style={{ width: `${Math.max(item.yourScore, 3)}%` }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="text-[#5C5A6B] flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#546500]"></span>
                            Role Expectation
                          </span>
                          <span className="font-mono font-semibold text-[#546500]">
                            {item.requiredScore}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-[#E4DFFF] overflow-hidden">
                          <div
                            className="h-full bg-[#546500] rounded-full"
                            style={{ width: `${item.requiredScore}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right Column: Sticky Skill Detail Inspector */}
            <div className="lg:col-span-5">
              {inspectedItem && (
                <div className="sticky top-24 p-6 rounded-2xl bg-white border border-[#DBD6F8]/60 shadow-sm">
                  <div className="flex items-start justify-between gap-3 mb-4 pb-4 border-b border-[#F0EBFF]">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#5C5A6B] tracking-wider block mb-1">
                        {inspectedItem.requirement.category}
                      </span>
                      <h3 className="text-lg font-bold text-[#1A1832] leading-snug">
                        {inspectedItem.requirement.name}
                      </h3>
                    </div>
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide flex-shrink-0 ${badgeColorClasses(
                        inspectedItem.badgeLabel
                      )}`}
                    >
                      {inspectedItem.badgeLabel}
                    </span>
                  </div>

                  <div className="space-y-3.5 mb-5">
                    <div className="p-3.5 rounded-xl bg-[#F6F1FF] border border-[#DBD6F8]/40">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#546500] mb-1">
                        <span className="material-symbols-outlined text-[15px]">verified</span>
                        <span>What {activeCareer.shortTitle} Roles Expect</span>
                      </div>
                      <p className="text-xs text-[#474554] leading-relaxed">
                        {inspectedItem.requirement.roleExpectation}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#F6F1FF] border border-[#DBD6F8]/40">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#5842D3] mb-1">
                        <span className="material-symbols-outlined text-[15px]">fingerprint</span>
                        <span>Available Profile Evidence</span>
                      </div>
                      <p className="text-xs text-[#474554] leading-relaxed">
                        {inspectedItem.evidenceSummary}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#EEEAFE] border border-[#5842D3]/20">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#5842D3] mb-1">
                        <span className="material-symbols-outlined text-[15px]">insights</span>
                        <span>Gap Analysis Takeaway</span>
                      </div>
                      <p className="text-xs text-[#474554] leading-relaxed">
                        {inspectedItem.takeaway}
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#EAE5FF] border border-[#5842D3]/15">
                    <div className="flex items-center justify-between text-xs font-semibold text-[#5C5A6B] mb-1.5">
                      <span className="text-[#5842D3] flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px]">task_alt</span>
                        Recommended Next Action
                      </span>
                      <span className="font-mono font-medium text-[#5C5A6B]">
                        ~{inspectedItem.requirement.estimatedHours}h
                      </span>
                    </div>
                    <p className="text-xs text-[#1A1832] mb-3">
                      {inspectedItem.requirement.recommendedAction}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        handlePinToRoadmap(
                          inspectedItem.requirement.id,
                          inspectedItem.requirement.name
                        )
                      }
                      className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#5842D3] text-white text-xs font-bold hover:bg-[#715EEE] transition-all shadow-xs cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">
                        {state.pinnedSkillIdsInRoadmap.includes(inspectedItem.requirement.id)
                          ? 'check_circle'
                          : 'add'}
                      </span>
                      <span>
                        {state.pinnedSkillIdsInRoadmap.includes(inspectedItem.requirement.id)
                          ? 'Pinned in My Roadmap'
                          : 'Add to My Roadmap'}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <p className="text-xs text-[#5C5A6B] mt-4 text-center">
            Alignment scores reflect your active skills vs. role benchmark weights. Update or verify skills anytime in My Skills.
          </p>
        </section>

        {/* Top Priorities Section */}
        {activeGapAnalysis.topPriorities.length > 0 && (
          <div className="mb-12">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#546500]"></span>
                <span className="text-xs uppercase tracking-wider text-[#546500] font-bold">
                  High-Impact Target Interventions
                </span>
              </div>
              <h2 className="text-2xl font-bold text-[#1A1832]">Your top priorities</h2>
              <p className="text-xs sm:text-sm text-[#5C5A6B]">
                Focus on these high-impact gaps to unlock stronger readiness for {activeCareer.title}.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {activeGapAnalysis.topPriorities.map((gap, index) => {
                const labels = ['Priority 01 · Immediate', 'Priority 02 · Mid Sprint', 'Priority 03 · Final Stage'];
                const isPinned = state.pinnedSkillIdsInRoadmap.includes(gap.requirement.id);
                return (
                  <div
                    key={gap.requirement.id}
                    className={`bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative ${
                      index === 0 ? 'border-2 border-[#5842D3]/35' : 'border border-[#DBD6F8]/50'
                    }`}
                  >
                    <div className="absolute -top-3 left-6">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider shadow-xs ${
                          index === 0
                            ? 'bg-[#D3EF66] text-[#181E00]'
                            : 'bg-[#EAE5FF] text-[#5842D3]'
                        }`}
                      >
                        {labels[index] || `Priority 0${index + 1}`}
                      </span>
                    </div>

                    <div className="pt-2">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-[#EAE5FF] flex items-center justify-center text-[#5842D3]">
                          <span className="material-symbols-outlined text-xl">
                            {gap.requirement.icon}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-[#1A1832] leading-snug">
                            {gap.requirement.name}
                          </h3>
                          <span className="inline-block px-2 py-0.5 rounded bg-[#EEEAFE] text-[#5842D3] text-[10px] font-semibold mt-0.5">
                            {gap.classification}
                          </span>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-[#F6F1FF] mb-3 border border-[#DBD6F8]/30">
                        <span className="text-[10px] uppercase font-bold text-[#5C5A6B] block mb-1">
                          Why it matters
                        </span>
                        <p className="text-xs text-[#474554] leading-relaxed">
                          {gap.requirement.whyItMatters}
                        </p>
                      </div>

                      <div className="space-y-2 mb-4 text-xs">
                        <p className="text-[#5C5A6B]">
                          <span className="font-semibold text-[#1A1832]">Current Score:</span>{' '}
                          {gap.yourScore}% vs {gap.requiredScore}% target
                        </p>
                        <div className="p-2.5 rounded-lg bg-white border border-[#DBD6F8]/50">
                          <p className="font-semibold text-[#5842D3] mb-0.5 flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">task_alt</span>
                            Recommended Action:
                          </p>
                          <p className="text-[#474554]">{gap.requirement.recommendedAction}</p>
                        </div>
                        <p className="text-[#5C5A6B] flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs text-[#5842D3]">
                            timer
                          </span>
                          <span>Estimated Effort: ~{gap.requirement.estimatedHours} hours</span>
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handlePinToRoadmap(gap.requirement.id, gap.requirement.name)}
                      className={`w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isPinned || index === 0
                          ? 'bg-[#5842D3] text-white hover:bg-[#715EEE]'
                          : 'bg-[#EAE5FF] text-[#5842D3] hover:bg-[#5842D3] hover:text-white'
                      }`}
                    >
                      <span className="material-symbols-outlined text-base">
                        {isPinned ? 'check' : 'add'}
                      </span>
                      <span>{isPinned ? 'Pinned to Roadmap' : 'Add to My Roadmap'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Gradient Bottom CTA Card */}
        <div className="bg-gradient-to-r from-[#5842D3] to-[#715EEE] text-white rounded-2xl p-6 lg:p-8 shadow-lg relative overflow-hidden mb-4">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md bg-[#D3EF66] text-[#181E00] uppercase tracking-wider mb-2 font-bold">
                Actionable Next Phase
              </span>
              <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2 leading-tight">
                Ready to turn these insights into action?
              </h2>
              <p className="text-sm text-[#F3EEFF]/90">
                SkillBridge translates your {activeGapAnalysis.topPriorities.length} priority gap interventions into weekly milestones tailored to {activeCareer.title}.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={() => navigate('/my-roadmap')}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#D3EF66] text-[#181E00] text-sm font-bold shadow-md hover:bg-[#B7D24D] transition-all cursor-pointer"
              >
                <span>Build My Roadmap</span>
                <span className="material-symbols-outlined text-xl">bolt</span>
              </button>
              <Link
                to="/explore-careers"
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all text-sm font-medium border border-white/15"
              >
                <span className="material-symbols-outlined text-lg">explore</span>
                <span>Explore Other Careers</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
