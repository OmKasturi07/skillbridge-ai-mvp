import React, { useState } from 'react';
import { Link } from 'react-router-dom';

type InfoTopic = 'integrity' | 'placement' | 'privacy' | null;

const TOPIC_COPY: Record<Exclude<InfoTopic, null>, { title: string; body: string[]; badge: string }> = {
  integrity: {
    title: 'Academic Integrity Policy',
    badge: 'Apex Institute Honor Code',
    body: [
      'SkillBridge AI analyzes only student-submitted resumes, self-reported skills, and linked project evidence. It never fabricates grades, coursework records, or certifications.',
      'Skills marked "Demonstrated" from the baseline represent pre-seeded demo portfolio records unless replaced by your own uploaded resume or manual edits.',
      'Roadmap completion tracks personal learning milestones separately from verified skill mastery.',
    ],
  },
  placement: {
    title: 'Campus Placement Office',
    badge: 'Apex CS ’26 Cohort',
    body: [
      'Target A provides the Student Portal workspace for resume analysis, skill gap inspection, and sprint planning ahead of campus drives.',
      'Career match scores represent competency similarity against role rubrics and do not constitute a hiring or placement guarantee.',
      'Reach your assigned advisor (Dr. Priya Sharma) via the My Roadmap sidebar for mock technical reviews.',
    ],
  },
  privacy: {
    title: 'Privacy & Data Ethics',
    badge: 'Target A Local Storage',
    body: [
      'Uploaded resumes (PDF, DOCX, TXT) are parsed in memory on the server and are never persisted to third-party storage.',
      'Your skills, target career, and roadmap progress are stored locally in your browser via localStorage so your session persists across refreshes.',
      'When Gemini AI is configured on the server, extracted text is analyzed strictly for structured skill extraction without retaining personal data.',
    ],
  },
};

export const Footer: React.FC = () => {
  const [topic, setTopic] = useState<InfoTopic>(null);

  return (
    <>
      <footer className="w-full bg-white border-t border-[#E5E1FA] py-5 mt-auto">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-[#6E6B87]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#7865F5]"></span>
            <span className="font-medium">
              Apex Institute of Technology Partnership · SkillBridge AI Student Portal
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-5 font-medium">
            <button
              type="button"
              onClick={() => setTopic('integrity')}
              className="hover:text-[#17152E] transition-colors cursor-pointer"
            >
              Academic Integrity Policy
            </button>
            <button
              type="button"
              onClick={() => setTopic('placement')}
              className="hover:text-[#17152E] transition-colors cursor-pointer"
            >
              Campus Placement Office
            </button>
            <button
              type="button"
              onClick={() => setTopic('privacy')}
              className="hover:text-[#17152E] transition-colors cursor-pointer"
            >
              Data Privacy &amp; Ethics
            </button>
            <Link to="/dashboard" className="text-[#5842D3] hover:underline font-semibold">
              Student Dashboard
            </Link>
            <span className="font-mono text-[11px] text-[#6E6B87]">v2.4</span>
          </div>
        </div>
      </footer>

      {topic && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#17152E]/45 backdrop-blur-xs"
          onClick={() => setTopic(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white border border-[#E5E1FA] shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#F4F3F8]">
              <div>
                <span className="inline-block px-2 py-0.5 rounded-full bg-[#EEEAFE] text-[#5842D3] text-[10px] font-bold uppercase tracking-wider mb-1">
                  {TOPIC_COPY[topic].badge}
                </span>
                <h3 className="text-lg font-extrabold text-[#17152E]">{TOPIC_COPY[topic].title}</h3>
              </div>
              <button
                type="button"
                aria-label="Close policy dialog"
                onClick={() => setTopic(null)}
                className="p-1.5 rounded-lg text-[#6E6B87] hover:text-[#17152E] hover:bg-[#F4F3F8]"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
            <div className="space-y-2.5 text-xs text-[#4E4B66] leading-relaxed">
              {TOPIC_COPY[topic].body.map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setTopic(null)}
                className="px-4 py-2 rounded-xl bg-[#7865F5] hover:bg-[#6450E8] text-white text-xs font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
