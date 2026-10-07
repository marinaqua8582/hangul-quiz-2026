import {
  StudentCredentials,
  LoginResponse,
  RosterOptions,
  SaveProgressResponse,
  SubmitQuizResponse,
  DashboardResponse,
  FinalResult,
} from '../types/index.ts';
import { getRankByScore } from '../data/ranks.ts';

// Server-side answer key used ONLY for the local simulation / mock fallback mode.
// In production, the Google Apps Script Web App performs all grading on the server.
const MOCK_SERVER_ANSWER_KEY: Record<number, string> = {
  1: '세종',
  2: 'O',
  3: 'X',
  4: '불쌍하고 가엾다',
  5: '어리석다',
  6: '리더십',
  7: '슈림프',
  8: '며칠',
  9: '웬',
  10: '금세 끝났다',
  11: '설렘',
  12: '오랜만',
  13: '얼굴이 희고 키가 헌칠한 모습',
  14: '맥없이 축 늘어진 모습',
  15: '외양이 말쑥하고 똑똑해 보이는 사람',
  16: '격에 맞지 않아 어울리지 않는 상황',
  17: '도무지 일어날 가망이 없는 일',
  18: '믿음성이 있고 믿을 만하다',
  19: '초저녁 서쪽 하늘에 보이는 금성',
  20: '충분히 익어 저절로 벌어진 과실',
};

// Initial sample roster for local testing if Google Sheets is not yet configured
const INITIAL_SAMPLE_ROSTER = [
  { grade: 2, classNum: 5, number: 25, name: '김과학', active: true },
  { grade: 2, classNum: 3, number: 15, name: '홍길동', active: true },
  { grade: 2, classNum: 3, number: 16, name: '김한글', active: true },
  { grade: 2, classNum: 1, number: 1, name: '김민준', active: true },
  { grade: 2, classNum: 2, number: 2, name: '이서연', active: true },
  { grade: 2, classNum: 4, number: 3, name: '박세종', active: true },
];

export function sanitizeScriptUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let url = rawUrl.trim();
  if (!url) return '';

  // Remove any trailing slashes
  url = url.replace(/\/+$/, '');

  // If someone appended an action to the path after /exec (e.g., /exec/saveProgress, /exec/adminLogin)
  const execIdx = url.indexOf('/exec');
  if (execIdx !== -1) {
    url = url.substring(0, execIdx + 5);
  } else {
    // If someone replaced /exec with an action like /saveProgress or /adminLogin
    const knownActions = [
      '/saveProgress',
      '/adminLogin',
      '/loginStudent',
      '/loadProgress',
      '/submitQuiz',
      '/getDashboard',
      '/getRosterOptions',
    ];
    for (const act of knownActions) {
      if (url.endsWith(act)) {
        url = url.substring(0, url.length - act.length) + '/exec';
        break;
      }
    }
  }

  return url.trim();
}

export function getScriptUrl(): string {
  const customUrl = localStorage.getItem('CUSTOM_APPS_SCRIPT_URL');
  if (customUrl && customUrl.trim().length > 0) {
    return sanitizeScriptUrl(customUrl);
  }
  const envUrl = import.meta.env.VITE_APPS_SCRIPT_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return sanitizeScriptUrl(envUrl);
  }
  return '';
}

export function setCustomScriptUrl(url: string): void {
  const sanitized = sanitizeScriptUrl(url);
  if (!sanitized) {
    localStorage.removeItem('CUSTOM_APPS_SCRIPT_URL');
  } else {
    localStorage.setItem('CUSTOM_APPS_SCRIPT_URL', sanitized);
  }
}

export function isUsingLiveApi(): boolean {
  return getScriptUrl().length > 0;
}

