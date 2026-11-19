import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import App from '../src/App';
import { STORAGE_KEY } from '../src/services/storageService';
import { uploadResumeForParsing, ResumeUploadError } from '../src/services/resumeApi';

function navigateAndRender(path = '/') {
  window.history.pushState({}, '', path);
  return render(<App />);
}

function makeParsedPayload(overrides?: {
  fileName?: string;
  skills?: Array<{ name: string; category: string; confidence: number; evidenceExcerpt: string; bucket: string }>;
  education?: string[];
  projects?: string[];
  certifications?: string[];
  experience?: string[];
}) {
  return {
    ok: true,
    fileName: overrides?.fileName ?? 'maya_resume_v1.pdf',
    fileSizeBytes: 18432,
    format: 'PDF',
    extractedCharacters: 940,
    extractedTextPreview: 'Maya Lin\nB.Tech Data Science\nSkills: Python, FastAPI, PostgreSQL, Docker, Playwright',
    mode: 'demo-local' as const,
    notice: 'Demo local extraction verified.',
    analysis: {
      summary: 'CS undergraduate focused on Python APIs, SQL databases, and Playwright QA.',
      education: overrides?.education ?? ['B.Tech Computer Science — Apex Institute (2022-2026)'],
      projects: overrides?.projects ?? ['FastAPI Microservice with PostgreSQL & Playwright CI'],
      certifications: overrides?.certifications ?? ['AWS Cloud Practitioner'],
      experience: overrides?.experience ?? ['Backend QA Intern — CloudTest Labs'],
      softSkills: ['Technical Documentation', 'Code Review'],
      skillCandidates: overrides?.skills ?? [
        {
          name: 'Python',
          category: 'Programming & Frameworks',
          confidence: 90,
          evidenceExcerpt: 'Built FastAPI services in Python.',
          bucket: 'Languages',
        },
        {
          name: 'Playwright',
          category: 'Testing & Automation',
          confidence: 82,
          evidenceExcerpt: 'Authored E2E browser suites using Playwright.',
          bucket: 'Testing',
        },
        {
          name: 'PostgreSQL',
          category: 'Data, Databases & Storage',
          confidence: 86,
          evidenceExcerpt: 'Designed indexed PostgreSQL schemas.',
          bucket: 'Databases',
        },
        {
          name: 'Docker',
          category: 'DevOps & Cloud Tools',
          confidence: 78,
          evidenceExcerpt: 'Containerized test runners with Docker.',
          bucket: 'DevOps',
        },
      ],
    },
  };
}

