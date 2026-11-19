import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStudent } from '../context/StudentContext';

export const HomePage: React.FC = () => {
  const { state, activeCareer, activeGapAnalysis } = useStudent();
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setHowItWorksOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const hasCustomUpload = state.resumeMetadata.hasCustomUpload;
  const totalSkills = state.skills.length;
  const academicBadgeLabel = `${state.profile.cohort} · ${state.profile.semester.replace(' (Active)', '')}`;

  return (
    <div className="bg-[#FCF8FF] w-full flex-grow flex flex-col justify-center">
      {/* Workspace Hero Section */}
      <section className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-8 lg:py-12">
        <div className="relative overflow-hidden rounded-3xl bg-white border border-[#EBE6F7] shadow-sm p-6 sm:p-10 lg:p-14">
          {/* Ambient Subtle Glow Blobs */}
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#EEEAFE]/70 blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-28 -left-28 w-80 h-80 rounded-full bg-[#D7F36A]/25 blur-3xl pointer-events-none"></div>

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            {/* Left: Personal Student Hero Info */}
            <div className="lg:col-span-6 flex flex-col items-start gap-6">
              {/* Warm Personal Micro-Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F6F1FF] border border-[#E4DFFF] text-[#17152E] text-xs font-semibold shadow-2xs">
                <span>
                  👋 Hey {state.profile.firstName} · CS Cohort &apos;26
                </span>
              </div>

              {/* Expressive Headline & Concise Copy */}
              <div className="flex flex-col gap-3">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#17152E] leading-[1.12]">
                  Your future <br className="hidden sm:inline" />
                  looks{' '}
                  <span className="text-[#7865F5] underline decoration-[#D7F36A] decoration-4 underline-offset-6">
                    good on you.
                  </span>
                </h1>
                <p className="text-base sm:text-lg text-[#696682] font-normal max-w-lg pt-1 leading-relaxed">
                  Discover your strengths, explore career paths, and find your next move.
                </p>
              </div>

              {/* Primary Workspace CTA Group */}
              <div className="flex flex-col items-start gap-3 w-full sm:w-auto pt-2">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
                  <Link
                    to="/upload-resume"
                    className="group button-glow inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-[#7865F5] hover:bg-[#6450E8] text-white font-bold text-base transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <span>{hasCustomUpload ? 'Update My Resume' : 'Upload My Resume'}</span>
                    <span className="material-symbols-outlined text-xl transition-transform group-hover:translate-x-1">
                      arrow_forward
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setHowItWorksOpen(true)}
                    className="inline-flex items-center justify-center gap-1.5 px-5 py-4 rounded-xl text-[#696682] hover:text-[#17152E] hover:bg-[#F6F1FF] font-semibold text-sm transition-colors cursor-pointer"
                  >
                    <span>Explore how it works</span>
                    <span className="material-symbols-outlined text-[18px]">north_east</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pl-1">
                  <span className="text-xs text-[#696682] flex items-center gap-1.5 font-medium">
                    <span className="material-symbols-outlined text-[15px] text-[#7865F5]">
                      verified_user
                    </span>
                    Takes ~2 mins · PDF or DOCX · Encrypted academic sync
                  </span>
                  <Link
                    to="/dashboard"
                    className="text-xs font-bold text-[#5842D3] hover:underline inline-flex items-center gap-1"
                  >
                    <span>Open Student Dashboard ({activeGapAnalysis.careerReadiness}% Ready)</span>
                    <span className="material-symbols-outlined text-xs">arrow_forward</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Right: Visual Centerpiece (Artistic Glowing Pathway Mesh) */}
            <div className="lg:col-span-6 flex flex-col items-center">
              <div className="relative w-full max-w-lg p-5 sm:p-8 rounded-2xl bg-[#FAF8FF] border border-[#ECE7F8] shadow-inner">
                {/* Clean Status Pill */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#EEEAFE] mb-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#E4DFFF] text-[#17152E] text-xs font-bold shadow-2xs">
                    <span className="text-[#3B4500]">⚡</span>
                    <span>
                      {hasCustomUpload
                        ? 'Trajectory Synchronized'
                        : 'Trajectory Unmapped'}
                    </span>
                    <span className="text-[#696682] font-normal">
                      · {hasCustomUpload ? `${totalSkills} skills mapped` : 'Ready for ingestion'}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-[#696682] font-medium">
                    {academicBadgeLabel}
                  </span>
                </div>

                {/* Artistic SVG Career Pathway Canvas */}
                <div className="relative py-4 flex justify-center">
                  <svg
                    className="w-full h-auto max-h-[225px]"
                    fill="none"
                    viewBox="0 0 460 200"
                    xmlns="http://www.w3.org/2000/svg"
                    role="img"
                    aria-label="Interactive Career Trajectory Mesh"
                  >
                    <defs>
                      <linearGradient
                        gradientUnits="userSpaceOnUse"
                        id="homePathGradient"
                        x1="40"
                        x2="420"
                        y1="150"
                        y2="50"
                      >
                        <stop offset="0%" stopColor="#7865F5" stopOpacity="0.9" />
                        <stop offset="50%" stopColor="#B2A4FF" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#D7F36A" stopOpacity="0.9" />
                      </linearGradient>
                      <filter height="140%" id="homeNeonViolet" width="140%" x="-20%" y="-20%">
                        <feGaussianBlur result="blur" stdDeviation="6" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                      <filter height="140%" id="homeNeonLime" width="140%" x="-20%" y="-20%">
                        <feGaussianBlur result="blur" stdDeviation="7" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>

                    <path
                      d="M 40 150 Q 140 160 210 100 T 420 50 L 420 185 L 40 185 Z"
                      fill="#EEEAFE"
                      fillOpacity="0.35"
                    />
                    <path
                      d="M 40 150 C 110 150 140 100 210 100 C 280 100 330 50 420 50"
                      stroke="url(#homePathGradient)"
                      strokeDasharray="7 5"
                      strokeLinecap="round"
                      strokeWidth="3.5"
                    />
                    <path
                      d="M 40 135 Q 230 130 420 65"
                      stroke="#E0DAF7"
                      strokeDasharray="3 3"
                      strokeWidth="1.5"
                    />

                    {/* NODE 1: Academic Baseline */}
                    <g transform="translate(52, 150)">
                      <circle cx="0" cy="0" fill="#FFFFFF" r="16" stroke="#E4DFFF" strokeWidth="2" />
                      <circle cx="0" cy="0" fill="#7865F5" r="8" />
                      <text
                        fill="#17152E"
                        fontFamily="Manrope"
                        fontSize="11"
                        fontWeight="700"
                        textAnchor="middle"
                        x="0"
                        y="28"
                      >
                        Academic Baseline
                      </text>
                      <text
                        fill="#696682"
                        fontFamily="JetBrains Mono"
                        fontSize="9"
                        textAnchor="middle"
                        x="0"
                        y="40"
                      >
                        {state.profile.semester.replace(' (Active)', '')}
                      </text>
                    </g>

                    {/* NODE 2: Skill Extraction */}
                    <g transform="translate(210, 100)">
                      <circle
                        className="node-pulse"
                        cx="0"
                        cy="0"
                        fill="#7865F5"
                        fillOpacity="0.18"
                        r="28"
                      />
                      <circle cx="0" cy="0" fill="#7865F5" filter="url(#homeNeonViolet)" r="20" />
                      <circle cx="0" cy="0" fill="#6450E8" r="14" />
                      <path
                        d="M -4 -4 L 4 -4 L 4 4 L -4 4 Z"
                        fill="none"
                        stroke="#FFFFFF"
                        strokeLinejoin="round"
                        strokeWidth="1.8"
                      />
                      <path
                        d="M 0 -1 L 0 5 M -3 2 L 0 -1 L 3 2"
                        fill="none"
                        stroke="#D7F36A"
                        strokeLinecap="round"
                        strokeWidth="1.8"
                      />
                      <text
                        fill="#7865F5"
                        fontFamily="Manrope"
                        fontSize="11"
                        fontWeight="800"
                        textAnchor="middle"
                        x="0"
                        y="-26"
                      >
                        Skill Extraction
                      </text>
                      <rect fill="#17152E" height="18" rx="9" width="104" x="-52" y="24" />
                      <text
                        fill="#FFFFFF"
                        fontFamily="Manrope"
                        fontSize="9"
                        fontWeight="700"
                        textAnchor="middle"
                        x="0"
                        y="36.5"
                      >
                        {hasCustomUpload ? `${totalSkills} Skills Synced` : 'Awaiting Resume'}
                      </text>
                    </g>

                    {/* NODE 3: Verified Topology */}
                    <g transform="translate(320, 72)">
                      <circle cx="0" cy="0" fill="#FFFFFF" r="12" stroke="#E4DFFF" strokeWidth="1.5" />
                      <circle cx="0" cy="0" fill="#B2A4FF" r="5" />
                      <text
                        fill="#696682"
                        fontFamily="Manrope"
                        fontSize="9.5"
                        fontWeight="600"
                        textAnchor="middle"
                        x="0"
                        y="24"
                      >
                        Skill Topology
                      </text>
                    </g>

                    {/* NODE 4: Dream Tech Roles */}
                    <g transform="translate(410, 50)">
                      <circle
                        className="node-pulse"
                        cx="0"
                        cy="0"
                        fill="#D7F36A"
                        fillOpacity="0.3"
                        r="22"
                      />
                      <circle
                        cx="0"
                        cy="0"
                        fill="#FFFFFF"
                        filter="url(#homeNeonLime)"
                        r="16"
                        stroke="#D7F36A"
                        strokeWidth="2.5"
                      />
                      <circle cx="0" cy="0" fill="#3B4500" r="8" />
                      <circle cx="0" cy="0" fill="#D7F36A" r="3" />
                      <text
                        fill="#17152E"
                        fontFamily="Manrope"
                        fontSize="11"
                        fontWeight="700"
                        textAnchor="middle"
                        x="-12"
                        y="28"
                      >
                        {activeCareer.shortTitle}
                      </text>
                      <text
                        fill="#3B4500"
                        fontFamily="JetBrains Mono"
                        fontSize="9"
                        textAnchor="middle"
                        x="-12"
                        y="40"
                      >
                        {activeGapAnalysis.careerReadiness}% Fit
                      </text>
                    </g>
                  </svg>
                </div>

                {/* Bottom prompt note */}
                <div className="mt-2 text-center">
                  <p className="text-xs text-[#696682]">
                    {hasCustomUpload
                      ? `Active target: ${activeCareer.title} (${activeGapAnalysis.careerReadiness}% readiness across ${totalSkills} skills).`
                      : 'Upload your coursework, project report, or resume to connect and map your personalized trajectory.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Three-Step Connected Sequence */}
      <section className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 pb-14">
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#7865F5]">
              Your 3-Step Journey
            </span>
            <span className="text-xs font-mono text-[#696682]">Estimated time: 2 mins</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 relative">
            <Link
              to="/my-skills"
              className="flex items-start gap-4 p-5 rounded-2xl bg-white border border-[#ECE7F8] hover:border-[#7865F5]/40 hover:shadow-sm transition-all shadow-2xs group"
            >
              <div className="w-10 h-10 rounded-xl bg-[#EEEAFE] text-[#7865F5] flex-shrink-0 flex items-center justify-center font-mono font-bold text-sm">
                01
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-sm text-[#17152E] group-hover:text-[#7865F5] transition-colors">
                    Discover Skills
                  </h3>
                  <span className="material-symbols-outlined text-sm text-[#696682] group-hover:translate-x-0.5 transition-transform">
                    arrow_forward
                  </span>
                </div>
                <p className="text-xs text-[#696682] leading-relaxed">
                  Parse coursework, GitHub repos &amp; projects into verified proficiencies ({totalSkills} active).
                </p>
              </div>
            </Link>

            <Link
              to="/explore-careers"
              className="flex items-start gap-4 p-5 rounded-2xl bg-white border border-[#ECE7F8] hover:border-[#7865F5]/40 hover:shadow-sm transition-all shadow-2xs group"
            >
              <div className="w-10 h-10 rounded-xl bg-[#EEEAFE] text-[#7865F5] flex-shrink-0 flex items-center justify-center font-mono font-bold text-sm">
                02
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-sm text-[#17152E] group-hover:text-[#7865F5] transition-colors">
                    Explore Careers
                  </h3>
                  <span className="material-symbols-outlined text-sm text-[#696682] group-hover:translate-x-0.5 transition-transform">
                    arrow_forward
                  </span>
                </div>
                <p className="text-xs text-[#696682] leading-relaxed">
                  Benchmark against Tier-1 campus hiring profiles &amp; compare emerging tech tracks.
                </p>
              </div>
            </Link>

            <Link
              to="/my-roadmap"
              className="flex items-start gap-4 p-5 rounded-2xl bg-white border border-[#ECE7F8] hover:border-[#7865F5]/40 hover:shadow-sm transition-all shadow-2xs group"
            >
              <div className="w-10 h-10 rounded-xl bg-[#FAF7CD] text-[#3B4500] flex-shrink-0 flex items-center justify-center font-mono font-bold text-sm">
                03
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-sm text-[#17152E] group-hover:text-[#7865F5] transition-colors">
                    Build Your Roadmap
                  </h3>
                  <span className="material-symbols-outlined text-sm text-[#696682] group-hover:translate-x-0.5 transition-transform">
                    arrow_forward
                  </span>
                </div>
                <p className="text-xs text-[#696682] leading-relaxed">
                  Bridge gaps with actionable weekly micro-sprints and curated projects.
                </p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Interactive "How It Works" Modal */}
      {howItWorksOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#17152E]/40 backdrop-blur-xs"
          onClick={() => setHowItWorksOpen(false)}
        >
          <div
            className="relative w-full max-w-md p-6 rounded-3xl bg-white shadow-2xl border border-[#E4DFFF] flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#EEEAFE]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#7865F5]"></span>
                <h3 className="font-bold text-base text-[#17152E]">How SkillBridge Operates</h3>
              </div>
              <button
                type="button"
                aria-label="Close modal"
                onClick={() => setHowItWorksOpen(false)}
                className="p-1 rounded-lg text-[#696682] hover:text-[#17152E] hover:bg-[#F6F1FF] transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs text-[#696682]">
              <div className="p-3 rounded-xl bg-[#F6F1FF] flex items-start gap-3">
                <span className="font-mono font-bold text-[#7865F5]">01</span>
                <div>
                  <strong className="text-[#17152E] block">Drop your resume or project links</strong>
                  <span>
                    SkillBridge AI reads PDF, DOCX, and TXT resumes in memory to extract structured skills and evidence without storing sensitive PII.
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#F6F1FF] flex items-start gap-3">
                <span className="font-mono font-bold text-[#7865F5]">02</span>
                <div>
                  <strong className="text-[#17152E] block">Pin your aspirational roles</strong>
                  <span>
                    Compare current competencies directly to industry-standard benchmarks across 9 technology roles.
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#F6F1FF] flex items-start gap-3">
                <span className="font-mono font-bold text-[#7865F5]">03</span>
                <div>
                  <strong className="text-[#17152E] block">Unlock tailored sprints</strong>
                  <span>
                    Close specific skill deltas with bite-sized semester milestones before campus placement season.
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setHowItWorksOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#696682] hover:text-[#17152E]"
              >
                Got it
              </button>
              <Link
                to="/upload-resume"
                onClick={() => setHowItWorksOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#7865F5] text-white text-xs font-bold hover:bg-[#6450E8] transition-colors"
              >
                Upload Resume
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
