import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CAREER_CATALOG } from '../data/careers';
import { useStudent } from '../context/StudentContext';
import type { LearningProgressStatus, RoadmapTask } from '../types/skillbridge';

type ResourceFilter = 'all' | 'free' | 'cert' | 'video' | 'practice';

function isSafeHttpUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export const MyRoadmapPage: React.FC = () => {
  const {
    state,
    activeCareer,
    activeGapAnalysis,
    activeRoadmap,
    setTargetCareer,
    setTaskStatus,
    submitTaskEvidence,
    sendAdvisorMessage,
  } = useStudent();

  const [activeView, setActiveView] = useState<'roadmap' | 'resources'>('roadmap');
  const [resourceFilter, setResourceFilter] = useState<ResourceFilter>('all');
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const roleMenuRef = useRef<HTMLDivElement>(null);

  // Modals
  const [evidenceTaskId, setEvidenceTaskId] = useState<string | null>(null);
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evidenceCommit, setEvidenceCommit] = useState('');
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [evidenceError, setEvidenceError] = useState<string | null>(null);

  const [sandboxTask, setSandboxTask] = useState<RoadmapTask | null>(null);
  const [sandboxOutput, setSandboxOutput] = useState<string | null>(null);

  const [shareOpen, setShareOpen] = useState(false);
  const [shareCopyStatus, setShareCopyStatus] = useState<'idle' | 'copied' | 'fallback'>('idle');

  const [advisorOpen, setAdvisorOpen] = useState(false);
  const [advisorDraft, setAdvisorDraft] = useState('');

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (roleMenuRef.current && !roleMenuRef.current.contains(e.target as Node)) {
        setRoleMenuOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setRoleMenuOpen(false);
        setEvidenceTaskId(null);
        setSandboxTask(null);
        setShareOpen(false);
        setAdvisorOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const allResources = useMemo(() => {
    const map = new Map<string, { task: RoadmapTask; res: RoadmapTask['resources'][number] }>();
    for (const task of activeRoadmap.allTasks) {
      for (const res of task.resources) {
        if (!map.has(res.id)) {
          map.set(res.id, { task, res });
        }
      }
    }
    return Array.from(map.values());
  }, [activeRoadmap.allTasks]);

  const filteredResourceGroups = useMemo(() => {
    return activeRoadmap.allTasks
      .map((task) => {
        const items = task.resources.filter((res) => {
          if (resourceFilter === 'all') return true;
          return res.tags.includes(resourceFilter);
        });
        return { task, items };
      })
      .filter((g) => g.items.length > 0);
  }, [activeRoadmap.allTasks, resourceFilter]);

  const activeSprintTask = useMemo(() => {
    return (
      activeRoadmap.allTasks.find((t) => t.status === 'in_progress') ||
      activeRoadmap.allTasks.find((t) => t.status === 'not_started') ||
      activeRoadmap.allTasks[0]
    );
  }, [activeRoadmap.allTasks]);

  const openEvidenceFor = (taskId?: string) => {
    const targetId = taskId || activeSprintTask?.id || activeRoadmap.allTasks[0]?.id || '';
    const existing = state.roadmapTaskProgress[targetId];
    setEvidenceError(null);
    setEvidenceTaskId(targetId);
    setEvidenceUrl(existing?.evidenceUrl || '');
    setEvidenceCommit(existing?.commitHash || '');
    setEvidenceNotes(existing?.notes || '');
  };

  const handleEvidenceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evidenceTaskId) return;
    if (!isSafeHttpUrl(evidenceUrl)) {
      setEvidenceError('Please enter a valid http:// or https:// repository, demo, or certificate URL.');
      return;
    }
    setEvidenceError(null);
    submitTaskEvidence(evidenceTaskId, {
      evidenceUrl: evidenceUrl.trim(),
      commitHash: evidenceCommit,
      notes: evidenceNotes,
    });
    setEvidenceTaskId(null);
  };

  const toggleStatusAction = (task: RoadmapTask) => {
    const next: LearningProgressStatus =
      task.status === 'completed' ? 'in_progress' : 'completed';
    setTaskStatus(task.id, next);
  };

  const toggleExpand = (taskId: string) => {
    setExpandedTasks((prev) => ({
      ...prev,
      [taskId]: prev[taskId] === undefined ? false : !prev[taskId],
    }));
  };

  const handleRunSandbox = () => {
    if (!sandboxTask) return;
    setSandboxOutput(
      `[SkillBridge Sandbox Runner]\n> Executing ${sandboxTask.targetSkillName} verification suite...\n✓ Dependencies loaded\n✓ Assertions passed (3/3)\n✓ Deliverable readiness check complete.`
    );
  };

  const shareSummaryText = `SkillBridge AI Roadmap — ${state.profile.fullName}\nTarget Career: ${activeCareer.title}\nReadiness Score: ${activeGapAnalysis.careerReadiness}%\nRoadmap Progress: ${activeRoadmap.completedCount}/${activeRoadmap.totalCount} milestones (${activeRoadmap.completionPercent}%)\nEstimated Effort Remaining: ~${activeRoadmap.estimatedHoursRemaining}h`;

  const handleCopyShare = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareSummaryText);
        setShareCopyStatus('copied');
        window.setTimeout(() => setShareCopyStatus('idle'), 2500);
        return;
      }
    } catch {
      // Fallback below
    }

    try {
      const el = document.createElement('textarea');
      el.value = shareSummaryText;
      el.setAttribute('readonly', '');
      el.style.position = 'absolute';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(el);
      setShareCopyStatus(copied ? 'copied' : 'fallback');
      if (copied) {
        window.setTimeout(() => setShareCopyStatus('idle'), 2500);
      }
    } catch {
      setShareCopyStatus('fallback');
    }
  };

  return (
    <div className="bg-[#FAF9F6] w-full pt-8 pb-16 flex-grow">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-6">
        {/* Target Role Banner & Overview Card */}
        <section className="bg-white rounded-2xl p-6 sm:p-8 border border-[#EEEAFE] shadow-sm relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-[#EEEAFE]/60 blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2.5 relative" ref={roleMenuRef}>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEEAFE] text-[#7865F5] text-xs font-bold uppercase tracking-wider">
                  <span className="material-symbols-outlined text-sm">route</span>
                  Learning path for {activeCareer.title}
                </span>
                <span className="text-xs text-[#6E6B87]">|</span>
                <button
                  type="button"
                  onClick={() => setRoleMenuOpen((v) => !v)}
                  className="text-xs font-semibold text-[#7865F5] hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                >
                  Change Target Role
                  <span className="material-symbols-outlined text-xs">tune</span>
                </button>
                <span className="text-xs text-[#6E6B87]">·</span>
                <Link
                  to="/skill-gap-analysis"
                  className="text-xs font-semibold text-[#4E4B66] hover:text-[#7865F5] transition-colors inline-flex items-center gap-0.5"
                >
                  View Skill Gap Analysis
                  <span className="material-symbols-outlined text-xs">arrow_outward</span>
                </Link>

                {roleMenuOpen && (
                  <div className="absolute left-0 top-full mt-2 w-72 rounded-2xl bg-white border border-[#EEEAFE] shadow-xl p-2 z-40">
                    {CAREER_CATALOG.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setTargetCareer(c.id);
                          setRoleMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between cursor-pointer ${
                          c.id === activeCareer.id
                            ? 'bg-[#7865F5] text-white font-bold'
                            : 'hover:bg-[#F4F3F8] text-[#17152E]'
                        }`}
                      >
                        <span>{c.title}</span>
                        <span className="material-symbols-outlined text-sm">{c.icon}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold text-[#17152E] tracking-tight">
                Your next steps, mapped out.
              </h1>
              <p className="text-sm sm:text-base text-[#4E4B66]">
                Learn in the right order. Practise with purpose. Build evidence of your skills.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 flex-shrink-0">
              <Link
                to="/explore-careers"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#EEEAFE] bg-[#FAF9F6] hover:bg-white text-xs font-bold text-[#17152E] transition-all"
              >
                <span className="material-symbols-outlined text-base text-[#7865F5]">
                  travel_explore
                </span>
                Explore Other Careers
              </Link>
              <button
                type="button"
                onClick={() => openEvidenceFor()}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#7865F5] hover:bg-[#6350E6] text-xs font-bold text-white shadow-sm transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">add_link</span>
                Add Evidence
              </button>
              <button
                type="button"
                onClick={() => setShareOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#EEEAFE] bg-white hover:bg-[#EEEAFE]/60 text-[#7865F5] text-xs font-bold transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">share</span>
                <span>Share</span>
              </button>
            </div>
          </div>

          {/* Top Overview Progress Card */}
          <div className="mt-6 pt-5 border-t border-[#F4F3F8] bg-[#FAF9F6] rounded-xl p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#7865F5] text-white text-xs font-bold font-mono">
                  {activeRoadmap.completedCount}
                </span>
                <span className="font-bold text-sm text-[#17152E]">
                  {activeRoadmap.completedCount} of {activeRoadmap.totalCount} Tasks Completed
                </span>
                <span className="hidden sm:inline text-[#6E6B87]">·</span>
                <span className="text-xs font-mono text-[#6E6B87]">
                  ~{activeRoadmap.estimatedHoursRemaining} hours estimated effort remaining
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white border border-[#EEEAFE] text-[#6E6B87]">
                  Milestones tracked separately from verified mastery
                </span>
                <span className="text-sm font-extrabold font-mono text-[#7865F5]">
                  {activeRoadmap.completionPercent}% Completed
                </span>
              </div>
            </div>

            <div className="w-full h-3 rounded-full bg-[#DDD8F6] overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-[#D7F36A] to-[#7865F5] transition-all duration-500 ease-out rounded-full"
                style={{ width: `${activeRoadmap.completionPercent}%` }}
              ></div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#4E4B66] pt-3">
              <div className="flex flex-wrap items-center gap-2">
                {activeRoadmap.stages.map((st, i) => {
                  const doneCount = st.tasks.filter((t) => t.status === 'completed').length;
                  const allDone = st.tasks.length > 0 && doneCount === st.tasks.length;
                  return (
                    <React.Fragment key={st.stageNumber}>
                      {i > 0 && <span>·</span>}
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${
                          allDone ? 'text-[#546500]' : 'text-[#4E4B66]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm">
                          {allDone ? 'check_circle' : 'radio_button_checked'}
                        </span>
                        Stage {st.stageNumber} ({doneCount}/{st.tasks.length})
                      </span>
                    </React.Fragment>
                  );
                })}
              </div>

              {activeView === 'roadmap' && (
                <div className="flex items-center gap-1.5 font-semibold text-[11px]">
                  <a
                    href="#stage1"
                    className="px-2 py-1 rounded hover:bg-[#EEEAFE] text-[#4E4B66] hover:text-[#7865F5]"
                  >
                    Stage 1: Foundations
                  </a>
                  <a
                    href="#stage2"
                    className="px-2 py-1 rounded bg-[#EEEAFE] text-[#7865F5]"
                  >
                    Stage 2: Priority Gaps
                  </a>
                  <a
                    href="#stage3"
                    className="px-2 py-1 rounded hover:bg-[#EEEAFE] text-[#4E4B66] hover:text-[#7865F5]"
                  >
                    Stage 3: Capstone
                  </a>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Primary Segmented Toggle */}
        <div className="flex justify-center -my-1">
          <div
            className="inline-flex items-center p-1.5 rounded-2xl bg-white border border-[#EEEAFE] shadow-sm gap-1.5"
            role="tablist"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeView === 'roadmap'}
              onClick={() => setActiveView('roadmap')}
              className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all cursor-pointer ${
                activeView === 'roadmap'
                  ? 'bg-[#7865F5] text-white shadow-sm'
                  : 'text-[#4E4B66] hover:text-[#7865F5] hover:bg-[#EEEAFE]'
              }`}
            >
              <span className="material-symbols-outlined text-base">route</span>
              <span>Roadmap</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeView === 'resources'}
              onClick={() => setActiveView('resources')}
              className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all cursor-pointer ${
                activeView === 'resources'
                  ? 'bg-[#7865F5] text-white shadow-sm'
                  : 'text-[#4E4B66] hover:text-[#7865F5] hover:bg-[#EEEAFE]'
              }`}
            >
              <span className="material-symbols-outlined text-base">library_books</span>
              <span>Resources</span>
              <span
                className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  activeView === 'resources'
                    ? 'bg-white/20 text-white'
                    : 'bg-[#EEEAFE] text-[#7865F5]'
                }`}
              >
                {allResources.length}
              </span>
            </button>
          </div>
        </div>

        {/* ROADMAP VIEW */}
        {activeView === 'roadmap' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 8 Cols: 3-Stage Vertical Timeline */}
            <div className="lg:col-span-8 flex flex-col gap-8 relative">
              <div className="hidden sm:block absolute left-6 top-10 bottom-12 w-0.5 bg-[#DDD8F6] -z-0">
                <div
                  className="w-full bg-[#7865F5] transition-all duration-700"
                  style={{ height: `${Math.max(12, activeRoadmap.completionPercent)}%` }}
                ></div>
              </div>

              {activeRoadmap.stages.map((stage) => (
                <section
                  key={stage.stageNumber}
                  id={`stage${stage.stageNumber}`}
                  className="relative z-10 flex flex-col gap-4 scroll-mt-24"
                >
                  <div className="flex items-center gap-2.5 ml-1">
                    <span
                      className={`px-2.5 py-1 rounded-md text-xs font-extrabold uppercase tracking-wider font-mono ${
                        stage.stageNumber === 2
                          ? 'bg-[#7865F5] text-white'
                          : stage.stageNumber === 3
                          ? 'bg-[#17152E] text-white'
                          : 'bg-[#EEEAFE] text-[#7865F5]'
                      }`}
                    >
                      Stage {stage.stageNumber}
                    </span>
                    <h2 className="text-base font-extrabold text-[#17152E]">{stage.title}</h2>
                    <span className="text-xs text-[#6E6B87]">({stage.subtitle})</span>
                  </div>

                  {stage.tasks.map((task) => {
                    const isExpanded = expandedTasks[task.id] !== false;
                    const isCompleted = task.status === 'completed';
                    const isInProgress = task.status === 'in_progress';

                    return (
                      <article key={task.id} className="flex items-start gap-3 sm:gap-4">
                        {/* Node Icon */}
                        <div
                          className={`flex-shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center relative ${
                            isCompleted
                              ? 'bg-white border border-[#EEEAFE] text-[#546500] shadow-sm'
                              : isInProgress
                              ? 'bg-[#7865F5] text-white shadow-lg shadow-[#7865F5]/30'
                              : 'bg-white border border-[#EEEAFE] text-[#6E6B87] shadow-sm'
                          }`}
                        >
                          {isCompleted ? (
                            <div className="w-8 h-8 rounded-xl bg-[#D7F36A]/50 flex items-center justify-center">
                              <span className="material-symbols-outlined text-lg font-bold">
                                check
                              </span>
                            </div>
                          ) : isInProgress ? (
                            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                              <span className="material-symbols-outlined text-lg">bolt</span>
                            </div>
                          ) : task.priority === 'capstone' ? (
                            <div className="w-8 h-8 rounded-xl bg-[#EEEAFE] flex items-center justify-center text-[#7865F5]">
                              <span className="material-symbols-outlined text-lg">
                                military_tech
                              </span>
                            </div>
                          ) : (
                            <span className="material-symbols-outlined text-lg">schedule</span>
                          )}
                        </div>

                        {/* Task Card */}
                        <div
                          className={`flex-grow bg-white rounded-2xl p-5 shadow-sm transition-all relative overflow-hidden ${
                            isInProgress
                              ? 'border-2 border-[#7865F5]/60 shadow-md'
                              : 'border border-[#EEEAFE] hover:shadow-md'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <div className="flex flex-wrap items-center gap-2">
                              {isCompleted ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#D7F36A]/60 text-[#17152E] text-[11px] font-bold">
                                  <span className="material-symbols-outlined text-xs text-[#546500]">
                                    verified
                                  </span>
                                  Completed
                                </span>
                              ) : isInProgress ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#D7F36A] text-[#17152E] text-[11px] font-bold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#7865F5] animate-ping"></span>
                                  Active / In Progress
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F4F3F8] text-[#6E6B87] text-[11px] font-bold">
                                  <span className="material-symbols-outlined text-xs">schedule</span>
                                  Upcoming
                                </span>
                              )}

                              <span className="px-2 py-0.5 rounded bg-[#EEEAFE] text-[#7865F5] text-[11px] font-bold font-mono">
                                {task.deltaLabel}
                              </span>
                            </div>

                            <span className="font-mono text-xs text-[#6E6B87]">
                              Task {task.code} · ~{task.estimatedHours}h
                            </span>
                          </div>

                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="text-base font-extrabold text-[#17152E]">
                                {task.code} {task.title}
                              </h3>
                              <p className="text-xs text-[#4E4B66] mt-1 leading-relaxed">
                                {task.description}
                              </p>
                            </div>
                            <button
                              type="button"
                              aria-label="Toggle task details"
                              onClick={() => toggleExpand(task.id)}
                              className="p-1 rounded text-[#6E6B87] hover:text-[#17152E] hover:bg-[#F4F3F8] cursor-pointer"
                            >
                              <span
                                className={`material-symbols-outlined text-lg transition-transform ${
                                  isExpanded ? 'rotate-180' : ''
                                }`}
                              >
                                expand_more
                              </span>
                            </button>
                          </div>

                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t border-[#F4F3F8] space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                <div className="p-2.5 rounded-xl bg-[#FAF9F6] border border-[#EEEAFE]">
                                  <span className="font-bold text-[#17152E] block mb-0.5">
                                    Completion Criteria
                                  </span>
                                  <span className="text-[#4E4B66]">{task.completionCriteria}</span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-[#FAF9F6] border border-[#EEEAFE]">
                                  <span className="font-bold text-[#17152E] block mb-0.5">
                                    Deliverable
                                  </span>
                                  <span className="text-[#4E4B66]">{task.deliverableSummary}</span>
                                </div>
                              </div>

                              {/* Submitted Evidence Block */}
                              {task.evidenceUrl && (
                                <div className="p-2.5 rounded-xl bg-[#D7F36A]/25 border border-[#546500]/20 text-xs flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="material-symbols-outlined text-sm text-[#546500]">
                                      link
                                    </span>
                                    <span className="font-mono text-[#17152E] truncate">
                                      {task.evidenceUrl}
                                    </span>
                                    {task.commitHash && (
                                      <span className="px-1.5 py-0.5 rounded bg-white font-mono text-[10px] text-[#546500]">
                                        #{task.commitHash}
                                      </span>
                                    )}
                                  </div>
                                  {isSafeHttpUrl(task.evidenceUrl) && (
                                    <a
                                      href={task.evidenceUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[#5842D3] font-bold hover:underline flex items-center gap-0.5"
                                    >
                                      Open <span className="material-symbols-outlined text-xs">open_in_new</span>
                                    </a>
                                  )}
                                </div>
                              )}

                              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => toggleStatusAction(task)}
                                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                      isCompleted
                                        ? 'bg-[#D7F36A]/60 text-[#17152E] hover:bg-[#D7F36A]'
                                        : 'bg-[#7865F5] hover:bg-[#6350E6] text-white shadow-xs'
                                    }`}
                                  >
                                    <span className="material-symbols-outlined text-sm">
                                      {isCompleted ? 'task_alt' : 'check_circle'}
                                    </span>
                                    <span>
                                      {isCompleted ? 'Completed (Reopen)' : 'Mark as Complete'}
                                    </span>
                                  </button>

                                  {!isCompleted && !isInProgress && (
                                    <button
                                      type="button"
                                      onClick={() => setTaskStatus(task.id, 'in_progress')}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#EEEAFE] hover:bg-[#E5E1FA] text-[#7865F5] text-xs font-bold cursor-pointer"
                                    >
                                      <span className="material-symbols-outlined text-sm">
                                        play_arrow
                                      </span>
                                      Start Sprint
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => openEvidenceFor(task.id)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#EEEAFE] hover:bg-[#FAF9F6] text-xs font-semibold text-[#4E4B66] cursor-pointer"
                                  >
                                    <span className="material-symbols-outlined text-sm text-[#7865F5]">
                                      attach_file
                                    </span>
                                    {task.evidenceUrl ? 'Update Evidence' : 'Attach Evidence'}
                                  </button>

                                  {task.hasSandbox && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSandboxTask(task);
                                        setSandboxOutput(null);
                                      }}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#17152E] text-[#D7F36A] text-xs font-bold cursor-pointer"
                                    >
                                      <span className="material-symbols-outlined text-sm">
                                        terminal
                                      </span>
                                      Launch Sandbox
                                    </button>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setActiveView('resources')}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#EEEAFE] hover:bg-[#E5E1FA] text-[#7865F5] text-xs font-bold cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-sm">
                                    library_books
                                  </span>
                                  <span>Resources ({task.resources.length}) ↗</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </section>
              ))}
            </div>

            {/* Right 4 Cols: Sticky Sidebar */}
            <aside className="lg:col-span-4 flex flex-col gap-5 sticky top-20">
              {/* Active Learning Sprint Card */}
              {activeSprintTask && (
                <div className="bg-white rounded-2xl p-5 border border-[#EEEAFE] shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#6E6B87] font-mono">
                      Active Learning Sprint
                    </span>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#D7F36A] border-2 border-white ring-1 ring-[#D7F36A]"></span>
                  </div>
                  <h3 className="text-base font-extrabold text-[#17152E]">
                    {activeSprintTask.targetSkillName} Sandbox
                  </h3>
                  <p className="text-xs text-[#4E4B66] mt-1 mb-3">
                    {activeSprintTask.title} — {activeSprintTask.completionCriteria}
                  </p>
                  <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#EEEAFE] font-mono text-[11px] text-[#4E4B66] space-y-1 mb-3">
                    {(
                      activeSprintTask.sandboxSnippet || [
                        `# Target Skill: ${activeSprintTask.targetSkillName}`,
                        `# Deliverable: ${activeSprintTask.deliverableSummary}`,
                        `# Estimated Effort: ~${activeSprintTask.estimatedHours}h`,
                      ]
                    ).map((line, i) => (
                      <div
                        key={i}
                        className={
                          i === 0
                            ? 'text-[#7865F5]'
                            : i === 1
                            ? 'text-[#546500]'
                            : 'text-[#6E6B87]'
                        }
                      >
                        {line}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSandboxTask(activeSprintTask);
                      setSandboxOutput(null);
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#7865F5] hover:bg-[#6350E6] text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">play_circle</span>
                    Launch Code Sandbox
                  </button>
                </div>
              )}

              {/* Target Skill Coverage Connected to Skill Gap Analysis */}
              <div className="bg-white rounded-2xl p-5 border border-[#EEEAFE] shadow-sm">
                <div className="flex items-center justify-between mb-1 gap-2">
                  <h3 className="text-sm font-extrabold text-[#17152E]">Target Skill Coverage</h3>
                  <span className="text-xs font-mono font-bold text-[#7865F5] truncate">
                    {activeCareer.shortTitle}
                  </span>
                </div>
                <p className="text-[11px] text-[#6E6B87] mb-3">
                  Synced directly with Skill Gap Analysis criteria.
                </p>
                <div className="space-y-3">
                  {activeGapAnalysis.items.slice(0, 5).map((item) => {
                    const isMet = item.classification === 'Demonstrated';
                    const isPartial = item.yourScore > 0 && !isMet;
                    return (
                      <div key={item.requirement.id}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-medium text-[#17152E] flex items-center gap-1.5 truncate">
                            <span
                              className={`material-symbols-outlined text-sm ${
                                isMet
                                  ? 'text-[#546500]'
                                  : isPartial
                                  ? 'text-[#7865F5]'
                                  : 'text-[#6E6B87]'
                              }`}
                            >
                              {isMet ? 'check_circle' : isPartial ? 'pending' : 'schedule'}
                            </span>
                            <span className="truncate">{item.requirement.name}</span>
                          </span>
                          <span
                            className={`font-mono text-xs font-bold ${
                              isMet
                                ? 'text-[#546500]'
                                : isPartial
                                ? 'text-[#7865F5]'
                                : 'text-[#6E6B87]'
                            }`}
                          >
                            {item.yourScore}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-[#EEEAFE]">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isMet
                                ? 'bg-[#546500]'
                                : isPartial
                                ? 'bg-[#7865F5]'
                                : 'bg-[#DDD8F6]'
                            }`}
                            style={{ width: `${item.yourScore}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 pt-3 border-t border-[#F4F3F8] flex items-center justify-between text-xs">
                  <span className="text-[#6E6B87]">Skill Coverage: {activeGapAnalysis.skillCoverage}%</span>
                  <span className="font-mono font-bold text-[#7865F5]">
                    Readiness: {activeGapAnalysis.careerReadiness}%
                  </span>
                </div>
              </div>

              {/* Career Mentor Support Widget */}
              <div className="bg-[#FAF9F6] rounded-2xl p-5 border border-[#EEEAFE] flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-[#7865F5] text-white font-bold text-sm flex items-center justify-center ring-2 ring-[#7865F5]/30 flex-shrink-0">
                    PS
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#17152E]">
                      {state.profile.advisorName}
                    </div>
                    <div className="text-[11px] text-[#6E6B87]">
                      {state.profile.advisorTitle}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-[#4E4B66] leading-relaxed italic">
                  &ldquo;Keep logging repository links as you complete Stage 2 priority sprints for{' '}
                  {activeCareer.shortTitle} so we can review them before placement shortlisting.&rdquo;
                </p>
                <button
                  type="button"
                  onClick={() => setAdvisorOpen(true)}
                  className="w-full py-2 rounded-xl bg-white hover:bg-[#EEEAFE] text-[#7865F5] border border-[#EEEAFE] text-xs font-bold transition-colors text-center cursor-pointer"
                >
                  Message Advisor ({state.advisorMessages.length})
                </button>
              </div>

              {/* Recruiter Visibility Multiplier Banner */}
              <div className="rounded-2xl bg-gradient-to-r from-[#17152E] to-[#2B2754] p-4 text-white shadow-md flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-[#D7F36A] flex-shrink-0">
                    <span className="material-symbols-outlined text-xl">trending_up</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-white">
                      Recruiter Visibility Index
                    </h4>
                    <p className="text-[10px] text-white/80">
                      Boosted by verified skills &amp; submitted artifacts
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#D7F36A] text-[#17152E] font-mono text-xs font-bold whitespace-nowrap">
                  Index: {activeRoadmap.recruiterVisibilityIndex} / 100
                </span>
              </div>
            </aside>
          </div>
        ) : (
          /* RESOURCES VIEW */
          <div className="flex flex-col gap-6">
            <section className="bg-white rounded-2xl p-6 sm:p-8 border border-[#EEEAFE] shadow-sm relative overflow-hidden">
              <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-[#D7F36A]/15 blur-3xl pointer-events-none"></div>
              <div className="relative z-10 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEEAFE] text-[#7865F5] text-xs font-bold uppercase tracking-wider mb-2">
                      <span className="material-symbols-outlined text-sm">verified</span>
                      Curated Free-First Learning
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-[#17152E] tracking-tight">
                      Free-First Curated Resource Library
                    </h2>
                    <p className="text-sm text-[#4E4B66] mt-1 max-w-3xl">
                      Official documentation, courses, and practice tracks mapped directly to your {activeCareer.title} roadmap steps.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#D7F36A]/40 text-[#546500] text-xs font-bold font-mono">
                    <span className="material-symbols-outlined text-sm">lock_open</span> Verified Official Docs &amp; Free Tiers
                  </span>
                </div>

                {/* Filter Pills */}
                <div className="pt-3 border-t border-[#F4F3F8] flex flex-wrap items-center gap-2">
                  {(
                    [
                      { key: 'all', label: `All Resources (${allResources.length})` },
                      { key: 'free', label: 'Free Learning' },
                      { key: 'cert', label: 'Free Certificates' },
                      { key: 'video', label: 'Video & Courses' },
                      { key: 'practice', label: 'Practice & Projects' },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setResourceFilter(f.key)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        resourceFilter === f.key
                          ? 'bg-[#7865F5] text-white shadow-sm'
                          : 'bg-[#FAF9F6] border border-[#EEEAFE] text-[#4E4B66] hover:text-[#7865F5] hover:bg-white'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <div className="space-y-6">
              {filteredResourceGroups.map(({ task, items }) => (
                <div
                  key={task.id}
                  className="bg-white rounded-2xl border border-[#EEEAFE] shadow-sm overflow-hidden"
                >
                  <div className="p-5 bg-[#FAF9F6] border-b border-[#EEEAFE] flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-[#D7F36A]/50 text-[#17152E] font-bold text-xs font-mono flex items-center justify-center">
                        {task.code}
                      </span>
                      <div>
                        <h3 className="text-base font-extrabold text-[#17152E]">
                          {task.targetSkillName} — {task.title}
                        </h3>
                        <p className="text-xs text-[#6E6B87]">{task.deliverableSummary}</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-white border border-[#EEEAFE] text-[11px] font-mono text-[#7865F5] font-bold">
                      {items.length} Resource{items.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((res) => (
                      <div
                        key={res.id}
                        className="flex flex-col justify-between p-4 rounded-xl border border-[#EEEAFE] bg-white hover:border-[#7865F5]/40 hover:shadow-md transition-all"
                      >
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-1.5">
                            <span className="px-2 py-0.5 rounded-md bg-[#D7F36A]/40 text-[#546500] font-bold text-[10px] font-mono">
                              Free Tier
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-[#F4F3F8] text-[#4E4B66] text-[10px] font-semibold">
                              {res.type}
                            </span>
                          </div>
                          <h4 className="font-bold text-sm text-[#17152E] leading-snug">
                            {res.title}
                          </h4>
                          <div className="text-[11px] text-[#6E6B87] font-medium">
                            Provider: <span className="text-[#17152E] font-semibold">{res.provider}</span> ·{' '}
                            {res.durationLabel}
                          </div>
                          <p className="text-xs text-[#4E4B66] bg-[#FAF9F6] p-2.5 rounded-lg border border-[#EEEAFE]/60 italic leading-relaxed">
                            {res.whyUseful}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-[#F4F3F8] flex items-center justify-between">
                          <span className="text-[11px] text-[#546500] font-bold flex items-center gap-1 font-mono">
                            <span className="material-symbols-outlined text-xs">check_circle</span>
                            Mapped to Step {task.code}
                          </span>
                          <a
                            href={res.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-bold text-[#7865F5] hover:underline"
                          >
                            Open Resource
                            <span className="material-symbols-outlined text-xs">open_in_new</span>
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Attach Evidence Modal */}
      {evidenceTaskId && (
        <div
          className="fixed inset-0 z-50 bg-[#17152E]/45 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setEvidenceTaskId(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white border border-[#EEEAFE] shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#F4F3F8]">
              <h3 className="text-lg font-extrabold text-[#17152E]">Attach Learning Evidence</h3>
              <button
                type="button"
                onClick={() => setEvidenceTaskId(null)}
                className="p-1 text-[#6E6B87] hover:text-[#17152E]"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
            <form onSubmit={handleEvidenceSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-[#4E4B66] block mb-1">Roadmap Milestone</label>
                <select
                  value={evidenceTaskId}
                  onChange={(e) => setEvidenceTaskId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#FAF9F6] border border-[#EEEAFE] text-[#17152E]"
                >
                  {activeRoadmap.allTasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.code} — {t.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-semibold text-[#4E4B66] block mb-1">
                  Repository / Portfolio / Certificate URL
                </label>
                <input
                  type="url"
                  required
                  value={evidenceUrl}
                  onChange={(e) => {
                    setEvidenceUrl(e.target.value);
                    if (evidenceError) setEvidenceError(null);
                  }}
                  placeholder="https://github.com/username/project"
                  className="w-full p-2.5 rounded-xl bg-[#FAF9F6] border border-[#EEEAFE] text-[#17152E]"
                />
                {evidenceError && (
                  <p className="mt-1 text-[11px] font-semibold text-[#BA1A1A]">{evidenceError}</p>
                )}
              </div>
              <div>
                <label className="font-semibold text-[#4E4B66] block mb-1">
                  Commit Hash or Credential ID (Optional)
                </label>
                <input
                  type="text"
                  value={evidenceCommit}
                  onChange={(e) => setEvidenceCommit(e.target.value)}
                  placeholder="e.g. a1b2c3d"
                  className="w-full p-2.5 rounded-xl bg-[#FAF9F6] border border-[#EEEAFE] text-[#17152E]"
                />
              </div>
              <div>
                <label className="font-semibold text-[#4E4B66] block mb-1">
                  Reflection / Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={evidenceNotes}
                  onChange={(e) => setEvidenceNotes(e.target.value)}
                  placeholder="Key takeaways or test coverage achieved..."
                  className="w-full p-2.5 rounded-xl bg-[#FAF9F6] border border-[#EEEAFE] text-[#17152E]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEvidenceTaskId(null)}
                  className="px-4 py-2 rounded-xl bg-[#F4F3F8] text-[#4E4B66] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#7865F5] text-white font-bold hover:bg-[#6350E6]"
                >
                  Save Evidence
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Code Sandbox Modal */}
      {sandboxTask && (
        <div
          className="fixed inset-0 z-50 bg-[#17152E]/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSandboxTask(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-[#17152E] text-white border border-[#7865F5]/40 shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#D7F36A]">terminal</span>
                <h3 className="text-sm font-extrabold">
                  Practice Sandbox · {sandboxTask.targetSkillName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSandboxTask(null)}
                className="p-1 text-white/70 hover:text-white"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-black/35 border border-white/10 font-mono text-xs space-y-1">
              {(
                sandboxTask.sandboxSnippet || [
                  `# Practice exercise for ${sandboxTask.targetSkillName}`,
                  `# Goal: ${sandboxTask.completionCriteria}`,
                ]
              ).map((line, i) => (
                <div key={i} className="text-[#D7F36A]">
                  {line}
                </div>
              ))}
            </div>

            {sandboxOutput && (
              <pre className="p-3.5 rounded-xl bg-black/50 border border-[#D7F36A]/30 font-mono text-[11px] text-[#D7F36A] whitespace-pre-wrap">
                {sandboxOutput}
              </pre>
            )}

            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-[11px] text-white/60">
                Simulated practice runner (MVP demo sandbox)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRunSandbox}
                  className="px-4 py-2 rounded-xl bg-[#D7F36A] text-[#17152E] text-xs font-extrabold hover:opacity-90 cursor-pointer"
                >
                  Run Verification Check
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {shareOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#17152E]/45 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShareOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white border border-[#EEEAFE] shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#F4F3F8]">
              <h3 className="text-base font-extrabold text-[#17152E]">Share Roadmap Snapshot</h3>
              <button
                type="button"
                onClick={() => setShareOpen(false)}
                className="p-1 text-[#6E6B87] hover:text-[#17152E]"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
            <pre className="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#EEEAFE] font-mono text-xs text-[#17152E] whitespace-pre-wrap">
              {shareSummaryText}
            </pre>
            <div className="flex items-center justify-between gap-2">
              {shareCopyStatus === 'fallback' ? (
                <span className="text-[11px] font-semibold text-[#7A5A00]">
                  Clipboard blocked — select and copy text above.
                </span>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={handleCopyShare}
                className="px-4 py-2 rounded-xl bg-[#7865F5] text-white text-xs font-bold hover:bg-[#6350E6] cursor-pointer"
              >
                {shareCopyStatus === 'copied' ? 'Copied to Clipboard ✓' : 'Copy Summary'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Advisor Modal */}
      {advisorOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#17152E]/45 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setAdvisorOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white border border-[#EEEAFE] shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#F4F3F8]">
              <div>
                <h3 className="text-base font-extrabold text-[#17152E]">
                  Message {state.profile.advisorName}
                </h3>
                <p className="text-[11px] text-[#6E6B87]">{state.profile.advisorTitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setAdvisorOpen(false)}
                className="p-1 text-[#6E6B87] hover:text-[#17152E]"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {state.advisorMessages.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {state.advisorMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="p-2.5 rounded-xl bg-[#F4F3F8] text-xs text-[#17152E]"
                  >
                    <p>{msg.text}</p>
                    <span className="text-[10px] font-mono text-[#6E6B87] block mt-1">
                      Sent · {new Date(msg.sentAt).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!advisorDraft.trim()) return;
                sendAdvisorMessage(advisorDraft);
                setAdvisorDraft('');
              }}
              className="space-y-3"
            >
              <textarea
                rows={3}
                required
                value={advisorDraft}
                onChange={(e) => setAdvisorDraft(e.target.value)}
                placeholder={`Ask ${state.profile.advisorName} for feedback on your ${activeCareer.shortTitle} roadmap...`}
                className="w-full p-2.5 rounded-xl bg-[#FAF9F6] border border-[#EEEAFE] text-xs text-[#17152E]"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAdvisorOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#F4F3F8] text-[#4E4B66] text-xs font-semibold"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#7865F5] text-white text-xs font-bold hover:bg-[#6350E6]"
                >
                  Send Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