describe('SkillBridge AI — 7-Screen Student Portal MVP E2E', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('1. Home Page renders dynamic student profile, opens/closes How It Works modal, and navigates across all 7 routes', async () => {
    const view = navigateAndRender('/');

    expect(screen.getByText(/Your future/i)).toBeTruthy();
    expect(screen.getByText(/Hey Aarav/i)).toBeTruthy();
    expect(screen.getByText(/Class of '26 · Semester 4/i)).toBeTruthy();

    // Open How It Works modal & close with Escape
    fireEvent.click(screen.getByRole('button', { name: /Explore how it works/i }));
    expect(screen.getByText(/How SkillBridge Operates/i)).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText(/How SkillBridge Operates/i)).toBeNull();

    // Navigate through all 7 primary header routes
    const header = document.querySelector('header')!;
    fireEvent.click(within(header).getByRole('link', { name: 'Upload Resume' }));
    expect(await screen.findByText(/Let's discover what you're capable of/i)).toBeTruthy();

    fireEvent.click(within(header).getByRole('link', { name: 'My Skills' }));
    expect(await screen.findByText(/Here's what you've got/i)).toBeTruthy();

    fireEvent.click(within(header).getByRole('link', { name: 'Explore Careers' }));
    expect(await screen.findByText(/Your next chapter/i)).toBeTruthy();

    fireEvent.click(within(header).getByRole('link', { name: 'Skill Gap Analysis' }));
    expect(await screen.findByText(/Your gap is your next opportunity/i)).toBeTruthy();

    fireEvent.click(within(header).getByRole('link', { name: 'My Roadmap' }));
    expect(await screen.findByText(/Your next steps, mapped out/i)).toBeTruthy();

    fireEvent.click(within(header).getByRole('link', { name: /Dashboard/i }));
    expect(await screen.findByText(/Hey, Aarav!/i)).toBeTruthy();

    view.unmount();
  });

  it('2. Resume Upload supports consecutive replacements, editable extracted buckets, error isolation, and refresh persistence', async () => {
    const firstPayload = makeParsedPayload({ fileName: 'resume_round1.pdf' });
    const secondPayload = makeParsedPayload({
      fileName: 'resume_round2.docx',
      education: ['M.S. Software Systems — Apex Graduate Lab'],
      skills: [
        {
          name: 'TypeScript',
          category: 'Programming & Frameworks',
          confidence: 88,
          evidenceExcerpt: 'Full-stack TypeScript web platform.',
          bucket: 'Languages',
        },
        {
          name: 'Kubernetes',
          category: 'DevOps & Cloud Tools',
          confidence: 84,
          evidenceExcerpt: 'Deployed workloads to Kubernetes clusters.',
          bucket: 'Cloud',
        },
      ],
    });

    const fetchMock = vi.fn()
      // Upload 1 succeeds
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(firstPayload),
      })
      // Upload 2 fails with HTTP 422 empty document
      .mockResolvedValueOnce({
        ok: false,
        status: 422,
        text: async () =>
          JSON.stringify({
            ok: false,
            code: 'EMPTY_DOCUMENT',
            error: 'No selectable text detected in scanned PDF.',
          }),
      })
      // Upload 3 succeeds (replacement resume)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(secondPayload),
      });
    vi.stubGlobal('fetch', fetchMock);

    const view = navigateAndRender('/upload-resume');
    const fileInput = screen.getByLabelText('Upload resume file') as HTMLInputElement;

    // Upload 1: valid PDF
    const file1 = new File(['%PDF-1.4 valid resume'], 'resume_round1.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [file1] } });

    expect(await screen.findByText(/Review & Confirm Extracted Skills/i)).toBeTruthy();

    // Edit extracted Education item & add a Project item before saving
    const eduInput = screen.getByLabelText('Education item 1') as HTMLInputElement;
    fireEvent.change(eduInput, { target: { value: 'B.Tech CS Honors — Apex Institute (Edited)' } });

    const projInput = screen.getByPlaceholderText(/Add project or internship/i);
    fireEvent.change(projInput, { target: { value: 'Distributed Telemetry Collector' } });
    const addButtons = screen.getAllByRole('button', { name: '+ Add' });
    fireEvent.click(addButtons[1]);

    fireEvent.click(screen.getByRole('button', { name: /Save Reviewed Skills to My Skills/i }));
    expect(await screen.findByText(/4 skills loaded into My Skills/i)).toBeTruthy();

    // Verify edited education persisted to localStorage
    const savedAfter1 = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    expect(savedAfter1.resumeMetadata.education).toContain('B.Tech CS Honors — Apex Institute (Edited)');
    expect(savedAfter1.resumeMetadata.projects).toContain('Distributed Telemetry Collector');

    // Upload 2: failed upload must show structured 422 error AND MUST NOT corrupt saved skills
    const badFile = new File(['%PDF-1.4 scanned'], 'scanned_empty.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [badFile] } });
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByText(/No selectable text detected in scanned PDF/i)).toBeTruthy();

    const savedAfterFail = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    expect(savedAfterFail.resumeMetadata.fileName).toBe('resume_round1.pdf');
    expect(savedAfterFail.skills.map((s: { name: string }) => s.name)).toContain('Playwright');

    // Upload 3: consecutive replacement succeeds and overwrites cleanly
    const file3 = new File(['PK\x03\x04 docx content'], 'resume_round2.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    fireEvent.change(fileInput, { target: { files: [file3] } });
    await waitFor(() => {
      expect(screen.getByDisplayValue('TypeScript')).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: /Save Reviewed Skills to My Skills/i }));
    expect(await screen.findByText(/2 skills loaded into My Skills/i)).toBeTruthy();

    // Unmount and remount to verify persistence across page reload
    view.unmount();
    const viewReloaded = navigateAndRender('/my-skills');
    expect(await screen.findByText('resume_round2.docx')).toBeTruthy();
    expect(screen.getAllByText('TypeScript').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Kubernetes').length).toBeGreaterThan(0);
    viewReloaded.unmount();
  });

  it('3. My Skills supports Add, Search/Filter, Edit (Name, Status, Confidence, Coursework), Lock, Flag, and Delete', async () => {
    const view = navigateAndRender('/my-skills');

    // Add custom skill
    fireEvent.click(screen.getByRole('button', { name: /Add Custom Skill/i }));
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Kubernetes, Redis/i), {
      target: { value: 'GraphQL' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Mention a repo, capstone/i), {
      target: { value: 'Built GraphQL gateway for campus portal' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Save Skill/i }));

    expect(await screen.findByText(/Added "GraphQL"/i)).toBeTruthy();

    // Edit proficiency + name + coursework
    fireEvent.click(screen.getByRole('button', { name: /Edit Proficiency/i }));
    const nameInput = screen.getByDisplayValue('GraphQL');
    fireEvent.change(nameInput, { target: { value: 'GraphQL Federation' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));
    expect(await screen.findByText(/Updated proficiency & evidence for "GraphQL Federation"/i)).toBeTruthy();

    // Lock skill
    fireEvent.click(screen.getByRole('button', { name: /Confirm Skill & Lock Level/i }));
    expect(await screen.findByText(/Skill Level Locked/i)).toBeTruthy();

    // Flag incorrect then delete
    fireEvent.click(screen.getByRole('button', { name: /Report Incorrect Extraction/i }));
    expect(await screen.findByText(/Flagged as incorrectly extracted/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Remove/i }));
    fireEvent.click(screen.getByRole('button', { name: /Confirm Delete/i }));
    expect(await screen.findByText(/Removed "GraphQL Federation"/i)).toBeTruthy();

    // Filter Unverified
    fireEvent.click(screen.getByRole('button', { name: /Unverified \(/i }));
    expect(screen.getAllByText('MongoDB').length).toBeGreaterThan(0);

    view.unmount();
  });

  it('4. Career Discovery renders all 9 careers, search filter, bookmarking, and Deep Compare Mode', async () => {
    const view = navigateAndRender('/explore-careers');

    // Verify Spotlight + 8 deck cards = 9 tracks
    expect(screen.getByText(/8 alternative pathways ranked/i)).toBeTruthy();
    expect(screen.getAllByText(/AI Engineer/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Cloud \/ DevOps Engineer/i).length).toBeGreaterThan(0);

    // Open Deep Compare Mode from spotlight
    fireEvent.click(screen.getByRole('button', { name: /Compare with Another Role/i }));
    expect(await screen.findByText(/Shared Grounded Skills:/i)).toBeTruthy();

    // Close Deep Compare with Escape
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText(/Shared Grounded Skills:/i)).toBeNull();

    // Bookmark a deck career & search
    const searchInput = screen.getByPlaceholderText(/Search careers/i);
    fireEvent.change(searchInput, { target: { value: 'Data Analyst' } });
    expect(screen.getByText(/1 alternative pathways ranked/i)).toBeTruthy();
    const bookmarkBtn = screen.getByTitle(/Bookmark career|Remove bookmark/i);
    fireEvent.click(bookmarkBtn);

    view.unmount();
  });

  it('5. Skill Gap Analysis -> Pin 4 Gaps -> My Roadmap reflects without duplicate numbering & validates evidence URLs', async () => {
    // Seed profile with only 1 demonstrated skill so target track has 4+ gaps to verify 4-gap pinning
    const minimalState = {
      version: 1,
      profile: {
        fullName: 'Aarav Sharma',
        firstName: 'Aarav',
        initials: 'AS',
        degree: 'B.Tech Computer Science & Eng.',
        cohort: "Class of '26",
        semester: 'Semester 4 (Active)',
        institution: 'Apex Institute of Technology',
        email: 'aarav.sharma@apex.edu',
        placementId: 'APX-9042',
        advisorName: 'Dr. Priya Sharma',
        advisorTitle: 'Assigned Career Advisor · Apex',
        isDemoProfile: true,
      },
      resumeMetadata: {
        fileName: 'resume_aarav_v2.pdf',
        fileSizeLabel: '1.8 MB',
        uploadedAt: 'Synced 2h ago',
        extractionMode: 'demo-profile',
        notice: 'Demo',
        hasCustomUpload: false,
        summary: 'Demo',
        education: ['B.Tech CS'],
        projects: [],
        certifications: [],
        experience: [],
      },
      skills: [
        {
          id: 'skill-python',
          name: 'Python Core',
          category: 'Programming & Frameworks',
          status: 'Demonstrated',
          confidence: 92,
          source: 'Coursework & GitHub',
          resumeExcerpt: 'Python microservices',
          courseworkEvidence: 'CS 210 Grade A',
          identifiedReason: 'Verified',
          locked: true,
          updatedAt: '2026-11-18T10:00:00.000Z',
        },
      ],
      targetCareerId: 'qa-automation',
      savedCareerIds: ['qa-automation'],
      comparedCareerIds: ['qa-automation', 'python-backend'],
      pinnedSkillIdsInRoadmap: [],
      roadmapTaskProgress: {},
      advisorMessages: [],
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(minimalState));

    const view = navigateAndRender('/skill-gap-analysis');

    // Filter to Gaps and pin all 4 unique gaps via the left comparison cards + Inspector
    fireEvent.click(screen.getByRole('button', { name: /^Gaps \(/i }));
    const gapCards = screen.getAllByRole('button', { name: /Your Evidence.*Role Expectation/i });
    expect(gapCards.length).toBeGreaterThanOrEqual(4);
    for (const card of gapCards.slice(0, 4)) {
      fireEvent.click(card);
      const pinButtons = screen.getAllByRole('button', { name: /Add to My Roadmap$/i });
      // Inspector pin button is the first match in DOM order (above Top Priorities)
      expect(pinButtons.length).toBeGreaterThan(0);
      fireEvent.click(pinButtons[0]);
    }

    // Navigate to My Roadmap
    fireEvent.click(screen.getByRole('button', { name: /Build My Roadmap/i }));
    expect(await screen.findByText(/Your next steps, mapped out/i)).toBeTruthy();

    // Ensure Stage 2 & Stage 3 titles do NOT have duplicate numbering like "2.1 2.1" or "3.1 3.1"
    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent || '');
    for (const headingText of headings) {
      expect(headingText).not.toMatch(/\b(2\.\d+|3\.1)\s+\1\b/);
    }
    expect(headings.some((h) => h.includes('End-to-End QA Automation Portfolio Capstone'))).toBe(true);

    // Verify all 4 Stage 2 gap tasks appear (2.1..2.4)
    expect(headings.some((h) => h.startsWith('2.4 '))).toBe(true);

    // Attach Evidence rejects javascript: URL
    fireEvent.click(screen.getByRole('button', { name: /Add Evidence$/i }));
    const urlInput = screen.getByPlaceholderText('https://github.com/username/project');
    fireEvent.change(urlInput, { target: { value: 'javascript:alert(1)' } });
    fireEvent.submit(urlInput.closest('form')!);
    expect(await screen.findByText(/Please enter a valid http:\/\/ or https:\/\//i)).toBeTruthy();

    // Valid https:// URL saves cleanly
    fireEvent.change(urlInput, { target: { value: 'https://github.com/student/qa-suite' } });
    fireEvent.submit(urlInput.closest('form')!);
    await waitFor(() => {
      expect(screen.getByText('https://github.com/student/qa-suite')).toBeTruthy();
    });

    // Test Advisor messaging & Resources tab filter
    fireEvent.click(screen.getByRole('button', { name: /Message Advisor/i }));
    fireEvent.change(screen.getByPlaceholderText(/Ask Dr\. Priya Sharma/i), {
      target: { value: 'Please review my QA automation sprint.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Send Note/i }));
    expect(await screen.findByText('Please review my QA automation sprint.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    fireEvent.click(screen.getByRole('tab', { name: /Resources/i }));
    expect(await screen.findByText(/Free-First Curated Resource Library/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Practice & Projects' }));
    fireEvent.click(screen.getByRole('tab', { name: /Roadmap$/i }));

    // Mark a task complete & verify dashboard reflects sync (1.1 foundation auto-completed + 1 newly marked = 2/6 Done)
    const markCompleteBtns = screen.getAllByRole('button', { name: /Mark as Complete/i });
    fireEvent.click(markCompleteBtns[0]);

    const header = document.querySelector('header')!;
    fireEvent.click(within(header).getByRole('link', { name: /Dashboard/i }));
    expect(await screen.findByText(/Hey, Aarav!/i)).toBeTruthy();
    expect(screen.getByText(/2\/6 Done/i)).toBeTruthy();

    view.unmount();
  });

  it('6. Corrupted localStorage recovers gracefully and Reset Demo Data restores baseline', async () => {
    window.localStorage.setItem(STORAGE_KEY, '{corrupted_json_payload');
    const view = navigateAndRender('/dashboard');

    expect(
      await screen.findByText(/Recovered from corrupted local workspace data/i)
    ).toBeTruthy();
    expect(screen.getByText(/Hey, Aarav!/i)).toBeTruthy();

    // Test Reset Demo Data from Navbar Profile Popover
    fireEvent.click(screen.getByRole('button', { name: /Open Student Profile Menu/i }));
    fireEvent.click(screen.getByRole('button', { name: /Reset Demo Data/i }));
    fireEvent.click(screen.getByRole('button', { name: /Confirm Reset/i }));
    expect(await screen.findByText(/Demo workspace restored to Apex CS '26 baseline/i)).toBeTruthy();

    view.unmount();
  });

  it('7. resumeApi differentiates HTML 502 proxy errors, 413 payload limits, 403 auth, and offline backend errors', async () => {
    const sample = new File(['Sample resume text with Python SQL Docker'], 'sample.txt', {
      type: 'text/plain',
    });

    // 502 Bad Gateway HTML page
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 502,
        text: async () => '<html><body>502 Bad Gateway</body></html>',
      })
    );
    await expect(uploadResumeForParsing(sample)).rejects.toMatchObject<Partial<ResumeUploadError>>({
      kind: 'backend_unavailable',
    });

    // 413 Payload Too Large
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 413,
        text: async () => 'Request Entity Too Large',
      })
    );
    await expect(uploadResumeForParsing(sample)).rejects.toMatchObject<Partial<ResumeUploadError>>({
      kind: 'file_too_large',
    });

    // 403 Auth HTML redirect
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => '<html>Sign in required</html>',
      })
    );
    await expect(uploadResumeForParsing(sample)).rejects.toMatchObject<Partial<ResumeUploadError>>({
      kind: 'auth_required',
    });

    // Opaque 302 auth proxy redirect (manual redirect mode)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        type: 'opaqueredirect',
        ok: false,
        status: 0,
        url: 'https://ais-dev.example/api/resume/parse',
      })
    );
    await expect(uploadResumeForParsing(sample)).rejects.toMatchObject<Partial<ResumeUploadError>>({
      kind: 'auth_required',
    });

    // Network/CORS error on upload + /api/health returns 302 auth redirect -> classified as auth_required
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce({
          type: 'opaqueredirect',
          ok: false,
          status: 0,
        })
    );
    await expect(uploadResumeForParsing(sample)).rejects.toMatchObject<Partial<ResumeUploadError>>({
      kind: 'auth_required',
    });

    // Network failure + failing health probe
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
    );
    await expect(uploadResumeForParsing(sample)).rejects.toMatchObject<Partial<ResumeUploadError>>({
      kind: 'backend_unavailable',
    });
  });

  it('8. Supports 5+ consecutive mixed uploads (PDF #1..#3, DOCX, TXT), aborts superseded requests on rapid replace, and retries cleanly after failure', async () => {
    const payloads = [
      makeParsedPayload({
        fileName: 'resume_1.pdf',
        skills: [{ name: 'Python', category: 'Programming & Frameworks', confidence: 88, evidenceExcerpt: 'Python', bucket: 'Languages' }],
      }),
      makeParsedPayload({
        fileName: 'resume_2.pdf',
        skills: [{ name: 'Playwright', category: 'Testing & Automation', confidence: 85, evidenceExcerpt: 'Playwright', bucket: 'Testing' }],
      }),
      makeParsedPayload({
        fileName: 'resume_3.pdf',
        skills: [{ name: 'Docker', category: 'DevOps & Cloud Tools', confidence: 82, evidenceExcerpt: 'Docker', bucket: 'DevOps' }],
      }),
      makeParsedPayload({
        fileName: 'resume_4.docx',
        skills: [{ name: 'TypeScript', category: 'Programming & Frameworks', confidence: 90, evidenceExcerpt: 'TypeScript', bucket: 'Languages' }],
      }),
      makeParsedPayload({
        fileName: 'resume_5.txt',
        skills: [{ name: 'PostgreSQL', category: 'Data, Databases & Storage', confidence: 84, evidenceExcerpt: 'PostgreSQL', bucket: 'Databases' }],
      }),
    ];

    let abortedSignals = 0;
    let callCount = 0;
    const fetchMock = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      callCount += 1;
      const currentCall = callCount;
      // Call 6 is a transient 503 failure, Call 7 is the Retry Analysis success for resume_6.pdf
      if (currentCall === 6) {
        return Promise.resolve({
          ok: false,
          status: 503,
          text: async () => 'Service Unavailable',
        });
      }
      if (currentCall === 7) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify(
              makeParsedPayload({
                fileName: 'resume_6_retried.pdf',
                skills: [{ name: 'Kubernetes', category: 'DevOps & Cloud Tools', confidence: 89, evidenceExcerpt: 'Kubernetes', bucket: 'DevOps' }],
              })
            ),
        });
      }
      // Call 8 stays pending until aborted by Call 9 (rapid replacement)
      if (currentCall === 8) {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            abortedSignals += 1;
            reject(new DOMException('The operation was aborted', 'AbortError'));
          });
        });
      }
      if (currentCall === 9) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify(
              makeParsedPayload({
                fileName: 'resume_final_fast.pdf',
                skills: [{ name: 'FastAPI', category: 'Programming & Frameworks', confidence: 91, evidenceExcerpt: 'FastAPI', bucket: 'Frameworks' }],
              })
            ),
        });
      }

      const payload = payloads[currentCall - 1];
      return Promise.resolve({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(payload),
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const view = navigateAndRender('/upload-resume');
    const fileInput = screen.getByLabelText('Upload resume file') as HTMLInputElement;

    const files = [
      { file: new File(['%PDF-1.4 #1'], 'resume_1.pdf', { type: 'application/pdf' }), skill: 'Python' },
      { file: new File(['%PDF-1.4 #2'], 'resume_2.pdf', { type: 'application/pdf' }), skill: 'Playwright' },
      { file: new File(['%PDF-1.4 #3'], 'resume_3.pdf', { type: 'application/pdf' }), skill: 'Docker' },
      { file: new File(['PK\x03\x04 #4'], 'resume_4.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), skill: 'TypeScript' },
      { file: new File(['Text resume #5'], 'resume_5.txt', { type: 'text/plain' }), skill: 'PostgreSQL' },
    ];

    for (const item of files) {
      fireEvent.change(fileInput, { target: { files: [item.file] } });
      await waitFor(() => {
        expect(screen.getByDisplayValue(item.skill)).toBeTruthy();
      });
    }

    // Upload 6 fails transiently -> Retry Analysis recovers cleanly
    const file6 = new File(['%PDF-1.4 #6'], 'resume_6_retried.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [file6] } });
    expect(await screen.findByText(/Backend parser unavailable/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Retry Analysis/i }));
    await waitFor(() => {
      expect(screen.getByDisplayValue('Kubernetes')).toBeTruthy();
    });

    // Save 6th resume skills before testing rapid-replacement abort
    fireEvent.click(screen.getByRole('button', { name: /Save Reviewed Skills to My Skills/i }));
    expect(await screen.findByText(/1 skills loaded into My Skills/i)).toBeTruthy();

    // Start upload 8 (pending) then immediately replace with upload 9 -> must abort upload 8 and render upload 9
    const slowFile = new File(['%PDF-1.4 slow'], 'slow.pdf', { type: 'application/pdf' });
    const fastFile = new File(['%PDF-1.4 fast'], 'resume_final_fast.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [slowFile] } });
    fireEvent.change(fileInput, { target: { files: [fastFile] } });

    await waitFor(() => {
      expect(abortedSignals).toBe(1);
      expect(screen.getByDisplayValue('FastAPI')).toBeTruthy();
    });

    view.unmount();
  });

  it('9. Expired preview session (auth_required) renders Refresh Preview Session recovery without corrupting existing StudentContext profile state', async () => {
    const firstPayload = makeParsedPayload({ fileName: 'initial_verified.pdf' });

    const fetchMock = vi.fn()
      // 1st upload succeeds and is saved
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(firstPayload),
      })
      // 2nd upload hits AI Studio cookie check redirect
      .mockResolvedValueOnce({
        type: 'opaqueredirect',
        ok: false,
        status: 0,
        url: 'https://ais-dev.example/api/resume/parse',
      });
    vi.stubGlobal('fetch', fetchMock);

    const view = navigateAndRender('/upload-resume');
    const fileInput = screen.getByLabelText('Upload resume file') as HTMLInputElement;

    fireEvent.change(fileInput, {
      target: { files: [new File(['%PDF-1.4 initial'], 'initial_verified.pdf', { type: 'application/pdf' })] },
    });
    expect(await screen.findByText(/Review & Confirm Extracted Skills/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Save Reviewed Skills to My Skills/i }));
    expect(await screen.findByText(/4 skills loaded into My Skills/i)).toBeTruthy();

    // Attempt subsequent upload that encounters auth_required redirect
    fireEvent.change(fileInput, {
      target: { files: [new File(['%PDF-1.4 third'], 'upload_after_expiry.pdf', { type: 'application/pdf' })] },
    });

    expect(await screen.findByText(/Preview session authorization needed/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Refresh Preview Session/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Retry Analysis/i })).toBeTruthy();

    // Verify previously saved profile & skills in localStorage remain 100% intact
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    expect(saved.resumeMetadata.fileName).toBe('initial_verified.pdf');
    expect(saved.skills.map((s: { name: string }) => s.name)).toContain('Playwright');

    view.unmount();
  });
});
