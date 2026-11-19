import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStudent } from '../context/StudentContext';
import type { SkillCategory, SkillStatus, StudentSkill } from '../types/skillbridge';

const CATEGORY_ORDER: Array<{
  category: SkillCategory;
  icon: string;
}> = [
  { category: 'Programming & Frameworks', icon: 'code' },
  { category: 'Data, Databases & Storage', icon: 'database' },
  { category: 'Testing & Automation', icon: 'bug_report' },
  { category: 'DevOps & Cloud Tools', icon: 'cloud_sync' },
  { category: 'Other Relevant Skills', icon: 'category' },
];

function statusBadgeStyle(status: SkillStatus) {
  if (status === 'Demonstrated') {
    return 'bg-[#D3EF66]/60 text-[#3F4C00] border-[#546500]/20';
  }
  if (status === 'Developing') {
    return 'bg-[#E5DEFF] text-[#4226BD] border-[#5842D3]/20';
  }
  return 'bg-[#EAE5FF] text-[#5C5A6B] border-[#C9C4D7]/40';
}

function statusIcon(status: SkillStatus) {
  if (status === 'Demonstrated') return { icon: 'check_circle', color: 'text-[#546500]' };
  if (status === 'Developing') return { icon: 'timelapse', color: 'text-[#5842D3]' };
  return { icon: 'help_outline', color: 'text-[#5C5A6B]' };
}

