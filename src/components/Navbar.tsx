import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useStudent } from '../context/StudentContext';

const NAV_ITEMS = [
  { to: '/', label: 'Home' },
  { to: '/upload-resume', label: 'Upload Resume' },
  { to: '/my-skills', label: 'My Skills' },
  { to: '/explore-careers', label: 'Explore Careers' },
  { to: '/skill-gap-analysis', label: 'Skill Gap Analysis' },
  { to: '/my-roadmap', label: 'My Roadmap' },
];

export const Navbar: React.FC = () => {
  const { state, activeCareer, activeGapAnalysis, resetDemoData } = useStudent();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetBanner, setResetBanner] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setProfileOpen(false);
    setMobileMenuOpen(false);
    setConfirmReset(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
        setConfirmReset(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setProfileOpen(false);
        setMobileMenuOpen(false);
        setConfirmReset(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const handleReset = () => {
    resetDemoData();
    setConfirmReset(false);
    setProfileOpen(false);
    setResetBanner(true);
    setTimeout(() => setResetBanner(false), 3200);
  };

  const isCustomUpload = state.resumeMetadata.hasCustomUpload;

  return (
    <>
      <header className="sticky top-0 left-0 w-full z-50 h-16 bg-white/90 backdrop-blur-xl border-b border-[#E5E1FA] shadow-[0_1px_10px_rgba(23,21,46,0.04)]">
        <div className="max-w-[1440px] mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
          {/* Left: Electric Violet Logo Tile + Wordmark + EDU Badge */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <Link to="/" className="flex items-center gap-2.5 group" aria-label="SkillBridge AI Home">
              <div className="w-9 h-9 rounded-xl bg-[#7865F5] flex items-center justify-center text-white shadow-sm shadow-[#7865F5]/30 transition-transform group-hover:scale-105">
                <span className="material-symbols-outlined text-xl">hub</span>
              </div>
              <span className="font-extrabold text-base tracking-tight text-[#17152E] hidden sm:inline">
                SkillBridge AI
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-[#EEEAFE] text-[#5842D3] text-[10px] font-extrabold tracking-wider uppercase border border-[#7865F5]/20">
                EDU
              </span>
            </Link>
          </div>

          {/* Center: 6-Link Pill Bar */}
          <nav
            aria-label="Primary Student Navigation"
            className="hidden lg:flex items-center gap-1 p-1 rounded-xl bg-[#F4F3F8] border border-[#E5E1FA]/80 text-[13px]"
          >
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  isActive
                    ? 'px-3.5 py-1.5 rounded-lg bg-[#7865F5] text-white font-semibold shadow-xs transition-all whitespace-nowrap'
                    : 'px-3 py-1.5 rounded-lg text-[#4E4B66] hover:text-[#17152E] hover:bg-white/80 font-medium transition-all whitespace-nowrap'
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Right: Dashboard Quick Link + Profile Avatar Popover + Mobile Menu Toggle */}
          <div className="flex items-center gap-2.5 flex-shrink-0" ref={popoverRef}>
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                isActive
                  ? 'hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#17152E] text-white text-xs font-bold shadow-xs transition-all'
                  : 'hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FAF9F6] hover:bg-[#EEEAFE] text-[#17152E] border border-[#E5E1FA] text-xs font-semibold transition-all'
              }
            >
              <span className="material-symbols-outlined text-[15px] text-[#7865F5]">dashboard</span>
              <span>Dashboard</span>
            </NavLink>

            <div className="relative">
              <button
                type="button"
                aria-label="Open Student Profile Menu"
                aria-expanded={profileOpen}
                onClick={() => setProfileOpen((v) => !v)}
                className="relative w-10 h-10 rounded-full bg-[#EEEAFE] text-[#5842D3] font-extrabold text-xs flex items-center justify-center ring-2 ring-[#7865F5]/20 hover:ring-[#7865F5] transition-all cursor-pointer focus:outline-none"
              >
                {state.profile.initials}
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#D7F36A] border-2 border-white"></span>
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-2.5 w-80 rounded-2xl bg-white border border-[#E5E1FA] shadow-2xl p-4 z-50">
                  <div className="flex items-center gap-3 pb-3 border-b border-[#F4F3F8]">
                    <div className="w-11 h-11 rounded-xl bg-[#7865F5] text-white flex items-center justify-center font-extrabold text-sm shadow-xs shrink-0">
                      {state.profile.initials}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-[#17152E] truncate">{state.profile.fullName}</div>
                      <div className="text-[11px] text-[#4E4B66] truncate">{state.profile.degree}</div>
                      <div className="text-[11px] font-mono text-[#6E6B87]">
                        {state.profile.cohort} · ID: {state.profile.placementId}
                      </div>
                    </div>
                  </div>

                  <div className="py-3 space-y-2 text-xs border-b border-[#F4F3F8]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#6E6B87]">Campus:</span>
                      <span className="font-semibold text-[#17152E] text-right truncate">
                        {state.profile.institution}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#6E6B87]">Target Role:</span>
                      <span className="font-semibold text-[#5842D3] text-right truncate">
                        {activeCareer.title} ({activeGapAnalysis.careerReadiness}%)
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#6E6B87]">Profile Source:</span>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isCustomUpload
                            ? 'bg-[#D7F36A]/60 text-[#3F4C00]'
                            : 'bg-[#FFFBEA] border border-[#F3E7BA] text-[#7A5A00]'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isCustomUpload ? 'bg-[#546500]' : 'bg-[#E5B800]'
                          }`}
                        ></span>
                        {isCustomUpload
                          ? state.resumeMetadata.extractionMode === 'gemini'
                            ? 'Uploaded · Gemini AI'
                            : 'Uploaded · Local Demo'
                          : 'Demo Student Workspace'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        navigate('/dashboard');
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#17152E] hover:bg-[#2B2754] text-white text-xs font-bold transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm text-[#D7F36A]">dashboard</span>
                      Open Student Dashboard
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        navigate('/upload-resume');
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#7865F5] hover:bg-[#6450E8] text-white text-xs font-bold transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">upload_file</span>
                      {isCustomUpload ? 'Upload Updated Resume' : 'Upload Resume Now'}
                    </button>

                    {!confirmReset ? (
                      <button
                        type="button"
                        onClick={() => setConfirmReset(true)}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-[#F4F3F8] hover:bg-[#EEEAFE] text-[#4E4B66] hover:text-[#17152E] text-[11px] font-semibold transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">restart_alt</span>
                        Reset Demo Data
                      </button>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-[#FFEFEF] border border-[#FFD5D5] flex flex-col gap-2">
                        <span className="text-[11px] font-semibold text-[#93000A]">
                          Restore original Apex CS &apos;26 demo state?
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleReset}
                            className="flex-1 py-1 rounded-lg bg-[#BA1A1A] text-white text-[11px] font-bold hover:opacity-90"
                          >
                            Confirm Reset
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmReset(false)}
                            className="flex-1 py-1 rounded-lg bg-white text-[#4E4B66] border border-[#E5E1FA] text-[11px] font-semibold"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              aria-label="Toggle Mobile Navigation"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="lg:hidden p-2 rounded-xl bg-[#F4F3F8] text-[#17152E] hover:bg-[#EEEAFE] transition-colors"
            >
              <span className="material-symbols-outlined text-xl">
                {mobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-[#E5E1FA] shadow-lg px-4 py-3 space-y-1.5">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  isActive
                    ? 'block px-3.5 py-2.5 rounded-xl bg-[#7865F5] text-white text-sm font-bold'
                    : 'block px-3.5 py-2.5 rounded-xl text-[#4E4B66] hover:bg-[#F4F3F8] text-sm font-medium'
                }
              >
                {item.label}
              </NavLink>
            ))}
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                isActive
                  ? 'block px-3.5 py-2.5 rounded-xl bg-[#17152E] text-white text-sm font-bold'
                  : 'block px-3.5 py-2.5 rounded-xl bg-[#FAF9F6] text-[#17152E] border border-[#E5E1FA] text-sm font-semibold'
              }
            >
              Student Dashboard
            </NavLink>
          </div>
        )}
      </header>

      {resetBanner && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl bg-[#17152E] text-white text-xs font-semibold shadow-xl border border-[#D7F36A]/40 flex items-center gap-2">
          <span className="material-symbols-outlined text-sm text-[#D7F36A]">check_circle</span>
          <span>Demo workspace restored to Apex CS &apos;26 baseline.</span>
        </div>
      )}
    </>
  );
};
