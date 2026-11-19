import type { PersistedStudentState } from '../types/skillbridge';

/**
 * Target B Migration Boundary (Documentation & Clean Interface).
 *
 * Target A uses localStorage persistence via `storageService.ts` for a zero-credential
 * live review demonstration. In Target B, this repository interface can be implemented
 * with Supabase PostgreSQL, Supabase Auth, Supabase Storage, and Row Level Security
 * without rewriting UI components or domain engines.
 */
export interface StudentRepository {
  mode: 'local-demo' | 'supabase-cloud';
  loadState(studentId: string): Promise<PersistedStudentState>;
  saveState(studentId: string, state: PersistedStudentState): Promise<void>;
  uploadResumeArtifact?(studentId: string, file: File): Promise<{ storagePath: string }>;
}

export const TARGET_B_SUPABASE_SCHEMA_NOTES = {
  tables: [
    'student_profiles (id uuid primary key references auth.users, full_name, degree, cohort, institution, placement_id)',
    'student_resumes (id uuid, student_id uuid, file_name, storage_path, extraction_mode, summary, parsed_json, uploaded_at)',
    'student_skills (id uuid, student_id uuid, name, category, status, confidence, source, evidence_excerpt, locked)',
    'student_roadmaps (id uuid, student_id uuid, target_career_id, task_code, status, evidence_url, commit_hash, updated_at)',
  ],
  rlsPolicy: 'CREATE POLICY "Students manage own rows" ON table USING (auth.uid() = student_id);',
};
