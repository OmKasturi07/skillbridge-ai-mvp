# SkillBridge AI — Student Portal (Target A)

AI-powered student skill gap analysis, career recommendation, and personalized learning roadmap platform built from the approved Google Stitch wireframes.

## Implemented Routes (Student Portal)

1. `/` — **Home Page**: Workspace entry point, live trajectory visualization, and 3-step journey overview.
2. `/upload-resume` — **Resume Upload**: Drag-and-drop or browse PDF, DOCX, DOC, and TXT resumes (up to 15 MB). Extracts real selectable text on the server (`pdf-parse` for PDF, `mammoth` for DOCX), analyzes with Gemini AI when `GEMINI_API_KEY` is set or transparently falls back to deterministic local text extraction (`demo-local`), lets students review/edit extracted skills before merging or replacing, and selects a target career or Path B career discovery.
3. `/my-skills` — **My Skills**: Categorized skill inventory across 5 domains, status filters (`All`, `Demonstrated`, `Developing`, `Unverified`), search, Evidence Inspector, skill locking, extraction reporting, inline editing, deletion, and custom skill creation.
4. `/explore-careers` — **Career Discovery**: Real-time compatibility scoring across 9 structured technology careers (`QA Automation Engineer`, `Python Backend Developer`, `AI Engineer`, `Machine Learning Engineer`, `Data Analyst`, `Data Scientist`, `Full Stack Developer`, `Software Engineer`, `Cloud / DevOps Associate`), Spotlight card, search, bookmarks, and sticky Deep Compare Mode.
5. `/skill-gap-analysis` — **Skill Gap Analysis**: Data-driven gap engine comparing student skills & proficiencies against target role requirements (`Demonstrated`, `Developing`, `Missing`, `Requires verification`), transparent Skill Coverage & Career Readiness formulas, Skill Detail Inspector, Top Priorities, and roadmap pinning.
6. `/my-roadmap` — **My Roadmap**: Dynamic 3-stage personalized learning roadmap, task status tracking (`not_started` / `in_progress` / `completed`), evidence link submission, code sandbox practice runner, advisor messaging, shareable snapshot, and filterable Free-First Resource Library.
7. `/dashboard` — **Student Dashboard**: Synchronized overview with Career Readiness ring, Curriculum & Skill Match Index bridge visualization, Strongest Skills, Next Move action card, Career Match Target summary, and resume/placement status cards.

## Local Development

```bash
npm install
npm run dev
```

The Express + Vite server runs on `http://localhost:3000`.

### Environment Variables

See `.env.example`:
- `PORT=3000`
- `GEMINI_API_KEY=` *(optional)* — When omitted, `/api/resume/parse` transparently uses local deterministic extraction on the real uploaded resume text and labels results as Demo Local Extraction. Never hardcode or expose API keys on the client.

## Build & Production Start

```bash
npm run build
npm run lint
npm start
```

## Target B Architecture Readiness

State persistence is isolated in `src/services/storageService.ts` (`localStorage` key `skillbridge_student_portal_state_v1`) with a typed repository interface and future Supabase PostgreSQL schema notes in `src/services/supabaseMigration.ts`.