// Helper to make POST requests to Google Apps Script Web App
async function callAppsScript<T extends { success?: boolean; ok?: boolean; error?: string; message?: string }>(
  payload: Record<string, unknown>
): Promise<T> {
  const url = getScriptUrl();
  if (!url) {
    throw new Error('Google Apps Script URL이 설정되지 않았습니다.');
  }

  const actionName = String(payload.action || 'unknown');
  const endpointSummary = url.length > 50 ? `${url.slice(0, 40)}.../exec` : url;

  let response: Response;
  try {
    // Google Apps Script Web App requires text/plain body to prevent CORS preflight OPTIONS blockage
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });
  } catch (netErr: unknown) {
    console.error(`[AppsScript] action=${actionName} network error:`, netErr);
    throw new Error(netErr instanceof Error ? netErr.message : '네트워크 요청 실패');
  }

  if (!response.ok) {
    console.error(`[AppsScript] action=${actionName} url=${endpointSummary} status=${response.status}`);
    throw new Error(`서버 통신 실패 (HTTP ${response.status})`);
  }

  const text = await response.text();
  let data: T;
  try {
    data = JSON.parse(text) as T;
  } catch (parseErr) {
    console.error(`[AppsScript] action=${actionName} JSON parse error:`, parseErr);
    throw new Error('서버 응답 파싱 실패 (올바른 JSON 형식이 아닙니다)');
  }

  // Debug log (never log passwords or student personal info)
  const isSuccess = data.success === true || data.ok === true;
  if (isSuccess) {
    console.log(`[AppsScript] action=${actionName} url=${endpointSummary} status=${response.status} success=true`);
  } else {
    const errorMsg = data.error || data.message || '알 수 없는 오류';
    console.warn(`[AppsScript] action=${actionName} url=${endpointSummary} status=${response.status} success=false error="${errorMsg}"`);
  }

  return data;
}

// ----------------------------------------------------
// LOCAL SIMULATION / MOCK STORAGE ENGINE
// ----------------------------------------------------

interface MockProgressRow {
  studentKey: string;
  grade: number;
  classNum: number;
  number: number;
  name: string;
  answers: Record<number, string>;
  currentQuestion: number;
  quizStartedAt: string;
  updatedAt: string;
  submitted: boolean;
}

interface MockSubmissionRow {
  studentKey: string;
  grade: number;
  classNum: number;
  number: number;
  name: string;
  answers: Record<number, string>;
  correctCount: number;
  score: number;
  rankTitle: string;
  rankImage: string;
  rankComment: string;
  elapsedSeconds: number;
  quizStartedAt: string;
  submittedAt: string;
}

