import { createInitialDemoState, DEMO_STATE_VERSION } from '../data/demoStudent';
import type { PersistedStudentState } from '../types/skillbridge';

export const STORAGE_KEY = 'skillbridge_student_portal_state_v1';

function isValidPersistedState(data: unknown): data is PersistedStudentState {
  if (!data || typeof data !== 'object') return false;
  const candidate = data as Partial<PersistedStudentState>;
  return (
    typeof candidate.version === 'number' &&
    Boolean(candidate.profile && typeof candidate.profile.fullName === 'string') &&
    Boolean(candidate.resumeMetadata && typeof candidate.resumeMetadata.fileName === 'string') &&
    Array.isArray(candidate.skills) &&
    typeof candidate.targetCareerId === 'string' &&
    typeof candidate.roadmapTaskProgress === 'object' &&
    candidate.roadmapTaskProgress !== null
  );
}

export function loadStudentState(): { state: PersistedStudentState; recoveredFromCorruption: boolean } {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { state: createInitialDemoState(), recoveredFromCorruption: false };
    }
    const parsed: unknown = JSON.parse(raw);
    if (!isValidPersistedState(parsed) || parsed.version !== DEMO_STATE_VERSION) {
      return { state: createInitialDemoState(), recoveredFromCorruption: true };
    }
    return {
      state: {
        ...createInitialDemoState(),
        ...parsed,
      },
      recoveredFromCorruption: false,
    };
  } catch {
    return { state: createInitialDemoState(), recoveredFromCorruption: true };
  }
}

export function saveStudentState(state: PersistedStudentState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota errors gracefully
  }
}

export function clearStudentState(): PersistedStudentState {
  const fresh = createInitialDemoState();
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  } catch {
    // Ignore storage errors
  }
  return fresh;
}
