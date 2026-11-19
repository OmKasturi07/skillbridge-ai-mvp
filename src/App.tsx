import React, { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { StudentProvider, useStudent } from './context/StudentContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { ResumeUploadPage } from './pages/ResumeUploadPage';
import { MySkillsPage } from './pages/MySkillsPage';
import { CareerDiscoveryPage } from './pages/CareerDiscoveryPage';
import { SkillGapAnalysisPage } from './pages/SkillGapAnalysisPage';
import { MyRoadmapPage } from './pages/MyRoadmapPage';
import { StudentDashboardPage } from './pages/StudentDashboardPage';

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);
  return null;
};

const PortalShell: React.FC = () => {
  const { recoveredFromCorruption } = useStudent();

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#FAF9F6] text-[#17152E] antialiased selection:bg-[#7865F5] selection:text-white">
      <ScrollToTop />
      <Navbar />
      {recoveredFromCorruption && (
        <div className="bg-[#FFFBEA] border-b border-[#F3E7BA] px-4 py-2 text-center text-xs text-[#7A5A00] font-semibold">
          Recovered from corrupted local workspace data — restored Apex CS &apos;26 baseline.
        </div>
      )}
      <main className="w-full flex-grow flex flex-col">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/upload-resume" element={<ResumeUploadPage />} />
          <Route path="/my-skills" element={<MySkillsPage />} />
          <Route path="/explore-careers" element={<CareerDiscoveryPage />} />
          <Route path="/skill-gap-analysis" element={<SkillGapAnalysisPage />} />
          <Route path="/my-roadmap" element={<MyRoadmapPage />} />
          <Route path="/dashboard" element={<StudentDashboardPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <StudentProvider>
        <PortalShell />
      </StudentProvider>
    </BrowserRouter>
  );
};

export default App;