const MOCK_STORAGE = {
  getProgressMap(): Record<string, MockProgressRow> {
    try {
      const raw = localStorage.getItem('MOCK_QUIZ_PROGRESS');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  },
  saveProgressMap(map: Record<string, MockProgressRow>): void {
    localStorage.setItem('MOCK_QUIZ_PROGRESS', JSON.stringify(map));
  },
  getSubmissionsMap(): Record<string, MockSubmissionRow> {
    try {
      const raw = localStorage.getItem('MOCK_QUIZ_SUBMISSIONS');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  },
  saveSubmissionsMap(map: Record<string, MockSubmissionRow>): void {
    localStorage.setItem('MOCK_QUIZ_SUBMISSIONS', JSON.stringify(map));
  },
};

// ----------------------------------------------------
// PUBLIC API METHODS
// ----------------------------------------------------

export async function getRosterOptions(): Promise<RosterOptions> {
  if (isUsingLiveApi()) {
    try {
      const response = await callAppsScript<RosterOptions>({
        action: 'getRosterOptions',
      });
      return response;
    } catch (err: unknown) {
      console.error('Apps Script getRosterOptions error:', err);
      return {
        success: false,
        ok: false,
        grades: [],
        classesByGrade: {},
        numbersByGradeClass: {},
        error: '학생 명단을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
        message: '학생 명단을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
      };
    }
  }

  // Local Simulation / Mock Mode (2학년 1~5반, 25번 김과학 포함)
  return {
    success: true,
    ok: true,
    grades: ['2'],
    classesByGrade: {
      '2': ['1', '2', '3', '4', '5'],
    },
    numbersByGradeClass: {
      '2-1': ['1', '2', '3'],
      '2-2': ['1', '2', '3'],
      '2-3': ['1', '2', '15', '16'],
      '2-4': ['1', '2', '3'],
      '2-5': ['1', '2', '25', '26'],
    },
  };
}

export async function loginStudent(credentials: StudentCredentials): Promise<LoginResponse> {
  const trimmedName = credentials.name.trim();
  const cleanGrade = String(credentials.grade).replace(/[^0-9]/g, '').trim();
  const cleanClass = String(credentials.class || credentials.classNum).replace(/[^0-9]/g, '').trim();
  const cleanNumber = String(credentials.number).replace(/[^0-9]/g, '').trim();
  const studentKey = `${cleanGrade}-${cleanClass}-${cleanNumber}`;

  // If live Google Apps Script is configured:
  if (isUsingLiveApi()) {
    try {
      const response = await callAppsScript<LoginResponse>({
        action: 'loginStudent',
        grade: cleanGrade,
        class: cleanClass,
        number: cleanNumber,
        name: trimmedName,
      });

      const isSuccess = response.success === true || response.ok === true;
      if (!isSuccess) {
        const errorMsg = response.error || response.message || '학년, 반, 번호, 이름을 다시 확인해 주세요.';
        return {
          success: false,
          ok: false,
          error: errorMsg,
          message: errorMsg,
        };
      }

      return {
        ...response,
        success: true,
        ok: true,
      };
    } catch (err: unknown) {
      console.error('Apps Script login error:', err);
      const errMsg = err instanceof Error ? err.message : '서버와 통신할 수 없습니다.';
      return {
        success: false,
        ok: false,
        error: errMsg,
        message: errMsg,
      };
    }
  }

  // Local Simulation / Mock Mode
  const foundInSample = INITIAL_SAMPLE_ROSTER.find(
    (s) =>
      String(s.grade) === cleanGrade &&
      String(s.classNum) === cleanClass &&
      String(s.number) === cleanNumber &&
      s.name.trim() === trimmedName &&
      s.active
  );

  const isValid = !!foundInSample || trimmedName.length >= 2;

  if (!isValid) {
    return {
      success: false,
      ok: false,
      error: '학년, 반, 번호, 이름을 다시 확인해 주세요.',
      message: '학년, 반, 번호, 이름을 다시 확인해 주세요.',
    };
  }

  // Check if student already submitted
  const submissions = MOCK_STORAGE.getSubmissionsMap();
  const existingSub = submissions[studentKey];
  if (existingSub) {
    return {
      success: true,
      ok: true,
      status: 'submitted',
      studentKey,
      name: existingSub.name,
      grade: existingSub.grade,
      class: existingSub.classNum,
      classNum: existingSub.classNum,
      number: existingSub.number,
      isSubmitted: true,
      hasProgress: true,
      finalResult: {
        studentKey,
        name: existingSub.name,
        grade: existingSub.grade,
        classNum: existingSub.classNum,
        number: existingSub.number,
        score: existingSub.score,
        rankTitle: existingSub.rankTitle,
        rankImage: existingSub.rankImage,
        rankComment: existingSub.rankComment,
        submittedAt: existingSub.submittedAt,
        elapsedSeconds: existingSub.elapsedSeconds,
      },
    };
  }

  // Check if student has in-progress quiz
  const progressMap = MOCK_STORAGE.getProgressMap();
  const existingProg = progressMap[studentKey];
  if (existingProg && !existingProg.submitted) {
    return {
      success: true,
      ok: true,
      status: 'progress',
      studentKey,
      name: trimmedName,
      grade: Number(cleanGrade),
      class: Number(cleanClass),
      classNum: Number(cleanClass),
      number: Number(cleanNumber),
      isSubmitted: false,
      hasProgress: true,
      currentQuestion: existingProg.currentQuestion,
      quizStartedAt: existingProg.quizStartedAt,
      savedAnswers: existingProg.answers || {},
    };
  }

  // Fresh first-time student
  return {
    success: true,
    ok: true,
    status: 'new',
    studentKey,
    name: trimmedName,
    grade: Number(cleanGrade),
    class: Number(cleanClass),
    classNum: Number(cleanClass),
    number: Number(cleanNumber),
    isSubmitted: false,
    hasProgress: false,
    currentQuestion: 1,
    savedAnswers: {},
  };
}


export async function saveProgress(params: {
  studentKey: string;
  grade: number | string;
  class?: number | string;
  classNum?: number | string;
  number: number | string;
  name: string;
  answers: Record<number, string>;
  currentQuestion: number;
  quizStartedAt: string;
}): Promise<SaveProgressResponse> {
  const now = new Date().toISOString();
  const classVal = params.class !== undefined ? params.class : params.classNum;
  const cleanGrade = String(params.grade).replace(/[^0-9]/g, '').trim();
  const cleanClass = String(classVal).replace(/[^0-9]/g, '').trim();
  const cleanNumber = String(params.number).replace(/[^0-9]/g, '').trim();
  const trimmedName = params.name.trim();

  if (isUsingLiveApi()) {
    try {
      const response = await callAppsScript<SaveProgressResponse>({
        action: 'saveProgress',
        studentKey: params.studentKey,
        grade: cleanGrade,
        class: cleanClass,
        number: cleanNumber,
        name: trimmedName,
        answers: params.answers,
        currentQuestion: Number(params.currentQuestion),
        quizStartedAt: params.quizStartedAt,
      });

      const isSuccess = response.success === true || response.ok === true;
      if (!isSuccess) {
        const errorMsg = response.error || response.message || '진행 상황 저장에 실패했습니다.';
        return {
          success: false,
          ok: false,
          error: errorMsg,
          message: errorMsg,
        };
      }

      return {
        ...response,
        success: true,
        ok: true,
      };
    } catch (err: unknown) {
      console.error('Apps Script saveProgress network error:', err);
      const networkMsg = err instanceof Error ? err.message : '네트워크 통신 오류';
      return {
        success: false,
        ok: false,
        error: networkMsg,
        message: networkMsg,
      };
    }
  }

  // Mock Mode: Upsert by studentKey
  try {
    const progressMap = MOCK_STORAGE.getProgressMap();
    progressMap[params.studentKey] = {
      studentKey: params.studentKey,
      grade: Number(cleanGrade || params.grade),
      classNum: Number(cleanClass || classVal),
      number: Number(cleanNumber || params.number),
      name: trimmedName,
      answers: params.answers,
      currentQuestion: params.currentQuestion,
      quizStartedAt: params.quizStartedAt,
      updatedAt: now,
      submitted: false,
    };
    MOCK_STORAGE.saveProgressMap(progressMap);
    return { success: true, ok: true, updatedAt: now };
  } catch (err) {
    return {
      success: false,
      ok: false,
      error: '로컬 진행 상황 저장 중 오류가 발생했습니다.',
      message: '로컬 진행 상황 저장 중 오류가 발생했습니다.',
    };
  }
}

export async function submitQuiz(params: {
  studentKey: string;
  grade: number | string;
  class?: number | string;
  classNum?: number | string;
  number: number | string;
  name: string;
  answers: Record<number, string>;
  quizStartedAt: string;
}): Promise<SubmitQuizResponse> {
  const classVal = params.class !== undefined ? params.class : params.classNum;
  const cleanGrade = String(params.grade).replace(/[^0-9]/g, '').trim();
  const cleanClass = String(classVal).replace(/[^0-9]/g, '').trim();
  const cleanNumber = String(params.number).replace(/[^0-9]/g, '').trim();
  const trimmedName = params.name.trim();

  if (isUsingLiveApi()) {
    try {
      const response = await callAppsScript<SubmitQuizResponse>({
        action: 'submitQuiz',
        studentKey: params.studentKey,
        grade: cleanGrade,
        class: cleanClass,
        number: cleanNumber,
        name: trimmedName,
        answers: params.answers,
        quizStartedAt: params.quizStartedAt,
      });

      const isSuccess = response.success === true || response.ok === true;
      if (!isSuccess) {
        const errorMsg = response.error || response.message || '제출 처리에 실패했습니다.';
        return {
          success: false,
          ok: false,
          error: errorMsg,
          message: errorMsg,
        };
      }

      return {
        ...response,
        success: true,
        ok: true,
      };
    } catch (err: unknown) {
      console.error('Apps Script submitQuiz error:', err);
      const networkMsg = err instanceof Error ? err.message : '네트워크 통신 오류';
      return {
        success: false,
        ok: false,
        error: networkMsg,
        message: networkMsg,
      };
    }
  }

  // Mock Mode Idempotent Submit
  const submissions = MOCK_STORAGE.getSubmissionsMap();
  const existing = submissions[params.studentKey];
  if (existing) {
    return {
      ok: true,
      result: {
        studentKey: existing.studentKey,
        name: existing.name,
        grade: existing.grade,
        classNum: existing.classNum,
        number: existing.number,
        score: existing.score,
        rankTitle: existing.rankTitle,
        rankImage: existing.rankImage,
        rankComment: existing.rankComment,
        submittedAt: existing.submittedAt,
        elapsedSeconds: existing.elapsedSeconds,
      },
    };
  }

  // Compute server-side score (5 pts per question, total 100)
  let correctCount = 0;
  for (let qId = 1; qId <= 20; qId++) {
    const studentAns = params.answers[qId];
    const correctAns = MOCK_SERVER_ANSWER_KEY[qId];
    if (studentAns && studentAns.trim() === correctAns.trim()) {
      correctCount++;
    }
  }

  const score = correctCount * 5;
  const rank = getRankByScore(score);
  const now = new Date();
  const startDate = new Date(params.quizStartedAt || now.toISOString());
  const elapsedSeconds = Math.max(1, Math.round((now.getTime() - startDate.getTime()) / 1000));

  const newSub: MockSubmissionRow = {
    studentKey: params.studentKey,
    grade: Number(params.grade),
    classNum: Number(classVal),
    number: Number(params.number),
    name: params.name,
    answers: params.answers,
    correctCount,
    score,
    rankTitle: rank.title,
    rankImage: `/assets/ranks/${rank.imageFileName}`,
    rankComment: rank.comment,
    elapsedSeconds,
    quizStartedAt: params.quizStartedAt || now.toISOString(),
    submittedAt: now.toISOString(),
  };

  submissions[params.studentKey] = newSub;
  MOCK_STORAGE.saveSubmissionsMap(submissions);

  // Update progress row
  const progressMap = MOCK_STORAGE.getProgressMap();
  if (progressMap[params.studentKey]) {
    progressMap[params.studentKey].submitted = true;
    MOCK_STORAGE.saveProgressMap(progressMap);
  }

  return {
    ok: true,
    result: {
      studentKey: newSub.studentKey,
      name: newSub.name,
      grade: newSub.grade,
      classNum: newSub.classNum,
      number: newSub.number,
      score: newSub.score,
      rankTitle: newSub.rankTitle,
      rankImage: newSub.rankImage,
      rankComment: newSub.rankComment,
      submittedAt: newSub.submittedAt,
      elapsedSeconds: newSub.elapsedSeconds,
    },
  };
}

export async function adminLogin(password: string): Promise<{
  ok: boolean;
  success?: boolean;
  token?: string;
  message?: string;
  error?: string;
}> {
  // Pass the raw user input password as-is (do NOT hash SHA-256 or base64 encode on client)
  if (isUsingLiveApi()) {
    try {
      const response = await callAppsScript<{
        ok?: boolean;
        success?: boolean;
        token?: string;
        message?: string;
        error?: string;
      }>({
        action: 'adminLogin',
        password: typeof password === 'string' ? password.trim() : '',
      });

      const isSuccess = (response.success === true || response.ok === true) && !!response.token;
      if (!isSuccess) {
        const errorMsg = response.error || response.message || '관리자 비밀번호가 일치하지 않습니다.';
        return {
          ok: false,
          success: false,
          message: errorMsg,
          error: errorMsg,
        };
      }

      // Persist admin token for the session
      sessionStorage.setItem('ADMIN_SESSION_TOKEN', response.token as string);

      return {
        ok: true,
        success: true,
        token: response.token,
      };
    } catch (err: unknown) {
      console.error('Apps Script adminLogin error:', err);
      const errMsg = err instanceof Error ? err.message : '서버와 통신할 수 없습니다.';
      return {
        ok: false,
        success: false,
        message: errMsg,
        error: errMsg,
      };
    }
  }

  // Mock Mode: default password
  if (password === 'admin1234' || password === 'hangul2026!' || password === '1234') {
    const mockToken = 'mock-admin-token-' + Date.now();
    sessionStorage.setItem('ADMIN_SESSION_TOKEN', mockToken);
    return { ok: true, success: true, token: mockToken };
  }
  return { ok: false, success: false, message: '관리자 비밀번호가 일치하지 않습니다.', error: '관리자 비밀번호가 일치하지 않습니다.' };
}

export async function getDashboard(params: {
  token?: string;
  grade?: number | string | 'all';
  class?: number | string | 'all';
  classNum?: number | string | 'all';
}): Promise<DashboardResponse> {
  const token = params.token || sessionStorage.getItem('ADMIN_SESSION_TOKEN') || '';
  const classVal = params.class !== undefined ? params.class : params.classNum;

  const gradeStr = params.grade === 'all' || !params.grade ? '' : String(params.grade).replace(/[^0-9]/g, '').trim();
  const classStr = classVal === 'all' || !classVal ? '' : String(classVal).replace(/[^0-9]/g, '').trim();

  if (isUsingLiveApi()) {
    try {
      const response = await callAppsScript<DashboardResponse>({
        action: 'getDashboard',
        token,
        grade: gradeStr,
        class: classStr,
        classNum: classStr,
      });

      const isSuccess = response.success === true || response.ok === true;
      if (!isSuccess) {
        const errorMsg = response.error || response.message || '대시보드 데이터를 불러오지 못했습니다.';
        return {
          ok: false,
          success: false,
          error: errorMsg,
          message: errorMsg,
          totalCount: 0,
          students: [],
        };
      }

      return {
        ...response,
        ok: true,
        success: true,
        students: response.students || [],
        totalCount: response.totalCount !== undefined ? response.totalCount : (response.students || []).length,
      };
    } catch (err: unknown) {
      console.error('Apps Script getDashboard error:', err);
      const errMsg = err instanceof Error ? err.message : '대시보드 데이터를 불러오지 못했습니다.';
      return {
        ok: false,
        success: false,
        error: errMsg,
        message: errMsg,
        totalCount: 0,
        students: [],
      };
    }
  }

  // Mock Mode: retrieve and filter Submissions
  const submissions = MOCK_STORAGE.getSubmissionsMap();
  let list = Object.values(submissions);

  // If mock is empty, seed a few dummy submissions for demo presentation if empty
  if (list.length === 0) {
    const seedTime = new Date().toISOString();
    list = [
      {
        studentKey: '2-3-15',
        grade: 2,
        classNum: 3,
        number: 15,
        name: '홍길동',
        answers: {},
        correctCount: 19,
        score: 95,
        rankTitle: '한글 대왕',
        rankImage: '/assets/ranks/king.png',
        rankComment: '과인이 인정하노라!\n그대야말로 오늘의 진정한 한글 대왕이로다.',
        elapsedSeconds: 420,
        quizStartedAt: seedTime,
        submittedAt: seedTime,
      },
      {
        studentKey: '2-3-16',
        grade: 2,
        classNum: 3,
        number: 16,
        name: '김한글',
        answers: {},
        correctCount: 17,
        score: 85,
        rankTitle: '한글 장원',
        rankImage: '/assets/ranks/jangwon.png',
        rankComment: '훌륭하도다!\n한글 과거시험이 있었다면 장원급제했을 것이로다.',
        elapsedSeconds: 510,
        quizStartedAt: seedTime,
        submittedAt: seedTime,
      },
      {
        studentKey: '2-3-18',
        grade: 2,
        classNum: 3,
        number: 18,
        name: '이세종',
        answers: {},
        correctCount: 15,
        score: 75,
        rankTitle: '한글 장군',
        rankImage: '/assets/ranks/general.png',
        rankComment: '제법 실력이 있구나!\n당당한 한글 장군으로 인정하노라.',
        elapsedSeconds: 380,
        quizStartedAt: seedTime,
        submittedAt: seedTime,
      },
      {
        studentKey: '1-1-1',
        grade: 1,
        classNum: 1,
        number: 1,
        name: '김민준',
        answers: {},
        correctCount: 13,
        score: 65,
        rankTitle: '한글 선비',
        rankImage: '/assets/ranks/scholar.png',
        rankComment: '글 읽고 글 쓰는 멋이 있구나!\n조금 더 정진하면 더 높은 자리에 오를 수 있다.',
        elapsedSeconds: 490,
        quizStartedAt: seedTime,
        submittedAt: seedTime,
      },
    ];
  }

  if (params.grade && params.grade !== 'all') {
    list = list.filter((s) => s.grade === Number(params.grade));
  }
  if (params.classNum && params.classNum !== 'all') {
    list = list.filter((s) => s.classNum === Number(params.classNum));
  }

  // Sort: grade ASC -> classNum ASC -> number ASC
  list.sort((a, b) => {
    if (a.grade !== b.grade) return a.grade - b.grade;
    if (a.classNum !== b.classNum) return a.classNum - b.classNum;
    return a.number - b.number;
  });

  return {
    ok: true,
    totalCount: list.length,
    students: list.map((s) => ({
      studentKey: s.studentKey,
      grade: s.grade,
      classNum: s.classNum,
      number: s.number,
      name: s.name,
      score: s.score,
      rankTitle: s.rankTitle,
      submittedAt: s.submittedAt,
      elapsedSeconds: s.elapsedSeconds,
    })),
  };
}
