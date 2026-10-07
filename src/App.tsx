import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { QuizPage } from './pages/QuizPage.tsx';
import { ResultPage } from './pages/ResultPage.tsx';
import { AdminLoginPage } from './pages/AdminLoginPage.tsx';
import { AdminDashboardPage } from './pages/AdminDashboardPage.tsx';
import { ResumeModal } from './components/ResumeModal.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { StudentCredentials, LoginResponse, FinalResult } from './types/index.ts';
import { loginStudent } from './services/api.ts';
import { getLocalProgress, clearLocalProgress } from './utils/quizStorage.ts';

type AppScreen = 'home' | 'login' | 'quiz' | 'result' | 'admin-login' | 'admin-dashboard';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('home');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Student State
  const [credentials, setCredentials] = useState<StudentCredentials | null>(null);
  const [studentKey, setStudentKey] = useState<string>('');
  const [quizStartedAt, setQuizStartedAt] = useState<string>('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [savedAnswers, setSavedAnswers] = useState<Record<number, string>>({});
  const [finalResult, setFinalResult] = useState<FinalResult | null>(null);
  const [isAlreadySubmittedNotice, setIsAlreadySubmittedNotice] = useState<boolean>(false);

  // Resume Modal State
  const [showResumeModal, setShowResumeModal] = useState<boolean>(false);
  const [pendingResumeData, setPendingResumeData] = useState<{
    credentials: StudentCredentials;
    studentKey: string;
    currentQuestion: number;
    quizStartedAt: string;
    savedAnswers: Record<number, string>;
  } | null>(null);

  // Admin Token State
  const [adminToken, setAdminToken] = useState<string>('');

  // Revalidate the student's server status before restoring a quiz after reload.
  useEffect(() => {
    let active = true;
    try {
      const raw = sessionStorage.getItem('CURRENT_QUIZ_STUDENT');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.credentials && parsed?.studentKey) {
          setCurrentScreen('login');
          loginStudent(parsed.credentials).then(response => {
            if (!active) return;
            if (response.success || response.ok) handleLoginSuccess(response, parsed.credentials);
            else sessionStorage.removeItem('CURRENT_QUIZ_STUDENT');
          }).catch(() => sessionStorage.removeItem('CURRENT_QUIZ_STUDENT'));
        }
      }
    } catch {
      sessionStorage.removeItem('CURRENT_QUIZ_STUDENT');
    }
    return () => { active = false; };
  }, []);

  // Handle successful student verification from LoginPage
  const handleLoginSuccess = (response: LoginResponse, creds: StudentCredentials) => {
    setCredentials(creds);
    const classVal = creds.class || creds.classNum;
    const key = response.studentKey || `${creds.grade}-${classVal}-${creds.number}`;
    setStudentKey(key);

    const isSubmitted = response.status === 'submitted' || response.isSubmitted;

    // 1. 이미 최종 제출한 학생인 경우 기존 결과 화면 표시 (재응시 불가)
    if (isSubmitted) {
      if (!response.finalResult) {
        sessionStorage.removeItem('CURRENT_QUIZ_STUDENT');
        setCurrentScreen('login');
        return;
      }
      clearLocalProgress(key);
      sessionStorage.removeItem('CURRENT_QUIZ_STUDENT');
      setFinalResult({
        ...response.finalResult,
        studentKey: key,
        name: creds.name.trim(),
        grade: Number(creds.grade),
        classNum: Number(classVal),
        number: Number(creds.number),
      });
      setIsAlreadySubmittedNotice(true);
      setCurrentScreen('result');
      return;
    }

    // 2. browser localStorage에 진행 데이터가 있는지 확인 (이어서 풀기)
    const localProgress = getLocalProgress(key);
    const hasLocalProgress = localProgress && localProgress.answers && Object.keys(localProgress.answers).length > 0;

    if (hasLocalProgress) {
      setPendingResumeData({
        credentials: creds,
        studentKey: key,
        currentQuestion: localProgress.currentQuestion || 1,
        quizStartedAt: localProgress.quizStartedAt || new Date().toISOString(),
        savedAnswers: localProgress.answers,
      });
      setShowResumeModal(true);
      return;
    }

    // 3. 신규 퀴즈 시작
    const nowIso = new Date().toISOString();
    setQuizStartedAt(nowIso);
    setCurrentQuestionIndex(0);
    setSavedAnswers({});
    setIsAlreadySubmittedNotice(false);

    sessionStorage.setItem(
      'CURRENT_QUIZ_STUDENT',
      JSON.stringify({
        credentials: creds,
        studentKey: key,
        quizStartedAt: nowIso,
      })
    );

    setCurrentScreen('quiz');
  };

  // Handle Resume Confirmation
  const handleConfirmResume = () => {
    if (pendingResumeData) {
      setCredentials(pendingResumeData.credentials);
      setStudentKey(pendingResumeData.studentKey);
      setCurrentQuestionIndex(Math.max(0, pendingResumeData.currentQuestion - 1));
      setQuizStartedAt(pendingResumeData.quizStartedAt);
      setSavedAnswers(pendingResumeData.savedAnswers);

      sessionStorage.setItem(
        'CURRENT_QUIZ_STUDENT',
        JSON.stringify({
          credentials: pendingResumeData.credentials,
          studentKey: pendingResumeData.studentKey,
          quizStartedAt: pendingResumeData.quizStartedAt,
        })
      );
    }
    setShowResumeModal(false);
    setPendingResumeData(null);
    setIsAlreadySubmittedNotice(false);
    setCurrentScreen('quiz');
  };

  // Handle Quiz Completion
  const handleQuizComplete = (result: FinalResult) => {
    sessionStorage.removeItem('CURRENT_QUIZ_STUDENT');
    if (studentKey) {
      clearLocalProgress(studentKey);
    }
    setFinalResult(result);
    setIsAlreadySubmittedNotice(false);
    setCurrentScreen('result');
  };

  // Return to Home
  const handleGoHome = () => {
    sessionStorage.removeItem('CURRENT_QUIZ_STUDENT');
    setCredentials(null);
    setStudentKey('');
    setFinalResult(null);
    setSavedAnswers({});
    setCurrentQuestionIndex(0);
    setIsAlreadySubmittedNotice(false);
    setCurrentScreen('home');
  };

  // Admin handlers
  const handleAdminLoginSuccess = (token: string) => {
    setAdminToken(token);
    setCurrentScreen('admin-dashboard');
  };

  const handleAdminLogout = () => {
    setAdminToken('');
    setCurrentScreen('home');
  };

  return (
    <div className="min-h-screen flex flex-col bg-hanji text-slate-800 antialiased selection:bg-rose-900 selection:text-white">
      {/* Top App Header */}
      <Header
        onOpenSettings={() => setIsSettingsOpen(true)}
        showSettingsBtn={currentScreen !== 'quiz'}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {currentScreen === 'home' && (
          <HomePage
            onStartQuiz={() => setCurrentScreen('login')}
            onGoToAdmin={() => setCurrentScreen('admin-login')}
          />
        )}

        {currentScreen === 'login' && (
          <LoginPage
            onBack={() => setCurrentScreen('home')}
            onLoginSuccess={handleLoginSuccess}
          />
        )}

        {currentScreen === 'quiz' && credentials && (
          <QuizPage
            credentials={credentials}
            studentKey={studentKey}
            initialAnswers={savedAnswers}
            initialQuestionIndex={currentQuestionIndex}
            quizStartedAt={quizStartedAt}
            onComplete={handleQuizComplete}
          />
        )}

        {currentScreen === 'result' && finalResult && (
          <ResultPage
            result={finalResult}
            isAlreadySubmittedNotice={isAlreadySubmittedNotice}
            onGoHome={handleGoHome}
          />
        )}

        {currentScreen === 'admin-login' && (
          <AdminLoginPage
            onBack={() => setCurrentScreen('home')}
            onLoginSuccess={handleAdminLoginSuccess}
          />
        )}

        {currentScreen === 'admin-dashboard' && (
          <AdminDashboardPage
            token={adminToken}
            onLogout={handleAdminLogout}
          />
        )}
      </main>

      {/* In-Progress Quiz Resume Modal */}
      <ResumeModal
        isOpen={showResumeModal}
        onConfirm={handleConfirmResume}
      />

      {/* Settings / Google Apps Script Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
