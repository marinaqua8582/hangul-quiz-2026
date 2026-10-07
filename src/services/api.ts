import {
  StudentCredentials,
  LoginResponse,
  RosterOptions,
  SubmitQuizResponse,
  DashboardResponse,
  FinalResult,
} from '../types/index.ts';
import { getRankByScore } from '../data/ranks.ts';

function normalizeResult(result: Partial<FinalResult>, credentials: StudentCredentials): FinalResult {
  if (!Number.isFinite(result.score) || Number(result.score) < 0 || Number(result.score) > 100 || Number(result.score) % 5 !== 0) {
    throw new Error('서버 결과 점수를 확인할 수 없습니다. 교사에게 문의하세요.');
  }
  const rank = getRankByScore(Number(result.score));
  const classNum = Number(credentials.class || credentials.classNum);
  return {
    studentKey: `${credentials.grade}-${classNum}-${credentials.number}`,
    name: credentials.name.trim(),
    grade: Number(credentials.grade),
    classNum,
    number: Number(credentials.number),
    score: Number(result.score),
    rankTitle: rank.title,
    rankImage: `/assets/ranks/${rank.imageFileName}`,
    rankComment: rank.comment,
  };
}

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
  let customUrl = '';
  try { customUrl = localStorage.getItem('CUSTOM_APPS_SCRIPT_URL') || ''; } catch { /* Browser storage may be disabled. */ }
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
  const endpointSummary = 'Apps Script /exec';

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
    console.warn(`[AppsScript] action=${actionName} status=${response.status} success=false`);
  }

  return data;
}

export async function getRosterOptions(): Promise<RosterOptions> {

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

export async function loginStudent(credentials: StudentCredentials): Promise<LoginResponse> {
  const trimmedName = credentials.name.trim();
  const cleanGrade = String(credentials.grade).replace(/[^0-9]/g, '').trim();
  const cleanClass = String(credentials.class || credentials.classNum).replace(/[^0-9]/g, '').trim();
  const cleanNumber = String(credentials.number).replace(/[^0-9]/g, '').trim();
  const studentKey = `${cleanGrade}-${cleanClass}-${cleanNumber}`;

  // If live Google Apps Script is configured:

    try {
      const response = await callAppsScript<LoginResponse & { result?: Partial<FinalResult> }>({
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

      const submitted = response.status === 'submitted' || response.isSubmitted === true;
      const result = response.finalResult || response.result;
      if (submitted && !result) throw new Error('기존 제출 결과를 확인할 수 없습니다. 교사에게 문의하세요.');
      return {
        success: true,
        ok: true,
        studentKey,
        status: submitted ? 'submitted' : response.status,
        isSubmitted: submitted,
        finalResult: submitted && result ? normalizeResult(result, credentials) : undefined,
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
        success: true,
        ok: true,
        result: response.result ? normalizeResult(response.result, {
          grade: cleanGrade, class: cleanClass, number: cleanNumber, name: trimmedName,
        }) : undefined,
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

export async function adminLogin(password: string): Promise<{
  ok: boolean;
  success?: boolean;
  token?: string;
  message?: string;
  error?: string;
}> {
  // Pass the raw user input password as-is (do NOT hash SHA-256 or base64 encode on client)

    try {
      const response = await callAppsScript<{
        ok?: boolean;
        success?: boolean;
        token?: string;
        message?: string;
        error?: string;
      }>({
        action: 'adminLogin',
        password: typeof password === 'string' ? password : '',
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


    try {
      const response = await callAppsScript<DashboardResponse & { participantCount?: number }>({
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
        students: (response.students || []).map(student => {
          const row = student as typeof student & { class?: number | string };
          const grade = Number(row.grade);
          const classNum = Number(row.classNum ?? row.class);
          const number = Number(row.number);
          return { ...row, grade, classNum, number, studentKey: row.studentKey || `${grade}-${classNum}-${number}` };
        }),
        totalCount: response.totalCount ?? response.participantCount ?? (response.students || []).length,
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