export const MySkillsPage: React.FC = () => {
  const {
    state,
    addSkill,
    updateSkill,
    deleteSkill,
    lockSkill,
    reportIncorrectSkill,
  } = useStudent();
  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState<'All' | SkillStatus>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkillId, setSelectedSkillId] = useState<string>(state.skills[0]?.id ?? '');
  const [openCategories, setOpenCategories] = useState<Record<SkillCategory, boolean>>({
    'Programming & Frameworks': true,
    'Data, Databases & Storage': true,
    'Testing & Automation': true,
    'DevOps & Cloud Tools': false,
    'Other Relevant Skills': false,
  });

  // Add Custom Skill modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<SkillCategory>('Programming & Frameworks');
  const [newStatus, setNewStatus] = useState<SkillStatus>('Developing');
  const [newEvidence, setNewEvidence] = useState('');

  // Edit Proficiency state inside Inspector
  const [editingSkill, setEditingSkill] = useState(false);
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState<SkillStatus>('Developing');
  const [editConfidence, setEditConfidence] = useState(70);
  const [editCategory, setEditCategory] = useState<SkillCategory>('Programming & Frameworks');
  const [editExcerpt, setEditExcerpt] = useState('');
  const [editCoursework, setEditCoursework] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);
  const noticeTimerRef = useRef<number | null>(null);

  const counts = useMemo(() => {
    const demonstrated = state.skills.filter((s) => s.status === 'Demonstrated').length;
    const developing = state.skills.filter((s) => s.status === 'Developing').length;
    const unverified = state.skills.filter((s) => s.status === 'Unverified').length;
    return {
      all: state.skills.length,
      demonstrated,
      developing,
      unverified,
    };
  }, [state.skills]);

  const filteredSkills = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return state.skills.filter((skill) => {
      if (statusFilter !== 'All' && skill.status !== statusFilter) return false;
      if (q) {
        const matches =
          skill.name.toLowerCase().includes(q) ||
          skill.category.toLowerCase().includes(q) ||
          skill.resumeExcerpt.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [state.skills, statusFilter, searchQuery]);

  const strongestSkills = useMemo(() => {
    return [...state.skills]
      .sort((a, b) => {
        const flaggedDiff = Number(Boolean(a.flaggedIncorrect)) - Number(Boolean(b.flaggedIncorrect));
        if (flaggedDiff !== 0) return flaggedDiff;
        const statusRank = (s: SkillStatus) =>
          s === 'Demonstrated' ? 3 : s === 'Developing' ? 2 : 1;
        return statusRank(b.status) - statusRank(a.status) || b.confidence - a.confidence;
      })
      .slice(0, 4);
  }, [state.skills]);

  const activeSkill: StudentSkill | null = useMemo(() => {
    return (
      state.skills.find((s) => s.id === selectedSkillId) ||
      filteredSkills[0] ||
      state.skills[0] ||
      null
    );
  }, [state.skills, filteredSkills, selectedSkillId]);

  useEffect(() => {
    if (activeSkill) {
      setEditName(activeSkill.name);
      setEditStatus(activeSkill.status);
      setEditConfidence(activeSkill.confidence);
      setEditCategory(activeSkill.category);
      setEditExcerpt(activeSkill.resumeExcerpt);
      setEditCoursework(activeSkill.courseworkEvidence);
    }
  }, [
    activeSkill?.id,
    activeSkill?.name,
    activeSkill?.status,
    activeSkill?.confidence,
    activeSkill?.category,
    activeSkill?.resumeExcerpt,
    activeSkill?.courseworkEvidence,
  ]);

  useEffect(() => {
    setEditingSkill(false);
    setConfirmDeleteId(null);
  }, [activeSkill?.id]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAddModalOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    };
  }, []);

  const activeDomainCount = useMemo(() => {
    return CATEGORY_ORDER.filter((c) =>
      state.skills.some((s) => s.category === c.category)
    ).length;
  }, [state.skills]);

  const showNotice = (msg: string) => {
    setFeedbackBanner(msg);
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setFeedbackBanner(null), 3200);
  };

  const handleSaveNewSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const created = addSkill({
      name: newName,
      category: newCategory,
      status: newStatus,
      confidence: newStatus === 'Demonstrated' ? 84 : newStatus === 'Developing' ? 62 : 42,
      evidence: newEvidence,
      source: 'Manual Entry',
    });
    setOpenCategories((prev) => ({ ...prev, [newCategory]: true }));
    setSelectedSkillId(created.id);
    setNewName('');
    setNewEvidence('');
    setAddModalOpen(false);
    showNotice(`Added "${created.name}" to ${created.category}.`);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSkill) return;
    const trimmedName = editName.trim() || activeSkill.name;
    updateSkill(activeSkill.id, {
      name: trimmedName,
      status: editStatus,
      confidence: Number(editConfidence),
      category: editCategory,
      resumeExcerpt: editExcerpt,
      courseworkEvidence: editCoursework,
    });
    setOpenCategories((prev) => ({ ...prev, [editCategory]: true }));
    setEditingSkill(false);
    showNotice(`Updated proficiency & evidence for "${trimmedName}".`);
  };

  const handleDelete = (skill: StudentSkill) => {
    deleteSkill(skill.id);
    setConfirmDeleteId(null);
    showNotice(`Removed "${skill.name}" from your skill profile.`);
  };

  return (
    <div className="bg-[#FAF9F6] w-full pt-6 pb-14 flex-grow">
      <div className="max-w-[1440px] mx-auto w-full px-4 sm:px-6 lg:px-10 flex flex-col gap-6">
        {/* Live Telemetry Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-xl shadow-xs border border-[#C9C4D7]/40">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-2.5 h-2.5 rounded-full bg-[#546500] animate-pulse"></div>
            <span className="text-xs text-[#5C5A6B]">Live Telemetry:</span>
            <span className="font-mono text-xs font-semibold text-[#1A1832] bg-[#F0EBFF] px-2.5 py-0.5 rounded-lg">
              {state.resumeMetadata.fileName}
            </span>
            <span className="text-xs text-[#5C5A6B]">· {state.resumeMetadata.uploadedAt}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => navigate('/upload-resume')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F0EBFF] text-[#474554] hover:text-[#5842D3] hover:bg-[#EAE5FF] transition-colors text-xs font-medium cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">sync</span>
              <span>Re-scan Resume</span>
            </button>
            <button
              type="button"
              onClick={() => setAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#5842D3] text-white hover:bg-[#715EEE] shadow-xs transition-all text-xs font-semibold cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Add Custom Skill</span>
            </button>
          </div>
        </div>

        {feedbackBanner && (
          <div className="p-3 rounded-xl bg-[#D3EF66]/60 border border-[#546500]/25 text-xs font-semibold text-[#181E00] flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-[#546500]">check_circle</span>
            <span>{feedbackBanner}</span>
          </div>
        )}

        {/* Extracted Skill Profile Card */}
        <div className="bg-white p-6 md:p-8 rounded-xl shadow-xs border border-[#C9C4D7]/40 flex flex-col gap-5">
          <div className="flex flex-col gap-1.5 max-w-3xl">
            <div className="inline-flex items-center gap-1.5 text-[11px] tracking-wider uppercase text-[#5842D3] font-bold">
              <span className="material-symbols-outlined text-sm">fact_check</span>
              <span>Extracted Skill Profile</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-[#1A1832] tracking-tight">
              Here&apos;s what you&apos;ve got.
            </h1>
            <p className="text-sm md:text-base text-[#5C5A6B]">
              Explore the skills identified from your resume, coursework, and projects. Review the evidence and make corrections whenever needed.
            </p>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-3 border-t border-[#C9C4D7]/30">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="uppercase tracking-wider text-[#5C5A6B] font-bold text-[11px]">
                Filter Profile:
              </span>
              <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[#F0EBFF]">
                {(
                  [
                    { key: 'All', label: `All (${counts.all})`, dot: null },
                    { key: 'Demonstrated', label: `Demonstrated (${counts.demonstrated})`, dot: 'bg-[#546500]' },
                    { key: 'Developing', label: `Developing (${counts.developing})`, dot: 'bg-[#5842D3]' },
                    { key: 'Unverified', label: `Unverified (${counts.unverified})`, dot: 'bg-[#5C5A6B]' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setStatusFilter(tab.key)}
                    className={`px-3 py-1 rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                      statusFilter === tab.key
                        ? 'bg-white text-[#5842D3] font-bold shadow-xs'
                        : 'text-[#474554] hover:text-[#1A1832] hover:bg-white/60 font-medium'
                    }`}
                  >
                    {tab.dot && <span className={`w-2 h-2 rounded-full ${tab.dot}`}></span>}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <span className="material-symbols-outlined text-base text-[#5C5A6B] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search skills or evidence..."
                  className="pl-8 pr-3 py-1.5 rounded-lg bg-[#F6F1FF] border border-[#C9C4D7]/40 text-xs text-[#1A1832] focus:outline-none focus:border-[#5842D3]"
                />
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-[#5C5A6B] bg-[#F6F1FF] px-3 py-1.5 rounded-lg border border-[#C9C4D7]/20">
                <span className="material-symbols-outlined text-sm text-[#5842D3]">account_tree</span>
                <span>
                  {activeDomainCount} Domains · {counts.all} Total Skills
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-lg bg-[#F0EBFF] text-[#5C5A6B] text-xs">
            <span className="material-symbols-outlined text-base text-[#5842D3]">info</span>
            <span>
              {state.resumeMetadata.hasCustomUpload
                ? state.resumeMetadata.notice
                : 'Resume extraction alone does not verify mastery. Highlighted items reflect corroborated signals from Apex coursework and GitHub projects.'}
            </span>
          </div>
        </div>

        {/* Your Strongest Skills */}
        <div className="bg-white p-6 md:p-8 rounded-xl shadow-xs border border-[#C9C4D7]/40 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#D3EF66]/60 text-[#546500] flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-xl">workspace_premium</span>
              </div>
              <div>
                <h2 className="text-lg md:text-xl font-bold text-[#1A1832]">Your Strongest Skills</h2>
                <p className="text-xs text-[#5C5A6B]">
                  High-fidelity skills prioritized by proficiency status and confidence telemetry.
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D3EF66]/50 text-[#3F4C00] text-xs font-bold w-fit border border-[#546500]/20">
              <span className="material-symbols-outlined text-sm">verified</span>
              {state.resumeMetadata.hasCustomUpload ? 'Resume & Profile Signals' : 'Dual-source Authenticated'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {strongestSkills.map((skill) => (
              <button
                key={skill.id}
                type="button"
                onClick={() => {
                  setSelectedSkillId(skill.id);
                  setOpenCategories((prev) => ({ ...prev, [skill.category]: true }));
                }}
                className="text-left p-4 rounded-xl bg-[#F6F1FF] hover:bg-[#F0EBFF] transition-all border border-[#546500]/25 flex flex-col justify-between gap-3 shadow-xs cursor-pointer"
              >
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[#5842D3] shadow-xs">
                      <span className="material-symbols-outlined text-base">terminal</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-[#D3EF66] text-[#3F4C00] font-mono text-[11px] font-bold">
                      {skill.confidence}% Conf.
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-[#1A1832] mt-1">{skill.name}</h3>
                  <p className="text-xs text-[#5C5A6B] line-clamp-2">{skill.courseworkEvidence}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="w-full bg-[#E4DFFF] h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#546500] h-2 rounded-full transition-all"
                      style={{ width: `${skill.confidence}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#5C5A6B]">
                    <span>{skill.source}</span>
                    <span className="font-bold text-[#546500]">{skill.status}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 2-Column Main Skill Accordions + Evidence Inspector */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: 5 Category Accordions */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {CATEGORY_ORDER.map(({ category, icon }) => {
              const items = filteredSkills.filter((s) => s.category === category);
              const allInCat = state.skills.filter((s) => s.category === category);
              const isOpen = openCategories[category] || searchQuery.trim().length > 0;
              const demCount = allInCat.filter((s) => s.status === 'Demonstrated').length;
              const devCount = allInCat.filter((s) => s.status === 'Developing').length;
              const unvCount = allInCat.filter((s) => s.status === 'Unverified').length;

              return (
                <div
                  key={category}
                  className="bg-white rounded-xl p-5 sm:p-6 shadow-xs border border-[#C9C4D7]/40 transition-all"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setOpenCategories((prev) => ({ ...prev, [category]: !prev[category] }))
                    }
                    className="w-full flex items-center justify-between text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#F6F1FF] flex items-center justify-center text-[#5842D3]">
                        <span className="material-symbols-outlined text-2xl">{icon}</span>
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg text-[#1A1832] font-bold">{category}</h3>
                        <span className="text-xs text-[#5C5A6B]">
                          {demCount} Demonstrated · {devCount} Developing · {unvCount} Unverified
                        </span>
                      </div>
                    </div>
                    <span
                      className={`material-symbols-outlined text-[#5C5A6B] transition-transform duration-200 ${
                        isOpen ? '' : 'rotate-180'
                      }`}
                    >
                      expand_less
                    </span>
                  </button>

                  {isOpen && (
                    <div className="mt-4 pt-4 flex flex-col gap-2 border-t border-[#F0EBFF]">
                      {items.length === 0 ? (
                        <p className="text-xs text-[#5C5A6B] py-2">
                          No skills match your active filter in this category.
                        </p>
                      ) : (
                        items.map((skill) => {
                          const isSelected = activeSkill?.id === skill.id;
                          const stIcon = statusIcon(skill.status);
                          return (
                            <button
                              key={skill.id}
                              type="button"
                              onClick={() => setSelectedSkillId(skill.id)}
                              className={`w-full text-left p-3 rounded-xl cursor-pointer transition-all flex items-center justify-between gap-3 ${
                                isSelected
                                  ? 'bg-[#F6F1FF] ring-2 ring-[#5842D3]/40 border border-[#5842D3]/30 shadow-xs'
                                  : 'bg-white hover:bg-[#F6F1FF] border border-[#C9C4D7]/25'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span
                                  className={`material-symbols-outlined text-lg ${stIcon.color}`}
                                >
                                  {stIcon.icon}
                                </span>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-bold text-[#1A1832]">
                                      {skill.name}
                                    </span>
                                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#D3EF66]/60 text-[#3F4C00] font-semibold">
                                      {skill.confidence}% Conf.
                                    </span>
                                    {skill.locked && (
                                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#546500]">
                                        <span className="material-symbols-outlined text-xs">
                                          lock
                                        </span>
                                        Locked
                                      </span>
                                    )}
                                    {skill.flaggedIncorrect && (
                                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#BA1A1A]">
                                        <span className="material-symbols-outlined text-xs">
                                          flag
                                        </span>
                                        Flagged
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-[#5C5A6B] truncate">
                                    {skill.resumeExcerpt}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusBadgeStyle(
                                    skill.status
                                  )}`}
                                >
                                  {skill.status}
                                </span>
                                <span className="material-symbols-outlined text-[#5842D3] text-base">
                                  chevron_right
                                </span>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right Column: Sticky Evidence Inspector */}
          <div className="lg:col-span-5 sticky top-24 bg-white rounded-xl p-6 shadow-xs border border-[#C9C4D7]/40 flex flex-col gap-4">
            {activeSkill ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[#5842D3] text-xl">
                      biotech
                    </span>
                    <span className="text-[11px] uppercase tracking-wider text-[#5842D3] font-bold">
                      Evidence Inspector
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusBadgeStyle(
                      activeSkill.status
                    )}`}
                  >
                    {activeSkill.status}
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <div>
                    <h3 className="text-xl font-bold text-[#1A1832]">{activeSkill.name}</h3>
                    <span className="text-xs text-[#5C5A6B]">
                      Category: {activeSkill.category} · Source: {activeSkill.source}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] uppercase text-[#5C5A6B] font-semibold">
                        Confidence Score:
                      </span>
                      <span className="font-mono text-xs font-bold text-[#546500]">
                        {activeSkill.confidence}% (
                        {activeSkill.confidence >= 80
                          ? 'High Reliability'
                          : activeSkill.confidence >= 60
                          ? 'Moderate Signal'
                          : 'Needs Verification'}
                        )
                      </span>
                    </div>
                    <span className="text-[10px] text-[#5C5A6B]">
                      {activeSkill.locked ? 'Student-locked' : 'Editable'}
                    </span>
                  </div>
                  <div className="w-full bg-[#E4DFFF] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#546500] h-1.5 rounded-full transition-all"
                      style={{ width: `${activeSkill.confidence}%` }}
                    ></div>
                  </div>
                </div>

                {activeSkill.flaggedIncorrect && (
                  <div className="p-3 rounded-xl bg-[#FFDAD6]/50 border border-[#BA1A1A]/30 text-xs text-[#93000A] flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">flag</span>
                    <span>
                      Flagged as incorrectly extracted. Edit proficiency or remove this skill below.
                    </span>
                  </div>
                )}

                {!editingSkill ? (
                  <>
                    <div className="flex flex-col gap-2.5">
                      <div className="p-3.5 rounded-xl bg-[#F6F1FF] border border-[#C9C4D7]/25 flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-[11px] text-[#5842D3] font-bold uppercase">
                          <span className="material-symbols-outlined text-sm">description</span>
                          <span>Extracted Resume Excerpt</span>
                        </div>
                        <p className="text-xs text-[#1A1832] italic leading-relaxed">
                          &ldquo;{activeSkill.resumeExcerpt}&rdquo;
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-[#F6F1FF] border border-[#C9C4D7]/25 flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-[11px] text-[#546500] font-bold uppercase">
                          <span className="material-symbols-outlined text-sm">school</span>
                          <span>Coursework &amp; Project Evidence</span>
                        </div>
                        <p className="text-xs text-[#1A1832] leading-relaxed">
                          {activeSkill.courseworkEvidence}
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-[#F6F1FF] border border-[#C9C4D7]/25 flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-[11px] text-[#5C5A6B] font-bold uppercase">
                          <span className="material-symbols-outlined text-sm">help</span>
                          <span>Why It Was Identified</span>
                        </div>
                        <p className="text-xs text-[#474554] leading-relaxed">
                          {activeSkill.identifiedReason}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 pt-2 border-t border-[#F0EBFF]">
                      <button
                        type="button"
                        onClick={() => {
                          lockSkill(activeSkill.id);
                          showNotice(`Locked & confirmed "${activeSkill.name}".`);
                        }}
                        className="w-full py-2.5 px-4 rounded-xl bg-[#5842D3] hover:bg-[#715EEE] text-white text-sm font-semibold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-base">verified_user</span>
                        <span>
                          {activeSkill.locked ? 'Skill Level Locked ✓' : 'Confirm Skill & Lock Level'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditingSkill(true)}
                        className="w-full py-2 px-4 rounded-xl bg-[#F0EBFF] hover:bg-[#EAE5FF] text-[#1A1832] text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-base">edit</span>
                        <span>Edit Proficiency</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            reportIncorrectSkill(activeSkill.id);
                            showNotice(
                              activeSkill.flaggedIncorrect
                                ? `Cleared extraction flag on "${activeSkill.name}".`
                                : `Reported "${activeSkill.name}" as needing correction.`
                            );
                          }}
                          className="flex-1 py-1.5 px-3 rounded-xl text-[#5C5A6B] hover:text-[#BA1A1A] hover:bg-[#FFDAD6]/40 text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">flag</span>
                          <span>
                            {activeSkill.flaggedIncorrect
                              ? 'Clear Extraction Flag'
                              : 'Report Incorrect Extraction'}
                          </span>
                        </button>

                        {confirmDeleteId !== activeSkill.id ? (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(activeSkill.id)}
                            className="py-1.5 px-3 rounded-xl text-[#5C5A6B] hover:text-[#BA1A1A] hover:bg-[#FFDAD6]/40 text-xs transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                            <span>Remove</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleDelete(activeSkill)}
                            className="py-1.5 px-3 rounded-xl bg-[#BA1A1A] text-white text-xs font-bold cursor-pointer"
                          >
                            Confirm Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <form onSubmit={handleSaveEdit} className="space-y-3 pt-2 border-t border-[#F0EBFF]">
                    <div>
                      <label className="text-xs font-semibold text-[#474554] block mb-1">
                        Skill Name
                      </label>
                      <input
                        type="text"
                        required
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full p-2 rounded-lg bg-[#F6F1FF] border border-[#C9C4D7] text-xs text-[#1A1832]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[#474554] block mb-1">
                        Proficiency Status
                      </label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value as SkillStatus)}
                        className="w-full p-2 rounded-lg bg-[#F6F1FF] border border-[#C9C4D7] text-xs text-[#1A1832]"
                      >
                        <option value="Demonstrated">Demonstrated</option>
                        <option value="Developing">Developing</option>
                        <option value="Unverified">Unverified</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[#474554] block mb-1">
                        Category
                      </label>
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value as SkillCategory)}
                        className="w-full p-2 rounded-lg bg-[#F6F1FF] border border-[#C9C4D7] text-xs text-[#1A1832]"
                      >
                        {CATEGORY_ORDER.map((c) => (
                          <option key={c.category} value={c.category}>
                            {c.category}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[#474554] block mb-1">
                        Confidence Score ({editConfidence}%)
                      </label>
                      <input
                        type="range"
                        min={15}
                        max={100}
                        value={editConfidence}
                        onChange={(e) => setEditConfidence(Number(e.target.value))}
                        className="w-full accent-[#5842D3]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[#474554] block mb-1">
                        Supporting Evidence Excerpt
                      </label>
                      <textarea
                        rows={2}
                        value={editExcerpt}
                        onChange={(e) => setEditExcerpt(e.target.value)}
                        className="w-full p-2 rounded-lg bg-[#F6F1FF] border border-[#C9C4D7] text-xs text-[#1A1832]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[#474554] block mb-1">
                        Coursework &amp; Project Evidence
                      </label>
                      <textarea
                        rows={2}
                        value={editCoursework}
                        onChange={(e) => setEditCoursework(e.target.value)}
                        className="w-full p-2 rounded-lg bg-[#F6F1FF] border border-[#C9C4D7] text-xs text-[#1A1832]"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingSkill(false)}
                        className="px-3 py-1.5 rounded-lg bg-[#F0EBFF] text-xs font-semibold text-[#1A1832]"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-lg bg-[#5842D3] text-white text-xs font-bold"
                      >
                        Save Changes
                      </button>
                    </div>
                  </form>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-xs text-[#5C5A6B]">
                No skills in profile yet. Add a custom skill or upload a resume to begin.
              </div>
            )}
          </div>
        </div>

        {/* Bottom Dark Banner CTA */}
        <div className="w-full rounded-xl bg-[#1A1832] text-white p-6 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#D3EF66] text-[#181E00] flex items-center justify-center flex-shrink-0 font-bold">
              <span className="material-symbols-outlined text-2xl">rocket_launch</span>
            </div>
            <div className="flex flex-col">
              <h4 className="text-lg md:text-xl text-white font-bold">
                Ready to see where your skills can take you?
              </h4>
              <span className="text-xs sm:text-sm text-[#C9C4D7]">
                Compare your {counts.all} profile skills with real-time campus placement profiles.
              </span>
            </div>
          </div>
          <Link
            to="/explore-careers"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#D3EF66] hover:bg-[#B7D24D] text-[#181E00] text-sm font-bold shadow-sm transition-all"
          >
            <span>Explore My Career Matches</span>
            <span className="material-symbols-outlined text-lg font-bold">arrow_forward</span>
          </Link>
        </div>
      </div>

      {/* Add Custom Skill Modal */}
      {addModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setAddModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#C9C4D7]/40 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#F0EBFF]">
              <h3 className="text-lg font-bold text-[#1A1832]">Add Custom Skill</h3>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="p-1 text-[#5C5A6B] hover:text-[#1A1832]"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>
            <form onSubmit={handleSaveNewSkill} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-[#474554] block mb-1">
                  Skill Name
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Kubernetes, Redis, PyTorch, Playwright"
                  className="w-full p-2.5 rounded-lg bg-[#F6F1FF] border border-[#C9C4D7] text-[#1A1832] text-sm focus:ring-1 focus:ring-[#5842D3] focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#474554] block mb-1">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as SkillCategory)}
                    className="w-full p-2.5 rounded-lg bg-[#F6F1FF] border border-[#C9C4D7] text-[#1A1832] text-xs focus:ring-1 focus:ring-[#5842D3] focus:outline-none"
                  >
                    {CATEGORY_ORDER.map((c) => (
                      <option key={c.category} value={c.category}>
                        {c.category}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#474554] block mb-1">
                    Initial Level
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as SkillStatus)}
                    className="w-full p-2.5 rounded-lg bg-[#F6F1FF] border border-[#C9C4D7] text-[#1A1832] text-xs focus:ring-1 focus:ring-[#5842D3] focus:outline-none"
                  >
                    <option value="Demonstrated">Demonstrated</option>
                    <option value="Developing">Developing</option>
                    <option value="Unverified">Unverified</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#474554] block mb-1">
                  Optional Evidence / Project Note
                </label>
                <textarea
                  rows={2}
                  value={newEvidence}
                  onChange={(e) => setNewEvidence(e.target.value)}
                  placeholder="Mention a repo, capstone, or personal project..."
                  className="w-full p-2.5 rounded-lg bg-[#F6F1FF] border border-[#C9C4D7] text-[#1A1832] text-sm focus:ring-1 focus:ring-[#5842D3] focus:outline-none"
                />
              </div>
              <div className="p-2.5 rounded-lg bg-[#F6F1FF] text-[#5C5A6B] text-xs flex gap-2">
                <span className="material-symbols-outlined text-sm text-[#5842D3] flex-shrink-0">
                  info
                </span>
                <span>
                  Newly added skills update your Career Discovery and Skill Gap Analysis immediately.
                </span>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#F0EBFF] text-[#1A1832] text-xs font-semibold hover:bg-[#EAE5FF]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#5842D3] text-white text-xs font-bold hover:bg-[#715EEE] shadow-xs"
                >
                  Save Skill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
