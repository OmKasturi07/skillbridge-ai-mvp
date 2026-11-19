import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCareerById } from '../data/careers';
import { useStudent } from '../context/StudentContext';
import { analyzeSkillGaps } from '../services/skillGapEngine';

export const CareerDiscoveryPage: React.FC = () => {
  const {
    state,
    allCareerMatches,
    setTargetCareer,
    toggleSavedCareer,
    toggleCompareCareer,
    setComparedCareers,
  } = useStudent();
  const navigate = useNavigate();

  const [spotlightId, setSpotlightId] = useState<string>(state.targetCareerId);
  const [searchQuery, setSearchQuery] = useState('');
  const [deepCompareOpen, setDeepCompareOpen] = useState(false);
  const [dockDismissed, setDockDismissed] = useState(false);
  const [savedToast, setSavedToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDeepCompareOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const spotlightMatch = useMemo(() => {
    return (
      allCareerMatches.find((m) => m.career.id === spotlightId) ||
      allCareerMatches[0]
    );
  }, [allCareerMatches, spotlightId]);

  const spotlightCareer = spotlightMatch.career;
  const spotlightAnalysis = spotlightMatch.analysis;

  const filteredMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allCareerMatches.filter(({ career }) => {
      if (!q) return true;
      return (
        career.title.toLowerCase().includes(q) ||
        career.shortTitle.toLowerCase().includes(q) ||
        career.pathwayName.toLowerCase().includes(q) ||
        career.description.toLowerCase().includes(q)
      );
    });
  }, [allCareerMatches, searchQuery]);

  const deckMatches = useMemo(() => {
    return filteredMatches.filter((m) => m.career.id !== spotlightCareer.id);
  }, [filteredMatches, spotlightCareer.id]);

  // Build 2 roles for comparison dock
  const comparePair = useMemo(() => {
    const ids =
      state.comparedCareerIds.length >= 2
        ? state.comparedCareerIds.slice(0, 2)
        : state.comparedCareerIds.length === 1
        ? [
            state.comparedCareerIds[0],
            allCareerMatches.find((m) => m.career.id !== state.comparedCareerIds[0])?.career.id ||
              spotlightCareer.id,
          ]
        : [
            spotlightCareer.id,
            allCareerMatches.find((m) => m.career.id !== spotlightCareer.id)?.career.id ||
              'python-backend',
          ];

    return ids.map((id) => {
      const career = getCareerById(id);
      return {
        career,
        analysis: analyzeSkillGaps(career, state.skills),
      };
    });
  }, [state.comparedCareerIds, state.skills, allCareerMatches, spotlightCareer.id]);

  const roleA = comparePair[0];
  const roleB = comparePair[1];

  const sharedStrengthNames = useMemo(() => {
    if (!roleA || !roleB) return [];
    const setB = new Set(roleB.analysis.strengths.map((s) => s.requirement.name));
    return roleA.analysis.strengths
      .map((s) => s.requirement.name)
      .filter((name) => setB.has(name));
  }, [roleA, roleB]);

  const circumference = 2 * Math.PI * 42; // ~263.89
  const ringOffset =
    circumference - (spotlightAnalysis.careerReadiness / 100) * circumference;

  const isTarget = state.targetCareerId === spotlightCareer.id;
  const isSaved = state.savedCareerIds.includes(spotlightCareer.id);

  const handleViewSkillGaps = (careerId: string) => {
    setTargetCareer(careerId);
    navigate('/skill-gap-analysis');
  };

  const handleSaveTarget = (careerId: string, title: string) => {
    setTargetCareer(careerId);
    setSavedToast(`"${title}" set as your active Target Career.`);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setSavedToast(null), 2800);
  };

  const handleOpenCompareFromSpotlight = () => {
    const secondId =
      allCareerMatches.find((m) => m.career.id !== spotlightCareer.id)?.career.id ||
      'python-backend';
    setComparedCareers([spotlightCareer.id, secondId]);
    setDockDismissed(false);
    setDeepCompareOpen(true);
  };

  return (
    <div className="bg-[#FCF8FF] w-full pt-6 pb-16 flex-grow relative overflow-hidden">
      {/* Subtle Ambient Glow Orbs */}
      <div className="absolute -top-32 left-1/4 w-96 h-96 bg-[#5842D3]/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-48 right-12 w-80 h-80 bg-[#D3EF66]/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col gap-8">
        {/* Editorial Header Section + Search & Quick Role Tabs */}
        <section className="flex flex-col gap-5">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
            <div className="flex flex-col gap-2 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAE5FF] w-fit text-[#5842D3] text-xs uppercase tracking-wider font-semibold">
                <span className="material-symbols-outlined text-sm">explore</span>
                <span>Vector Talent Projections · Active Cohort</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-extrabold text-[#1A1832] tracking-tight leading-tight">
                Your next chapter <span className="text-[#5842D3] italic">could be...</span>
              </h1>
              <p className="text-sm md:text-base text-[#474554] leading-relaxed">
                Explore career paths tailored to your {state.skills.length} current skills, coursework, and projects. Compare structured pathways grounded in real competency benchmarks.
              </p>
              <p className="text-xs text-[#787586] leading-normal flex items-start gap-1">
                <span className="material-symbols-outlined text-xs mt-0.5">info</span>
                <span>
                  Match indicators represent competency alignment between your active skill profile and role rubrics, not an employment or placement guarantee.
                </span>
              </p>
            </div>

            {/* Search Input */}
            <div className="w-full lg:w-80">
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-[#5842D3] text-lg pointer-events-none">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search careers (AI, Data, Python, QA...)"
                  className="w-full pl-10 pr-8 py-2.5 rounded-xl bg-white border border-[#EAE5FF] text-xs sm:text-sm text-[#1A1832] shadow-xs focus:outline-none focus:border-[#5842D3]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 text-[#787586] hover:text-[#1A1832]"
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Role Tabs */}
          <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#F0EBFF] overflow-x-auto max-w-full">
            {allCareerMatches.map(({ career, analysis }) => {
              const active = career.id === spotlightCareer.id;
              return (
                <button
                  key={career.id}
                  type="button"
                  onClick={() => setSpotlightId(career.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-white text-[#1A1832] shadow-sm font-bold'
                      : 'text-[#474554] hover:text-[#1A1832] font-medium'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      active ? 'bg-[#D3EF66] ring-2 ring-[#546500]/30' : 'bg-[#C9C4D7]'
                    }`}
                  ></span>
                  <span>{career.shortTitle}</span>
                  <span className="font-mono text-[11px] text-[#5842D3] font-bold">
                    {analysis.careerReadiness}%
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {savedToast && (
          <div className="p-3 rounded-xl bg-[#D3EF66]/60 border border-[#546500]/25 text-xs font-bold text-[#181E00] flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-[#546500]">check_circle</span>
            <span>{savedToast}</span>
          </div>
        )}

        {/* Main Featured Career Spotlight Card */}
        <section className="relative w-full rounded-3xl bg-white p-6 md:p-10 shadow-xl border border-[#EAE5FF]/70 overflow-hidden">
          <div className="absolute -right-8 -top-8 w-44 h-44 rounded-full bg-[#EAE5FF]/40 pointer-events-none flex items-center justify-center">
            <span className="material-symbols-outlined text-[#5842D3]/15 text-8xl">verified_user</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
            {/* Left 7 Cols */}
            <div className="lg:col-span-7 flex flex-col gap-5">
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="px-3.5 py-1.5 rounded-full bg-[#D3EF66] text-[#181E00] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                  <span className="material-symbols-outlined text-base">bolt</span>
                  <span>{spotlightAnalysis.careerReadiness}% Profile Match</span>
                </div>
                <span className="px-3.5 py-1.5 rounded-full bg-[#EAE5FF] text-[#5842D3] font-mono text-xs font-semibold">
                  {spotlightAnalysis.skillCoverage}% Skill Coverage
                </span>
                <span className="px-3.5 py-1.5 rounded-full bg-[#F0EBFF] text-[#474554] text-xs uppercase font-bold">
                  {spotlightCareer.trackCode}
                </span>
                {isTarget && (
                  <span className="px-3 py-1 rounded-full bg-[#1A1832] text-[#D3EF66] text-[11px] font-bold uppercase tracking-wider">
                    Active Target Goal
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-2xl md:text-3xl font-bold text-[#1A1832]">
                    {spotlightCareer.title}
                  </h2>
                  <div className="hidden sm:flex items-center gap-1.5 text-[#474554] font-mono text-xs font-medium">
                    <span>{spotlightCareer.salaryRange}</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#546500]"></span>
                  </div>
                </div>
                <p className="text-sm md:text-base text-[#474554] leading-relaxed">
                  {spotlightCareer.description}
                </p>
              </div>

              {/* Why Recommended */}
              <div className="rounded-2xl p-4 bg-[#F6F1FF] flex items-start gap-3.5 border border-[#EAE5FF]">
                <div className="p-2 rounded-xl bg-[#5842D3] text-white shrink-0 shadow-sm">
                  <span className="material-symbols-outlined text-xl">psychology</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-[#5842D3] uppercase tracking-wide">
                    Why You&apos;re Recommended
                  </span>
                  <p className="text-xs sm:text-sm text-[#1A1832] leading-normal">
                    {spotlightCareer.whyRecommendedTemplate}{' '}
                    {spotlightAnalysis.strengths.length > 0 && (
                      <span className="font-semibold text-[#546500]">
                        Verified alignment in{' '}
                        {spotlightAnalysis.strengths
                          .slice(0, 3)
                          .map((s) => s.requirement.name)
                          .join(', ')}
                        .
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Verified Assets vs Priority Gaps */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2 p-3.5 rounded-2xl bg-[#F0EBFF]/70">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1A1832] uppercase tracking-wide">
                      Verified Student Assets ({spotlightAnalysis.strengths.length})
                    </span>
                    <span className="material-symbols-outlined text-[#546500] text-sm">
                      check_circle
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {spotlightAnalysis.strengths.length === 0 ? (
                      <div className="px-3 py-2 rounded-lg bg-white text-xs text-[#5C5A6B]">
                        Upload coursework or add matching skills to build alignment.
                      </div>
                    ) : (
                      spotlightAnalysis.strengths.slice(0, 4).map((item) => (
                        <div
                          key={item.requirement.id}
                          className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-white text-[#1A1832] text-xs shadow-2xs"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="material-symbols-outlined text-[#546500] text-sm">
                              check
                            </span>
                            <span className="font-semibold truncate">{item.requirement.name}</span>
                          </div>
                          <span className="font-mono text-[11px] text-[#474554] shrink-0">
                            {item.yourScore}%
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 p-3.5 rounded-2xl bg-[#EAE5FF]/40">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#5842D3] uppercase tracking-wide">
                      Priority Skills to Acquire ({spotlightAnalysis.gaps.length})
                    </span>
                    <span className="material-symbols-outlined text-[#5842D3] text-sm">
                      track_changes
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {spotlightAnalysis.gaps.length === 0 ? (
                      <div className="px-3 py-2 rounded-lg bg-white text-xs text-[#546500] font-semibold">
                        All role skill expectations are currently met!
                      </div>
                    ) : (
                      spotlightAnalysis.gaps.slice(0, 4).map((item) => (
                        <div
                          key={item.requirement.id}
                          className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-white text-[#1A1832] text-xs shadow-2xs"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="material-symbols-outlined text-[#5842D3] text-sm">
                              add_circle
                            </span>
                            <span className="font-semibold truncate">{item.requirement.name}</span>
                          </div>
                          <span className="font-mono text-[11px] text-[#5842D3] font-bold shrink-0">
                            {item.requirement.priority === 'high' ? 'High Priority' : 'Medium'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => handleViewSkillGaps(spotlightCareer.id)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5842D3] text-white text-sm font-semibold hover:bg-[#715EEE] shadow-md shadow-[#5842D3]/20 transition-all cursor-pointer"
                >
                  <span>View Skill Gaps</span>
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveTarget(spotlightCareer.id, spotlightCareer.title)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                    isTarget
                      ? 'bg-[#D3EF66] text-[#181E00]'
                      : 'bg-[#F0EBFF] text-[#5842D3] hover:bg-[#EAE5FF]'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">
                    {isTarget ? 'verified' : 'star'}
                  </span>
                  <span>{isTarget ? 'Active Target Role' : 'Select Target Career'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenCompareFromSpotlight}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[#474554] hover:text-[#1A1832] hover:bg-[#F6F1FF] text-sm font-medium transition-all border border-[#F0EBFF] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">balance</span>
                  <span>Compare with Another Role</span>
                </button>
              </div>
            </div>

            {/* Right 5 Cols */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="p-5 rounded-2xl bg-[#F6F1FF] flex flex-col items-center justify-center text-center relative overflow-hidden border border-[#EAE5FF]">
                <div className="w-full flex items-center justify-between pb-2">
                  <span className="text-xs font-bold text-[#1A1832] uppercase tracking-wide">
                    Curriculum &amp; Profile Fit
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#EAE5FF] text-[#5842D3] font-mono text-xs font-semibold">
                    BATCH 2026
                  </span>
                </div>

                <div className="relative w-40 h-40 my-2 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      className="text-[#EAE5FF]"
                      cx="50"
                      cy="50"
                      fill="none"
                      r="42"
                      stroke="currentColor"
                      strokeWidth="9"
                    />
                    <circle
                      className="text-[#5842D3] transition-all duration-700 ease-out"
                      cx="50"
                      cy="50"
                      fill="none"
                      r="42"
                      stroke="currentColor"
                      strokeDasharray={circumference}
                      strokeDashoffset={ringOffset}
                      strokeLinecap="round"
                      strokeWidth="9"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-mono text-3xl font-bold text-[#1A1832]">
                      {spotlightAnalysis.careerReadiness}%
                    </span>
                    <span className="text-[10px] uppercase tracking-widest text-[#5842D3] font-bold">
                      Fit Score
                    </span>
                  </div>
                </div>

                <div className="w-full grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-white text-left shadow-2xs border border-[#F0EBFF]">
                    <span className="text-xs text-[#474554] block">Prep Window</span>
                    <span className="font-mono text-sm font-bold text-[#1A1832]">
                      {spotlightCareer.prepWindow}
                    </span>
                    <span className="text-[11px] text-[#5C5A6B] block mt-0.5">
                      {spotlightAnalysis.estimatedBridgeWeeks} bridge
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-white text-left shadow-2xs border border-[#F0EBFF]">
                    <span className="text-xs text-[#474554] block">Complexity Tier</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-sm font-bold text-[#5842D3]">
                        {spotlightCareer.complexityTier}
                      </span>
                      <span className="w-2 h-2 rounded-full bg-[#B7D24D] animate-pulse"></span>
                    </div>
                    <span className="text-[11px] text-[#5C5A6B] block mt-0.5 truncate">
                      {spotlightCareer.partnerFirmsCount} Partner Firms
                    </span>
                  </div>
                </div>
              </div>

              {/* Curriculum Pathway Visual Banner */}
              <button
                type="button"
                onClick={() => handleViewSkillGaps(spotlightCareer.id)}
                className="relative rounded-2xl overflow-hidden h-36 shadow-sm flex items-end p-5 border border-[#EAE5FF] bg-gradient-to-br from-[#17152E] via-[#302D48] to-[#5842D3] text-left group cursor-pointer"
              >
                <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-[#D7F36A]/20 blur-xl pointer-events-none"></div>
                <div className="relative z-10 flex items-center justify-between w-full text-white">
                  <div>
                    <span className="text-[11px] uppercase text-[#D3EF66] tracking-wider font-bold block">
                      Curriculum Pathway
                    </span>
                    <h4 className="text-base font-semibold text-white">
                      {spotlightCareer.pathwayName}
                    </h4>
                    <span className="text-xs text-white/75">
                      {spotlightAnalysis.demonstratedCount} / {spotlightAnalysis.totalRequired} benchmarks met
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-[#D3EF66] text-2xl group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
                    arrow_outward
                  </span>
                </div>
              </button>
            </div>
          </div>
        </section>

        {/* Alternative Recommended Careers Deck */}
        <section className="flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 text-[#5842D3] text-xs uppercase tracking-wider mb-1 font-semibold">
                <span className="material-symbols-outlined text-sm">explore</span>
                <span>Vector Ranked Projections</span>
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-[#1A1832]">
                Alternative Recommended Careers Deck
              </h3>
            </div>
            <span className="text-xs text-[#474554]">
              {deckMatches.length} alternative pathways ranked from your live skill profile
            </span>
          </div>

          {deckMatches.length === 0 ? (
            <div className="p-6 rounded-2xl bg-white border border-[#EAE5FF] text-center text-sm text-[#5C5A6B]">
              No alternative careers match &ldquo;{searchQuery}&rdquo;. Clear the search filter to browse all {allCareerMatches.length} roles.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {deckMatches.map(({ career, analysis }) => {
                const isCompared = state.comparedCareerIds.includes(career.id);
                const bookmarked = state.savedCareerIds.includes(career.id);
                return (
                  <div
                    key={career.id}
                    className={`flex flex-col justify-between p-5 rounded-2xl bg-white hover:bg-[#F6F1FF] transition-all duration-200 shadow-sm border ${
                      state.targetCareerId === career.id
                        ? 'border-[#5842D3] ring-1 ring-[#5842D3]/30'
                        : 'border-[#F0EBFF]'
                    }`}
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-full bg-[#F0EBFF] text-[#1A1832] font-mono text-xs font-bold">
                          {analysis.careerReadiness}% Match
                        </span>
                        <label className="inline-flex items-center gap-1.5 text-xs text-[#474554] cursor-pointer font-medium">
                          <input
                            type="checkbox"
                            checked={isCompared}
                            onChange={() => {
                              toggleCompareCareer(career.id);
                              setDockDismissed(false);
                            }}
                            className="rounded border-[#C9C4D7] text-[#5842D3] focus:ring-[#5842D3] w-3.5 h-3.5"
                          />
                          <span className="text-[11px]">Compare</span>
                        </label>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSpotlightId(career.id)}
                        className="flex items-center gap-2 text-left group cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[#5842D3] text-xl">
                          {career.icon}
                        </span>
                        <h4 className="text-base font-bold text-[#1A1832] group-hover:text-[#5842D3] transition-colors">
                          {career.title}
                        </h4>
                      </button>

                      <p className="text-xs text-[#474554] leading-relaxed">
                        {career.description}
                      </p>

                      <div className="flex flex-col gap-1 pt-1">
                        <span className="text-[10px] uppercase text-[#546500] font-bold">
                          Matching Skills
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {analysis.strengths.length === 0 ? (
                            <span className="text-[11px] text-[#787586]">None verified yet</span>
                          ) : (
                            analysis.strengths.slice(0, 3).map((s) => (
                              <span
                                key={s.requirement.id}
                                className="px-2 py-0.5 rounded bg-[#F0EBFF] text-[#1A1832] font-mono text-[11px]"
                              >
                                {s.requirement.name.split(' ')[0]}
                              </span>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-1 pt-1">
                        <span className="text-[10px] uppercase text-[#5842D3] font-bold">
                          Key Gaps
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {analysis.gaps.length === 0 ? (
                            <span className="text-[11px] font-semibold text-[#546500]">
                              All role benchmarks met
                            </span>
                          ) : (
                            analysis.gaps.slice(0, 3).map((g) => (
                              <span
                                key={g.requirement.id}
                                className="px-2 py-0.5 rounded bg-[#EAE5FF] text-[#5842D3] font-mono text-[11px] font-medium"
                              >
                                {g.requirement.name.split(' & ')[0]}
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 flex items-center justify-between mt-4 border-t border-[#F0EBFF]">
                      <button
                        type="button"
                        onClick={() => handleViewSkillGaps(career.id)}
                        className="text-[#5842D3] hover:text-[#715EEE] text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <span>View Gap →</span>
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveTarget(career.id, career.title)}
                          className="text-[11px] font-semibold text-[#474554] hover:text-[#5842D3] cursor-pointer"
                        >
                          {state.targetCareerId === career.id ? 'Target ✓' : 'Set Target'}
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleSavedCareer(career.id)}
                          title={bookmarked ? 'Remove bookmark' : 'Bookmark career'}
                          className={`p-1 rounded-lg transition-colors cursor-pointer ${
                            bookmarked
                              ? 'text-[#5842D3] bg-[#EAE5FF]'
                              : 'text-[#474554] hover:bg-[#F0EBFF]'
                          }`}
                        >
                          <span className="material-symbols-outlined text-base">
                            {bookmarked ? 'bookmark' : 'star'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Sticky Live Role Comparison Dock & Deep Compare Mode */}
        {!dockDismissed && roleA && roleB && (
          <section className="sticky bottom-4 z-40 w-full rounded-2xl bg-white p-4 shadow-2xl transition-all duration-300 border border-[#EAE5FF]">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#5842D3] text-white flex items-center justify-center shrink-0 shadow-sm">
                  <span className="material-symbols-outlined text-xl">balance</span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-[#1A1832]">Live Role Comparison</span>
                    <span className="px-2 py-0.5 rounded bg-[#D3EF66] text-[#181E00] text-[10px] uppercase font-bold">
                      2 Roles Selected
                    </span>
                  </div>
                  <p className="text-xs text-[#474554]">
                    Comparing:{' '}
                    <strong className="text-[#1A1832]">
                      {roleA.career.title} ({roleA.analysis.careerReadiness}%)
                    </strong>{' '}
                    vs{' '}
                    <strong className="text-[#1A1832]">
                      {roleB.career.title} ({roleB.analysis.careerReadiness}%)
                    </strong>
                  </p>
                </div>
              </div>

              <div className="flex-1 max-w-xl flex flex-col gap-1.5 px-0 lg:px-4">
                <div className="flex justify-between font-mono text-xs font-semibold">
                  <span className="text-[#5842D3]">
                    {roleA.career.shortTitle} ({roleA.analysis.careerReadiness}%)
                  </span>
                  <span className="text-[#474554]">
                    {roleB.career.shortTitle} ({roleB.analysis.careerReadiness}%)
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-[#F0EBFF] flex overflow-hidden">
                  {(() => {
                    const total =
                      Math.max(1, roleA.analysis.careerReadiness + roleB.analysis.careerReadiness);
                    const pctA = Math.round((roleA.analysis.careerReadiness / total) * 100);
                    return (
                      <>
                        <div className="h-full bg-[#5842D3]" style={{ width: `${pctA}%` }}></div>
                        <div
                          className="h-full bg-[#D3EF66]"
                          style={{ width: `${100 - pctA}%` }}
                        ></div>
                      </>
                    );
                  })()}
                </div>
                <div className="flex justify-between text-xs text-[#474554]">
                  <span className="flex items-center gap-1 text-[#546500] font-medium">
                    <span className="material-symbols-outlined text-xs">check_circle</span>
                    {sharedStrengthNames.length} shared verified skills
                  </span>
                  <span className="text-[#5842D3] font-medium">
                    {roleA.analysis.gaps.length} vs {roleB.analysis.gaps.length} priority gaps
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end lg:self-auto">
                <button
                  type="button"
                  onClick={() => setDeepCompareOpen((v) => !v)}
                  className="px-4 py-2 rounded-xl bg-[#5842D3] text-white text-xs font-semibold hover:bg-[#715EEE] transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">
                    {deepCompareOpen ? 'close_fullscreen' : 'open_in_full'}
                  </span>
                  <span>{deepCompareOpen ? 'Hide Compare' : 'Deep Compare Mode'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDockDismissed(true);
                    setDeepCompareOpen(false);
                  }}
                  title="Dismiss Comparison"
                  className="p-2 rounded-xl text-[#474554] hover:bg-[#F0EBFF] transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </div>
            </div>

            {/* Deep Compare Mode Expanded Grid */}
            {deepCompareOpen && (
              <div className="pt-5 mt-4 border-t border-[#F0EBFF] flex flex-col gap-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[roleA, roleB].map((entry, idx) => (
                    <div
                      key={entry.career.id}
                      className={`p-4 rounded-xl border border-[#F0EBFF] flex flex-col gap-3 ${
                        idx === 0 ? 'bg-[#F6F1FF]' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-[#5842D3]">
                          {entry.career.title}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[#5842D3] text-white font-mono text-xs font-bold">
                          {entry.analysis.careerReadiness}% Match
                        </span>
                      </div>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between gap-2 border-b border-[#EAE5FF] pb-1">
                          <span className="text-[#474554]">Verified Strengths:</span>
                          <span className="font-semibold text-[#546500] text-right">
                            {entry.analysis.strengths.length > 0
                              ? entry.analysis.strengths
                                  .slice(0, 3)
                                  .map((s) => s.requirement.name)
                                  .join(', ')
                              : 'None verified yet'}
                          </span>
                        </div>
                        <div className="flex justify-between gap-2 border-b border-[#EAE5FF] pb-1">
                          <span className="text-[#474554]">Role-Specific Gaps:</span>
                          <span className="font-semibold text-[#5842D3] text-right">
                            {entry.analysis.gaps.length > 0
                              ? entry.analysis.gaps
                                  .slice(0, 3)
                                  .map((g) => g.requirement.name)
                                  .join(', ')
                              : 'All met'}
                          </span>
                        </div>
                        <div className="flex justify-between gap-2 border-b border-[#EAE5FF] pb-1">
                          <span className="text-[#474554]">Bridge Sprint Window:</span>
                          <span className="font-mono font-bold text-[#1A1832]">
                            {entry.analysis.estimatedBridgeWeeks} ({entry.career.prepWindow})
                          </span>
                        </div>
                        <div className="flex justify-between gap-2 border-b border-[#EAE5FF] pb-1">
                          <span className="text-[#474554]">Skill Coverage:</span>
                          <span className="font-semibold text-[#546500]">
                            {entry.analysis.skillCoverage}% ({entry.analysis.demonstratedCount}/
                            {entry.analysis.totalRequired})
                          </span>
                        </div>
                        <div className="pt-1">
                          <span className="text-[#474554] block mb-1 font-semibold">
                            Recommended Next Steps:
                          </span>
                          <p className="text-xs text-[#474554] leading-relaxed">
                            {entry.analysis.topPriorities[0]?.requirement.recommendedAction ||
                              'Review full gap matrix and build capstone evidence.'}
                          </p>
                        </div>
                      </div>
                      <div className="pt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleViewSkillGaps(entry.career.id)}
                          className="flex-1 py-2 rounded-lg bg-[#5842D3] text-white text-xs font-semibold hover:bg-[#715EEE] transition-all cursor-pointer"
                        >
                          Select Target Career &amp; View Gaps
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#F0EBFF] text-xs">
                  <div className="flex flex-wrap items-center gap-2 text-[#474554]">
                    <span className="font-semibold text-[#1A1832]">Shared Grounded Skills:</span>
                    {sharedStrengthNames.length === 0 ? (
                      <span className="text-[#787586]">None overlapping yet</span>
                    ) : (
                      sharedStrengthNames.map((name) => (
                        <span
                          key={name}
                          className="px-2 py-0.5 rounded bg-[#F0EBFF] font-mono text-[11px]"
                        >
                          {name}
                        </span>
                      ))
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeepCompareOpen(false)}
                    className="px-3 py-1.5 rounded-lg text-[#474554] hover:text-[#1A1832] hover:bg-[#F0EBFF] font-semibold transition-colors cursor-pointer"
                  >
                    ✕ Exit Compare
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Transparent Academic & Ethical Disclaimer */}
        <p className="pt-2 pb-4 text-center text-xs text-[#474554] max-w-3xl mx-auto leading-relaxed">
          Match percentages represent competency alignment between verified student profile skills and industry role rubrics. Not a hiring guarantee. Sourced through Apex Institute Academic Placement Services.
        </p>
      </div>
    </div>
  );
};
