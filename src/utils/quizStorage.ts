export interface LocalQuizProgress {
  studentKey: string;
  currentQuestion: number; // 1-indexed (e.g. 1, 2, ... 20)
  quizStartedAt: string;
  answers: Record<number, string>;
  updatedAt?: string;
}

export function getLocalProgressKey(studentKey: string): string {
  const cleanKey = (studentKey || '').trim();
  return `hangulQuizProgress_${cleanKey}`;
}

export function getLocalProgress(studentKey: string): LocalQuizProgress | null {
  if (!studentKey) return null;
  try {
    const raw = localStorage.getItem(getLocalProgressKey(studentKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as LocalQuizProgress;
    }
  } catch (err) {
    console.error('Failed to parse local progress from localStorage:', err);
  }
  return null;
}

export function saveLocalProgress(studentKey: string, data: LocalQuizProgress): void {
  if (!studentKey) return;
  try {
    const payload: LocalQuizProgress = {
      ...data,
      studentKey,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(getLocalProgressKey(studentKey), JSON.stringify(payload));
  } catch (err) {
    console.error('Failed to save local progress to localStorage:', err);
  }
}

export function clearLocalProgress(studentKey: string): void {
  if (!studentKey) return;
  try {
    localStorage.removeItem(getLocalProgressKey(studentKey));
  } catch (err) {
    console.error('Failed to clear local progress from localStorage:', err);
  }
}
