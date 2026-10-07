export type QuestionType = 'choice4' | 'ox' | 'choice2';

export interface Question {
  id: number;
  type: QuestionType;
  question: string;
  options: string[];
  note?: string; // e.g. for display in teacher guide or hints if any
}

export interface StudentCredentials {
  grade: string | number;
  class: string | number;
  classNum?: string | number;
  number: string | number;
  name: string;
}

export interface FinalResult {
  studentKey: string;
  name: string;
  grade: number;
  classNum: number;
  number: number;
  score: number;
  rankTitle: string;
  rankImage: string;
  rankComment: string;
  submittedAt?: string;
  elapsedSeconds?: number;
}

export interface LoginResponse {
  success?: boolean;
  ok?: boolean;
  status?: 'new' | 'progress' | 'submitted';
  error?: string;
  message?: string;
  studentKey?: string;
  name?: string;
  grade?: number | string;
  class?: number | string;
  classNum?: number | string;
  number?: number | string;
  hasProgress?: boolean;
  isSubmitted?: boolean;
  currentQuestion?: number;
  quizStartedAt?: string;
  savedAnswers?: Record<number, string>;
  finalResult?: FinalResult;
}

export interface RosterOptions {
  success?: boolean;
  ok?: boolean;
  grades: string[];
  classesByGrade: Record<string, string[]>;
  numbersByGradeClass: Record<string, string[]>;
  error?: string;
  message?: string;
}


export interface SaveProgressResponse {
  success?: boolean;
  ok?: boolean;
  error?: string;
  message?: string;
  updatedAt?: string;
}

export interface SubmitQuizResponse {
  success?: boolean;
  ok?: boolean;
  error?: string;
  message?: string;
  result?: FinalResult;
}

export interface DashboardStudent {
  studentKey: string;
  grade: number;
  classNum: number;
  number: number;
  name: string;
  score: number;
  rankTitle: string;
  submittedAt: string;
  elapsedSeconds: number;
}

export interface DashboardResponse {
  ok: boolean;
  success?: boolean;
  error?: string;
  message?: string;
  totalCount: number;
  students: DashboardStudent[];
}

export interface RankDefinition {
  id: string;
  title: string;
  minScore: number;
  maxScore: number;
  imageFileName: string;
  comment: string;
  roleDescription: string;
  badgeAccent: string;
  sealColor: string;
}
