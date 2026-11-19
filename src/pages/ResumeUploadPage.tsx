import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CAREER_CATALOG, getCareerById } from '../data/careers';
import { useStudent } from '../context/StudentContext';
import {
  ResumeUploadError,
  type ResumeUploadErrorKind,
  uploadResumeForParsing,
} from '../services/resumeApi';
import type { ExtractedResumeReviewData, SkillCategory } from '../types/skillbridge';

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.txt'];
const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15 MB

const POPULAR_PATHWAY_IDS = [
  'qa-automation',
  'python-backend',
  'data-analyst',
  'ai-engineer',
  'fullstack-dev',
  'cloud-devops',
];

const CATEGORIES: SkillCategory[] = [
  'Programming & Frameworks',
  'Data, Databases & Storage',
  'Testing & Automation',
  'DevOps & Cloud Tools',
  'Other Relevant Skills',
];

interface EditableCandidate {
  id: string;
  name: string;
  category: SkillCategory;
  confidence: number;
  evidenceExcerpt: string;
  bucket: string;
  selected: boolean;
}

export const ResumeUploadPage: React.FC = () => {
  const { state, activeCareer, applyExtractedResume, setTargetCareer } = useStudent();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const uploadSeqRef = useRef(0);
  const activeUploadAbortRef = useRef<AbortController | null>(null);

  // Selected / Staged file state
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [stagedRemoved, setStagedRemoved] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Parsing state
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<{
    title: string;
    message: string;
    kind?: ResumeUploadErrorKind;
  } | null>(null);
  const [reviewData, setReviewData] = useState<ExtractedResumeReviewData | null>(null);
  const [candidates, setCandidates] = useState<EditableCandidate[]>([]);
  const [editedEducation, setEditedEducation] = useState<string[]>([]);
  const [editedCertifications, setEditedCertifications] = useState<string[]>([]);
  const [editedProjects, setEditedProjects] = useState<string[]>([]);
  const [editedExperience, setEditedExperience] = useState<string[]>([]);
  const [newEduOrCertDraft, setNewEduOrCertDraft] = useState('');
  const [newEduOrCertKind, setNewEduOrCertKind] = useState<'education' | 'certifications'>('education');
  const [newProjOrExpDraft, setNewProjOrExpDraft] = useState('');
  const [newProjOrExpKind, setNewProjOrExpKind] = useState<'projects' | 'experience'>('projects');

  const [mergeMode, setMergeMode] = useState<'merge' | 'replace'>('replace');
  const [appliedBanner, setAppliedBanner] = useState<string | null>(null);
  const [showTextPreview, setShowTextPreview] = useState(false);

  // Missed skill quick add inside review panel
  const [missedSkillName, setMissedSkillName] = useState('');
  const [missedSkillCategory, setMissedSkillCategory] = useState<SkillCategory>('Programming & Frameworks');

  // Target role selection state
  const [selectedCareerId, setSelectedCareerId] = useState<string>(state.targetCareerId);
  const [roleQuery, setRoleQuery] = useState<string>(activeCareer.title);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [discoverPathB, setDiscoverPathB] = useState(false);

  useEffect(() => {
    setSelectedCareerId(state.targetCareerId);
    setRoleQuery(getCareerById(state.targetCareerId).title);
  }, [state.targetCareerId]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  useEffect(() => {
    return () => {
      activeUploadAbortRef.current?.abort();
    };
  }, []);

  const filteredRoles = useMemo(() => {
    const q = roleQuery.trim().toLowerCase();
    if (!q) return CAREER_CATALOG;
    return CAREER_CATALOG.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.pathwayName.toLowerCase().includes(q) ||
        c.shortTitle.toLowerCase().includes(q)
    );
  }, [roleQuery]);

  const selectedCareerObj = useMemo(
    () => (selectedCareerId ? getCareerById(selectedCareerId) : null),
    [selectedCareerId]
  );

  const getErrorTitleForKind = (kind: ResumeUploadErrorKind): string => {
    switch (kind) {
      case 'backend_unavailable':
        return 'Backend parser unavailable';
      case 'network':
        return 'Network connection interrupted';
      case 'timeout':
        return 'Resume analysis timed out';
      case 'unsupported_file':
        return 'Unsupported resume format';
      case 'empty_document':
        return 'No selectable text detected';
      case 'file_too_large':
        return 'File exceeds upload limit';
      case 'auth_required':
        return 'Preview session authorization needed';
      case 'server_error':
      default:
        return 'Server processing failure';
    }
  };

  const validateAndProcessFile = async (file: File) => {
    setParseError(null);
    setAppliedBanner(null);

    const lowerName = file.name.toLowerCase();
    const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
    if (!hasValidExt) {
      setParseError({
        title: 'Unsupported resume format',
        kind: 'unsupported_file',
        message: `Unsupported file type for "${file.name}". Please upload a PDF, DOCX, DOC, or TXT resume.`,
      });
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      setParseError({
        title: 'File exceeds upload limit',
        kind: 'file_too_large',
        message: `"${file.name}" is ${(file.size / (1024 * 1024)).toFixed(1)} MB, which exceeds the 15 MB limit.`,
      });
      return;
    }

    if (file.size === 0) {
      setParseError({
        title: 'Empty file selected',
        kind: 'empty_document',
        message: `"${file.name}" is empty (0 bytes). Please upload a valid resume document.`,
      });
      return;
    }

    activeUploadAbortRef.current?.abort();
    const controller = new AbortController();
    activeUploadAbortRef.current = controller;

    const seq = ++uploadSeqRef.current;
    setStagedFile(file);
    setStagedRemoved(false);
    setReviewData(null);
    setCandidates([]);
    setEditedEducation([]);
    setEditedCertifications([]);
    setEditedProjects([]);
    setEditedExperience([]);
    setIsParsing(true);

    try {
      const data = await uploadResumeForParsing(file, { signal: controller.signal });
      if (seq !== uploadSeqRef.current) return;
      setReviewData(data);
      setEditedEducation(data.analysis.education || []);
      setEditedCertifications(data.analysis.certifications || []);
      setEditedProjects(data.analysis.projects || []);
      setEditedExperience(data.analysis.experience || []);
      setCandidates(
        (data.analysis.skillCandidates || []).map((cand, idx) => ({
          id: `cand-${seq}-${idx}-${cand.name}`,
          name: cand.name,
          category: cand.category,
          confidence: cand.confidence,
          evidenceExcerpt: cand.evidenceExcerpt,
          bucket: cand.bucket,
          selected: true,
        }))
      );
    } catch (err) {
      if (seq !== uploadSeqRef.current) return;
      if (err instanceof ResumeUploadError && err.kind === 'cancelled') return;
      setReviewData(null);
      setCandidates([]);
      setEditedEducation([]);
      setEditedCertifications([]);
      setEditedProjects([]);
      setEditedExperience([]);
      if (err instanceof ResumeUploadError) {
        setParseError({
          title: getErrorTitleForKind(err.kind),
          kind: err.kind,
          message: err.message,
        });
      } else {
        setParseError({
          title: 'Could not process resume',
          kind: 'server_error',
          message:
            err instanceof Error
              ? err.message
              : 'Unexpected error while uploading resume for analysis. Please retry.',
        });
      }
    } finally {
      if (seq === uploadSeqRef.current) {
        activeUploadAbortRef.current = null;
        setIsParsing(false);
      }
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void validateAndProcessFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void validateAndProcessFile(file);
    }
    e.target.value = '';
  };

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    uploadSeqRef.current += 1;
    activeUploadAbortRef.current?.abort();
    activeUploadAbortRef.current = null;
    setIsParsing(false);
    setStagedFile(null);
    setStagedRemoved(true);
    setReviewData(null);
    setCandidates([]);
    setEditedEducation([]);
    setEditedCertifications([]);
    setEditedProjects([]);
    setEditedExperience([]);
    setParseError(null);
    setAppliedBanner(null);
  };

  const handleAddMissedCandidate = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = missedSkillName.trim();
    if (!trimmed) return;
    setAppliedBanner(null);
    setCandidates((prev) => [
      {
        id: `manual-cand-${Date.now()}`,
        name: trimmed,
        category: missedSkillCategory,
        confidence: 70,
        evidenceExcerpt: 'Added by student during resume extraction review.',
        bucket: 'Student Review Addition',
        selected: true,
      },
      ...prev,
    ]);
    setMissedSkillName('');
  };

  const applyReviewedSkillsToState = (mode: 'merge' | 'replace'): boolean => {
    if (!reviewData) return false;
    const chosen = candidates.filter((c) => c.selected && c.name.trim().length > 0);
    if (chosen.length === 0) {
      setParseError({
        title: 'No skills selected',
        message: 'Select at least one extracted skill before syncing to My Skills.',
      });
      return false;
    }
    const editedReview: ExtractedResumeReviewData = {
      ...reviewData,
      analysis: {
        ...reviewData.analysis,
        education: editedEducation.map((v) => v.trim()).filter(Boolean),
        certifications: editedCertifications.map((v) => v.trim()).filter(Boolean),
        projects: editedProjects.map((v) => v.trim()).filter(Boolean),
        experience: editedExperience.map((v) => v.trim()).filter(Boolean),
      },
    };
    applyExtractedResume(
      editedReview,
      chosen.map((c) => ({
        name: c.name.trim(),
        category: c.category,
        confidence: c.confidence,
        evidenceExcerpt: c.evidenceExcerpt,
        bucket: c.bucket,
      })),
      mode
    );
    setAppliedBanner(
      `${chosen.length} skills ${mode === 'replace' ? 'loaded into' : 'merged into'} My Skills (${
        reviewData.mode === 'gemini' ? 'Gemini AI' : 'Demo Local Text Extraction'
      }).`
    );
    return true;
  };

  const handlePrimaryAnalyze = () => {
    if (reviewData && !appliedBanner) {
      const ok = applyReviewedSkillsToState(mergeMode);
      if (!ok) return;
    }

    if (discoverPathB) {
      navigate('/explore-careers');
      return;
    }

    if (selectedCareerId) {
      setTargetCareer(selectedCareerId);
    }
    navigate('/skill-gap-analysis');
  };

  const displayFileName = stagedFile ? stagedFile.name : state.resumeMetadata.fileName;
  const displayFileSize = stagedFile
    ? stagedFile.size >= 1024 * 1024
      ? `${(stagedFile.size / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.max(1, Math.round(stagedFile.size / 1024))} KB`
    : state.resumeMetadata.fileSizeLabel;

  const selectedCount = candidates.filter((c) => c.selected).length;

  return (
    <div className="bg-[#FAF9F6] w-full pt-8 pb-14 flex-grow">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 1. Compact 3-Step Progress Indicator */}
        <div className="mb-6 flex items-center justify-center">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 bg-white px-4 sm:px-5 py-2.5 rounded-full shadow-xs border border-[#EAE5FF]">
            <div className="flex items-center gap-1.5 text-[#546500]">
              <div className="w-5 h-5 rounded-full bg-[#D3EF66] flex items-center justify-center text-[#181E00] text-xs font-bold">
                <span className="material-symbols-outlined text-xs font-bold">check</span>
              </div>
              <span className="text-xs font-semibold text-[#1A1832]">1. Profile</span>
            </div>
            <div className="w-5 sm:w-6 h-0.5 bg-[#D3EF66] rounded-full"></div>
            <div className="flex items-center gap-1.5 text-[#5842D3]">
              <div className="w-5 h-5 rounded-full bg-[#5842D3] flex items-center justify-center text-white text-xs font-bold shadow-xs">
                2
              </div>
              <span className="text-xs font-bold text-[#5842D3]">2. Resume &amp; Target Role</span>
            </div>
            <div className="w-5 sm:w-6 h-0.5 bg-[#F0EBFF] rounded-full"></div>
            <div className="flex items-center gap-1.5 text-[#5C5A6B] opacity-75">
              <div className="w-5 h-5 rounded-full bg-[#F0EBFF] text-[#5C5A6B] flex items-center justify-center text-xs font-semibold">
                3
              </div>
              <span className="text-xs text-[#5C5A6B]">3. Skill Analysis</span>
            </div>
          </div>
        </div>

        {/* 2. Page Purpose & Typography Header */}
        <div className="text-center mb-6 max-w-2xl mx-auto">
          <h1 className="text-3xl md:text-5xl font-extrabold text-[#1A1832] tracking-tight mb-2 leading-tight">
            Let&apos;s discover what you&apos;re capable of.
          </h1>
          <p className="text-sm md:text-base text-[#474554] leading-relaxed">
            Upload your resume, choose a career direction, and discover the skills that can take you there.
          </p>
        </div>

        {/* 3. Central Resume Upload Area */}
        <div className="bg-white rounded-2xl p-5 sm:p-8 shadow-sm border border-[#EAE5FF] mb-6">
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-[#F6F1FF]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#5842D3] text-xl">upload_file</span>
              <h2 className="text-lg font-semibold text-[#1A1832]">Resume Ingestion</h2>
            </div>
            <span className="font-mono text-xs text-[#5C5A6B]">PDF, DOCX, TXT up to 15MB</span>
          </div>

          {/* Interactive Dropzone */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`mt-3 relative rounded-xl p-6 sm:p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 border-2 border-dashed ${
              isDragging
                ? 'border-[#5842D3] bg-[#F0EBFF]'
                : 'border-[#5842D3]/25 bg-[#F6F1FF]/50 hover:bg-[#F6F1FF] hover:border-[#5842D3]'
            }`}
          >
            <div className="w-14 h-14 rounded-2xl bg-[#E5DEFF] flex items-center justify-center text-[#5842D3] mb-3 shadow-xs">
              <span className="material-symbols-outlined text-3xl">
                {isParsing ? 'sync' : 'cloud_upload'}
              </span>
            </div>
            <p className="text-base font-semibold text-[#1A1832] mb-1">
              {isParsing ? (
                'Extracting text & analyzing your resume...'
              ) : (
                <>
                  Drag &amp; drop your resume here, or{' '}
                  <span className="text-[#5842D3] underline underline-offset-4 decoration-[#5842D3]/40 font-bold hover:decoration-[#5842D3]">
                    Browse Files
                  </span>
                </>
              )}
            </p>
            <p className="text-xs text-[#5C5A6B]">
              Supports PDF, DOCX, TXT (up to 15MB). Clean in-memory parsing — no image-only OCR assumptions.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.doc,.txt"
              onChange={handleFileChange}
              className="hidden"
              aria-label="Upload resume file"
            />
          </div>

          {/* Processing Progress Indicator */}
          {isParsing && (
            <div className="mt-4 p-4 rounded-xl bg-[#EEEAFE]/70 border border-[#7865F5]/30 flex items-center gap-3">
              <span className="material-symbols-outlined text-[#5842D3] animate-spin">sync</span>
              <div className="text-xs">
                <p className="font-bold text-[#1A1832]">Parsing uploaded document in memory...</p>
                <p className="text-[#474554]">
                  Extracting selectable text and identifying technical skills, projects, and education.
                </p>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {parseError && (
            <div
              role="alert"
              className="mt-4 p-4 rounded-xl bg-[#FFDAD6]/60 border border-[#BA1A1A]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#93000A]"
            >
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-lg shrink-0">error</span>
                <div className="space-y-1">
                  <p className="font-bold">{parseError.title}</p>
                  <p className="leading-relaxed">{parseError.message}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 self-start sm:self-center shrink-0">
                {parseError.kind === 'auth_required' && (
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="px-3 py-1.5 rounded-lg bg-[#93000A] text-white hover:bg-[#7A0008] font-bold text-xs transition-colors cursor-pointer"
                  >
                    Refresh Preview Session
                  </button>
                )}
                {stagedFile && !isParsing && (
                  <button
                    type="button"
                    onClick={() => void validateAndProcessFile(stagedFile)}
                    className="px-3 py-1.5 rounded-lg bg-white text-[#93000A] border border-[#BA1A1A]/30 hover:bg-[#FFDAD6] font-bold text-xs transition-colors cursor-pointer"
                  >
                    Retry Analysis
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Selected / Staged File State */}
          {!stagedRemoved && (stagedFile || state.resumeMetadata.fileName) && (
            <div className="mt-4 bg-[#F6F1FF] rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-[#F0EBFF]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-[#5842D3] flex items-center justify-center text-white flex-shrink-0 shadow-xs">
                  <span className="material-symbols-outlined text-xl">description</span>
                </div>
                <div className="min-w-0 flex flex-col text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[#1A1832] truncate font-semibold">
                      {displayFileName}
                    </span>
                    <span className="font-mono text-xs text-[#5C5A6B] flex-shrink-0">
                      {displayFileSize}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    {stagedFile ? (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          parseError
                            ? 'bg-[#FFDAD6] text-[#93000A]'
                            : reviewData
                              ? 'bg-[#D3EF66] text-[#181E00]'
                              : 'bg-[#E5DEFF] text-[#4226BD]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-xs">
                          {parseError
                            ? 'error'
                            : isParsing
                              ? 'sync'
                              : reviewData
                                ? 'check_circle'
                                : 'description'}
                        </span>
                        {isParsing
                          ? 'Uploading & Parsing...'
                          : parseError
                            ? 'Analysis Failed'
                            : reviewData
                              ? `Extracted ${reviewData.extractedCharacters.toLocaleString()} chars (${reviewData.format})`
                              : 'Selected'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E5DEFF] text-[#4226BD] text-[10px] font-bold uppercase tracking-wider">
                        <span className="material-symbols-outlined text-xs">inventory_2</span>
                        {state.resumeMetadata.hasCustomUpload
                          ? 'Active Uploaded Resume'
                          : 'Demo Baseline Resume Loaded'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white text-[#474554] hover:text-[#1A1832] hover:bg-[#F0EBFF] text-xs font-semibold shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">sync</span>
                  Replace
                </button>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  title="Remove file"
                  className="p-1.5 rounded-lg text-[#5C5A6B] hover:text-[#BA1A1A] hover:bg-[#FFDAD6]/40 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">delete</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 4. Review Extracted Results Panel (Shown after uploading & parsing a real document) */}
        {reviewData && (
          <section className="bg-white rounded-2xl p-5 sm:p-8 shadow-sm border-2 border-[#7865F5]/30 mb-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F0EBFF]">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                      reviewData.mode === 'gemini'
                        ? 'bg-[#D3EF66] text-[#181E00]'
                        : 'bg-[#FFFBEA] border border-[#F3E7BA] text-[#7A5A00]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xs">
                      {reviewData.mode === 'gemini' ? 'auto_awesome' : 'terminal'}
                    </span>
                    {reviewData.mode === 'gemini'
                      ? 'Live Gemini AI Extraction'
                      : 'Demo Local Text Extraction'}
                  </span>
                  <span className="font-mono text-xs text-[#5C5A6B]">
                    {reviewData.extractedCharacters.toLocaleString()} chars parsed
                  </span>
                </div>
                <h3 className="text-xl font-bold text-[#1A1832]">
                  Review &amp; Confirm Extracted Skills
                </h3>
                <p className="text-xs text-[#474554] mt-0.5">{reviewData.notice}</p>
              </div>

              <button
                type="button"
                onClick={() => setShowTextPreview((v) => !v)}
                className="self-start sm:self-auto px-3 py-1.5 rounded-lg bg-[#F6F1FF] hover:bg-[#EAE5FF] text-[#5842D3] text-xs font-semibold transition-colors"
              >
                {showTextPreview ? 'Hide Extracted Text' : 'Inspect Extracted Text'}
              </button>
            </div>

            {showTextPreview && (
              <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#EAE5FF] font-mono text-[11px] text-[#474554] max-h-44 overflow-y-auto whitespace-pre-wrap">
                {reviewData.extractedTextPreview}
              </div>
            )}

            {/* Editable Structured Summary Buckets */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[#F6F1FF]/70 border border-[#EAE5FF] flex flex-col gap-2">
                <span className="font-bold uppercase tracking-wider text-[10px] text-[#5842D3] block">
                  Education &amp; Certifications (Editable)
                </span>
                {editedEducation.length === 0 && editedCertifications.length === 0 ? (
                  <p className="text-[#5C5A6B] italic">No explicit education or certification lines matched.</p>
                ) : (
                  <div className="space-y-1.5">
                    {editedEducation.map((item, idx) => (
                      <div key={`edu-${idx}`} className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-xs text-[#546500] shrink-0">
                          school
                        </span>
                        <input
                          type="text"
                          value={item}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAppliedBanner(null);
                            setEditedEducation((prev) => prev.map((v, i) => (i === idx ? val : v)));
                          }}
                          aria-label={`Education item ${idx + 1}`}
                          className="flex-1 min-w-0 bg-white border border-[#E4DFFF] rounded-lg px-2 py-1 text-xs text-[#1A1832] focus:outline-none focus:border-[#5842D3]"
                        />
                        <button
                          type="button"
                          title="Remove education item"
                          onClick={() => {
                            setAppliedBanner(null);
                            setEditedEducation((prev) => prev.filter((_, i) => i !== idx));
                          }}
                          className="p-1 text-[#5C5A6B] hover:text-[#BA1A1A] cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-xs">close</span>
                        </button>
                      </div>
                    ))}
                    {editedCertifications.map((item, idx) => (
                      <div key={`cert-${idx}`} className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-xs text-[#5842D3] shrink-0">
                          workspace_premium
                        </span>
                        <input
                          type="text"
                          value={item}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAppliedBanner(null);
                            setEditedCertifications((prev) => prev.map((v, i) => (i === idx ? val : v)));
                          }}
                          aria-label={`Certification item ${idx + 1}`}
                          className="flex-1 min-w-0 bg-white border border-[#E4DFFF] rounded-lg px-2 py-1 text-xs text-[#1A1832] focus:outline-none focus:border-[#5842D3]"
                        />
                        <button
                          type="button"
                          title="Remove certification item"
                          onClick={() => {
                            setAppliedBanner(null);
                            setEditedCertifications((prev) => prev.filter((_, i) => i !== idx));
                          }}
                          className="p-1 text-[#5C5A6B] hover:text-[#BA1A1A] cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-xs">close</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-1.5 pt-1">
                  <select
                    value={newEduOrCertKind}
                    onChange={(e) => setNewEduOrCertKind(e.target.value as 'education' | 'certifications')}
                    aria-label="Bucket type for education or certification"
                    className="bg-white border border-[#E4DFFF] rounded-lg px-2 py-1 text-[11px] text-[#474554]"
                  >
                    <option value="education">Edu</option>
                    <option value="certifications">Cert</option>
                  </select>
                  <input
                    type="text"
                    value={newEduOrCertDraft}
                    onChange={(e) => setNewEduOrCertDraft(e.target.value)}
                    placeholder="Add degree or certification..."
                    className="flex-1 min-w-0 bg-white border border-[#E4DFFF] rounded-lg px-2 py-1 text-[11px] text-[#1A1832]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const trimmed = newEduOrCertDraft.trim();
                      if (!trimmed) return;
                      setAppliedBanner(null);
                      if (newEduOrCertKind === 'education') {
                        setEditedEducation((prev) => [...prev, trimmed]);
                      } else {
                        setEditedCertifications((prev) => [...prev, trimmed]);
                      }
                      setNewEduOrCertDraft('');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#EAE5FF] hover:bg-[#E4DFFF] text-[#5842D3] text-[11px] font-bold cursor-pointer"
                  >
                    + Add
                  </button>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F6F1FF]/70 border border-[#EAE5FF] flex flex-col gap-2">
                <span className="font-bold uppercase tracking-wider text-[10px] text-[#5842D3] block">
                  Projects &amp; Experience (Editable)
                </span>
                {editedProjects.length === 0 && editedExperience.length === 0 ? (
                  <p className="text-[#5C5A6B] italic">No explicit project or experience bullets matched.</p>
                ) : (
                  <div className="space-y-1.5">
                    {editedProjects.map((item, idx) => (
                      <div key={`proj-${idx}`} className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-xs text-[#5842D3] shrink-0">
                          code
                        </span>
                        <input
                          type="text"
                          value={item}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAppliedBanner(null);
                            setEditedProjects((prev) => prev.map((v, i) => (i === idx ? val : v)));
                          }}
                          aria-label={`Project item ${idx + 1}`}
                          className="flex-1 min-w-0 bg-white border border-[#E4DFFF] rounded-lg px-2 py-1 text-xs text-[#1A1832] focus:outline-none focus:border-[#5842D3]"
                        />
                        <button
                          type="button"
                          title="Remove project item"
                          onClick={() => {
                            setAppliedBanner(null);
                            setEditedProjects((prev) => prev.filter((_, i) => i !== idx));
                          }}
                          className="p-1 text-[#5C5A6B] hover:text-[#BA1A1A] cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-xs">close</span>
                        </button>
                      </div>
                    ))}
                    {editedExperience.map((item, idx) => (
                      <div key={`exp-${idx}`} className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-xs text-[#546500] shrink-0">
                          work_outline
                        </span>
                        <input
                          type="text"
                          value={item}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAppliedBanner(null);
                            setEditedExperience((prev) => prev.map((v, i) => (i === idx ? val : v)));
                          }}
                          aria-label={`Experience item ${idx + 1}`}
                          className="flex-1 min-w-0 bg-white border border-[#E4DFFF] rounded-lg px-2 py-1 text-xs text-[#1A1832] focus:outline-none focus:border-[#5842D3]"
                        />
                        <button
                          type="button"
                          title="Remove experience item"
                          onClick={() => {
                            setAppliedBanner(null);
                            setEditedExperience((prev) => prev.filter((_, i) => i !== idx));
                          }}
                          className="p-1 text-[#5C5A6B] hover:text-[#BA1A1A] cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-xs">close</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-1.5 pt-1">
                  <select
                    value={newProjOrExpKind}
                    onChange={(e) => setNewProjOrExpKind(e.target.value as 'projects' | 'experience')}
                    aria-label="Bucket type for project or experience"
                    className="bg-white border border-[#E4DFFF] rounded-lg px-2 py-1 text-[11px] text-[#474554]"
                  >
                    <option value="projects">Proj</option>
                    <option value="experience">Exp</option>
                  </select>
                  <input
                    type="text"
                    value={newProjOrExpDraft}
                    onChange={(e) => setNewProjOrExpDraft(e.target.value)}
                    placeholder="Add project or internship..."
                    className="flex-1 min-w-0 bg-white border border-[#E4DFFF] rounded-lg px-2 py-1 text-[11px] text-[#1A1832]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const trimmed = newProjOrExpDraft.trim();
                      if (!trimmed) return;
                      setAppliedBanner(null);
                      if (newProjOrExpKind === 'projects') {
                        setEditedProjects((prev) => [...prev, trimmed]);
                      } else {
                        setEditedExperience((prev) => [...prev, trimmed]);
                      }
                      setNewProjOrExpDraft('');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#EAE5FF] hover:bg-[#E4DFFF] text-[#5842D3] text-[11px] font-bold cursor-pointer"
                  >
                    + Add
                  </button>
                </div>
              </div>
            </div>

            {/* Editable Extracted Skills Checklist */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#1A1832]">
                  Extracted Skills ({selectedCount} of {candidates.length} selected)
                </span>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() =>
                      setCandidates((prev) => prev.map((c) => ({ ...c, selected: true })))
                    }
                    className="text-[#5842D3] font-semibold hover:underline"
                  >
                    Select All
                  </button>
                  <span className="text-[#C9C4D7]">·</span>
                  <button
                    type="button"
                    onClick={() =>
                      setCandidates((prev) => prev.map((c) => ({ ...c, selected: false })))
                    }
                    className="text-[#5C5A6B] font-semibold hover:underline"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {candidates.length === 0 ? (
                <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#EAE5FF] text-xs text-[#5C5A6B]">
                  No specific technology keywords matched automatically. Add your skills below before saving.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-80 overflow-y-auto pr-1">
                  {candidates.map((cand) => (
                    <div
                      key={cand.id}
                      className={`p-3 rounded-xl border transition-all flex flex-col gap-2 ${
                        cand.selected
                          ? 'bg-[#F6F1FF] border-[#7865F5]/40'
                          : 'bg-[#FAF9F6] border-[#EAE5FF] opacity-65'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <label className="flex items-center gap-2 cursor-pointer min-w-0 flex-1">
                          <input
                            type="checkbox"
                            checked={cand.selected}
                            onChange={(e) =>
                              setCandidates((prev) =>
                                prev.map((item) =>
                                  item.id === cand.id
                                    ? { ...item, selected: e.target.checked }
                                    : item
                                )
                              )
                            }
                            className="rounded border-[#C9C4D7] text-[#5842D3] focus:ring-[#5842D3]"
                          />
                          <input
                            type="text"
                            value={cand.name}
                            onChange={(e) =>
                              setCandidates((prev) =>
                                prev.map((item) =>
                                  item.id === cand.id ? { ...item, name: e.target.value } : item
                                )
                              )
                            }
                            aria-label={`Skill name for ${cand.name}`}
                            className="bg-transparent font-bold text-xs text-[#1A1832] border-b border-transparent focus:border-[#5842D3] focus:outline-none min-w-0 flex-1"
                          />
                        </label>
                        <span className="font-mono text-[11px] font-bold text-[#5842D3] shrink-0">
                          {cand.confidence}%
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <select
                          value={cand.category}
                          onChange={(e) =>
                            setCandidates((prev) =>
                              prev.map((item) =>
                                item.id === cand.id
                                  ? { ...item, category: e.target.value as SkillCategory }
                                  : item
                              )
                            )
                          }
                          aria-label={`Category for ${cand.name}`}
                          className="text-[11px] bg-white border border-[#E4DFFF] rounded-lg px-2 py-1 text-[#474554] focus:outline-none focus:border-[#5842D3]"
                        >
                          {CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                        <span className="text-[10px] text-[#5C5A6B] truncate max-w-[140px]">
                          {cand.bucket}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#5C5A6B] line-clamp-2 italic">
                        {cand.evidenceExcerpt}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Add missed skill inline */}
              <form onSubmit={handleAddMissedCandidate} className="flex flex-col sm:flex-row gap-2 pt-1">
                <input
                  type="text"
                  value={missedSkillName}
                  onChange={(e) => setMissedSkillName(e.target.value)}
                  placeholder="Missed a skill in your resume? Add it here (e.g. FastAPI, GraphQL)..."
                  className="flex-1 px-3 py-2 rounded-xl bg-[#FAF9F6] border border-[#EAE5FF] text-xs text-[#1A1832] focus:outline-none focus:border-[#5842D3]"
                />
                <select
                  value={missedSkillCategory}
                  onChange={(e) => setMissedSkillCategory(e.target.value as SkillCategory)}
                  className="px-3 py-2 rounded-xl bg-[#FAF9F6] border border-[#EAE5FF] text-xs text-[#474554] focus:outline-none focus:border-[#5842D3]"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#EAE5FF] hover:bg-[#E4DFFF] text-[#5842D3] text-xs font-bold transition-colors cursor-pointer"
                >
                  + Add
                </button>
              </form>
            </div>

            {/* Soft skills badges if found */}
            {reviewData.analysis.softSkills.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#F0EBFF]">
                <span className="text-[11px] font-bold text-[#5C5A6B] mr-1">Soft Skills Detected:</span>
                {reviewData.analysis.softSkills.map((s) => (
                  <span
                    key={s}
                    className="px-2 py-0.5 rounded-full bg-[#F6F1FF] border border-[#EAE5FF] text-[11px] text-[#474554] font-medium"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}

            {/* Merge Mode & Save Actions */}
            <div className="pt-3 border-t border-[#F0EBFF] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-4 text-xs">
                <label className="inline-flex items-center gap-1.5 cursor-pointer font-semibold text-[#1A1832]">
                  <input
                    type="radio"
                    name="mergeMode"
                    checked={mergeMode === 'replace'}
                    onChange={() => setMergeMode('replace')}
                    className="text-[#5842D3] focus:ring-[#5842D3]"
                  />
                  <span>Replace Demo Profile with Resume</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer font-semibold text-[#474554]">
                  <input
                    type="radio"
                    name="mergeMode"
                    checked={mergeMode === 'merge'}
                    onChange={() => setMergeMode('merge')}
                    className="text-[#5842D3] focus:ring-[#5842D3]"
                  />
                  <span>Merge with Existing Skills</span>
                </label>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => applyReviewedSkillsToState(mergeMode)}
                  className="px-5 py-2.5 rounded-xl bg-[#17152E] hover:bg-[#2B2754] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  Save Reviewed Skills to My Skills
                </button>
              </div>
            </div>

            {appliedBanner && (
              <div className="p-3 rounded-xl bg-[#D3EF66]/50 border border-[#546500]/25 flex flex-wrap items-center justify-between gap-2 text-xs text-[#181E00] font-semibold">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-[#546500]">
                    check_circle
                  </span>
                  {appliedBanner}
                </span>
                <Link to="/my-skills" className="text-[#4226BD] underline font-bold">
                  View My Skills →
                </Link>
              </div>
            )}
          </section>
        )}

        {/* 5. Target Career Selection Card */}
        <div className="bg-white rounded-2xl p-5 sm:p-8 shadow-sm border border-[#EAE5FF] mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-1 mb-4">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-[#5842D3] font-bold block">
                Placement Goal
              </span>
              <h3 className="text-lg font-semibold text-[#1A1832]">
                Select Target Career Direction
              </h3>
            </div>
            <p className="text-xs text-[#5C5A6B]">
              Calibrates market benchmarks for your skill-gap report
            </p>
          </div>

          {/* Search Input Bar with Dropdown */}
          <div className="relative mb-4" ref={dropdownRef}>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3.5 text-[#5842D3] text-xl pointer-events-none">
                search
              </span>
              <input
                type="text"
                value={roleQuery}
                onFocus={() => setDropdownOpen(true)}
                onChange={(e) => {
                  setRoleQuery(e.target.value);
                  setDropdownOpen(true);
                  setDiscoverPathB(false);
                }}
                placeholder="Search a role, e.g. AI Engineer, Data Analyst, QA Automation Engineer..."
                className="w-full pl-11 pr-10 py-3 rounded-xl bg-[#F6F1FF] border border-[#F0EBFF] text-[#1A1832] placeholder:text-[#5C5A6B] text-sm focus:outline-none focus:border-[#5842D3] focus:ring-2 focus:ring-[#5842D3]/20 transition-all"
              />
              {roleQuery && (
                <button
                  type="button"
                  title="Clear role selection"
                  onClick={() => {
                    setRoleQuery('');
                    setDropdownOpen(true);
                  }}
                  className="absolute right-3 p-1 rounded-lg text-[#5C5A6B] hover:text-[#1A1832] hover:bg-[#F0EBFF] transition-all flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              )}
            </div>

            {dropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl border border-[#EAE5FF] shadow-xl z-40 overflow-hidden">
                <div className="p-1.5 max-h-60 overflow-y-auto space-y-0.5">
                  {filteredRoles.length === 0 ? (
                    <div className="px-3 py-3 text-xs text-[#5C5A6B]">
                      No matching career found. Try &ldquo;AI&rdquo;, &ldquo;Python&rdquo;, or &ldquo;Data&rdquo;.
                    </div>
                  ) : (
                    filteredRoles.map((career) => (
                      <button
                        key={career.id}
                        type="button"
                        onClick={() => {
                          setSelectedCareerId(career.id);
                          setTargetCareer(career.id);
                          setRoleQuery(career.title);
                          setDiscoverPathB(false);
                          setDropdownOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left hover:bg-[#F6F1FF] transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="material-symbols-outlined text-sm text-[#5842D3]">
                            {career.icon}
                          </span>
                          <span className="text-xs sm:text-sm text-[#1A1832] font-semibold">
                            {career.title}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#5C5A6B]">{career.pathwayName}</span>
                      </button>
                    ))
                  )}
                </div>
                <div className="p-2.5 bg-[#F6F1FF]/60 border-t border-[#F0EBFF] flex items-center justify-between">
                  <Link
                    to="/explore-careers"
                    className="text-xs text-[#5842D3] hover:underline font-semibold flex items-center gap-1"
                  >
                    <span>Explore all {CAREER_CATALOG.length} catalog roles</span>
                    <span className="material-symbols-outlined text-xs">arrow_forward</span>
                  </Link>
                  <span className="text-[11px] text-[#5C5A6B]">Press Esc to close</span>
                </div>
              </div>
            )}
          </div>

          {/* Selected Role Summary Bar */}
          {selectedCareerObj && !discoverPathB && (
            <div className="mb-3 flex items-center justify-between p-2.5 px-3.5 rounded-xl bg-[#F6F1FF]/70 border border-[#F0EBFF]">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-[#5C5A6B] flex-shrink-0">Selected Goal:</span>
                <span className="text-xs sm:text-sm text-[#5842D3] font-bold truncate">
                  {selectedCareerObj.title}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDiscoverPathB(true)}
                className="text-xs text-[#5C5A6B] hover:text-[#5842D3] transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">explore</span> Switch to Discovery
              </button>
            </div>
          )}

          {/* Quick Select Chips Group */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[#5C5A6B] font-semibold uppercase tracking-wider">
                Popular Pathways
              </span>
              <span className="text-[11px] text-[#5C5A6B]">Click to select</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {POPULAR_PATHWAY_IDS.map((id) => {
                const career = getCareerById(id);
                const isSelected = !discoverPathB && selectedCareerId === career.id;
                return (
                  <button
                    key={career.id}
                    type="button"
                    onClick={() => {
                      setSelectedCareerId(career.id);
                      setTargetCareer(career.id);
                      setRoleQuery(career.title);
                      setDiscoverPathB(false);
                    }}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#5842D3] text-white font-bold shadow-sm'
                        : 'bg-[#F6F1FF] text-[#474554] hover:text-[#1A1832] hover:bg-[#F0EBFF] font-semibold'
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-base ${
                        isSelected ? 'text-white' : 'text-[#5C5A6B]'
                      }`}
                    >
                      {isSelected ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                    <span>{career.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Journey B: Help me discover my career */}
          <button
            type="button"
            onClick={() => setDiscoverPathB((prev) => !prev)}
            className={`w-full text-left cursor-pointer rounded-xl p-3.5 border-2 transition-all duration-200 flex items-start gap-3.5 ${
              discoverPathB
                ? 'border-[#5842D3] bg-[#F0EBFF]'
                : 'border-[#F0EBFF] bg-[#F6F1FF]/40 hover:bg-[#F6F1FF] hover:border-[#5842D3]/40'
            }`}
          >
            <div
              className={`w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                discoverPathB
                  ? 'border-[#5842D3] bg-[#5842D3] text-white'
                  : 'border-[#C9C4D7]'
              }`}
            >
              {discoverPathB && <span className="material-symbols-outlined text-xs">check</span>}
            </div>
            <div className="flex-grow">
              <div className="flex flex-wrap items-center gap-2">
                <span className="material-symbols-outlined text-[#5842D3] text-base">
                  auto_awesome
                </span>
                <span className="text-sm text-[#1A1832] font-bold">
                  I&apos;m not sure yet — help me discover my career
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#D3EF66] text-[#181E00] text-[10px] font-bold uppercase tracking-wider">
                  Path B
                </span>
              </div>
              <p className="text-xs text-[#5C5A6B] mt-0.5">
                SkillBridge AI will recommend suitable careers based on your available skills, coursework, projects, and interests.
              </p>
            </div>
          </button>

          <p className="mt-4 text-xs text-[#5C5A6B] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-[#546500]">info</span>
            <span>
              Your target role calibrates market benchmark rubrics for your personalized skill-gap analysis.
            </span>
          </p>
        </div>

        {/* 6. Primary Action CTA Area */}
        <div className="flex flex-col items-center justify-center gap-3 pt-1 mb-6 text-center">
          <button
            type="button"
            onClick={handlePrimaryAnalyze}
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-[#7865F5] text-white text-base font-bold shadow-md shadow-[#5842D3]/30 hover:bg-[#715EEE] transition-all active:scale-[0.98] cursor-pointer"
          >
            <span>
              {discoverPathB
                ? 'Explore Recommended Careers'
                : `Analyze Skill Gaps for ${selectedCareerObj?.title || activeCareer.title}`}
            </span>
            <span className="material-symbols-outlined text-lg">arrow_forward</span>
          </button>

          <Link
            to="/my-skills"
            className="text-xs text-[#5842D3] hover:underline transition-colors flex items-center gap-1 font-medium"
          >
            <span>Or continue with existing coursework profile (Apex CS &apos;26)</span>
            <span className="material-symbols-outlined text-xs">open_in_new</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
