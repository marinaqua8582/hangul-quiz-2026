import React, { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { Question, StudentCredentials, FinalResult } from '../types/index.ts';
import { QUIZ_QUESTIONS } from '../data/questions.ts';
import { submitQuiz } from '../services/api.ts';
import { saveLocalProgress, clearLocalProgress } from '../utils/quizStorage.ts';
import { ConfirmModal } from '../components/ConfirmModal.tsx';

interface QuizPageProps {
  credentials: StudentCredentials;
  studentKey: string;
  initialAnswers?: Record<number, string>;
  initialQuestionIndex?: number;
  quizStartedAt: string;
  onComplete: (result: FinalResult) => void;
}

export const QuizPage: React.FC<QuizPageProps> = ({
  credentials,
  studentKey,
  initialAnswers = {},
  initialQuestionIndex = 0,
  quizStartedAt,
  onComplete,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(
    Math.min(Math.max(initialQuestionIndex, 0), QUIZ_QUESTIONS.length - 1)
  );
  const [answers, setAnswers] = useState<Record<number, string>>(initialAnswers);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const submissionLock = useRef(false);

  const currentQuestion: Question = QUIZ_QUESTIONS[currentIndex];
  const selectedAnswer = answers[currentQuestion.id] || '';
  const isLastQuestion = currentIndex === QUIZ_QUESTIONS.length - 1;
  const progressPercent = Math.round(((currentIndex + 1) / QUIZ_QUESTIONS.length) * 100);

  // Handle option select (tactile click, saves immediately to React state & localStorage)
  const handleSelectOption = (option: string, optionIdx?: number) => {
    setErrorMessage('');
    let answerValue = option;
    if (currentQuestion.type === 'ox') {
      answerValue = option; // 'O' or 'X'
    } else {
      const idx = optionIdx !== undefined ? optionIdx : currentQuestion.options.indexOf(option);
      answerValue = ['A', 'B', 'C', 'D'][idx] || option;
    }

    const updatedAnswers = {
      ...answers,
      [currentQuestion.id]: answerValue,
    };

    setAnswers(updatedAnswers);

    // Save to localStorage immediately
    saveLocalProgress(studentKey, {
      studentKey,
      currentQuestion: currentIndex + 1,
      quizStartedAt,
      answers: updatedAnswers,
    });
  };

  // Navigate to previous question (allows changing answers freely before submit)
  const handlePrev = () => {
    if (currentIndex > 0) {
      setErrorMessage('');
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);

      saveLocalProgress(studentKey, {
        studentKey,
        currentQuestion: prevIndex + 1,
        quizStartedAt,
        answers,
      });
    }
  };

  // Navigate to next question (saves to localStorage and advances immediately)
  const handleNext = () => {
    // 1. Validation: Answer must be selected
    if (!selectedAnswer) {
      setErrorMessage('답을 선택해 주세요.');
      return;
    }

    setErrorMessage('');
    const nextIndex = currentIndex + 1;
    const nextQuestionNumber = nextIndex + 1;

    // 2. Save progress to browser localStorage with studentKey
    saveLocalProgress(studentKey, {
      studentKey,
      currentQuestion: nextQuestionNumber,
      quizStartedAt,
      answers,
    });

    // 3. Immediately advance to next question in React state
    setCurrentIndex(nextIndex);
  };

  // Open final submission confirmation
  const handleOpenSubmitConfirm = () => {
    if (!selectedAnswer) {
      setErrorMessage('답을 선택해 주세요.');
      return;
    }
    setErrorMessage('');
    setShowConfirmModal(true);
  };

  // Execute final submission (send all 20 answers to Apps Script submitQuiz)
  const handleConfirmSubmit = async () => {
    if (submissionLock.current) return;
    if (QUIZ_QUESTIONS.some(q => !answers[q.id])) {
      setErrorMessage('20문항 모두 답을 선택해 주세요.');
      setShowConfirmModal(false);
      return;
    }
    submissionLock.current = true;
    setIsSubmitting(true);
    setErrorMessage('');

    const classVal = credentials.class || credentials.classNum;

    try {
      const res = await submitQuiz({
        studentKey,
        grade: credentials.grade,
        class: classVal,
        number: credentials.number,
        name: credentials.name,
        answers,
        quizStartedAt,
      });

      const isSuccess = res.success === true || res.ok === true;

      if (isSuccess && res.result) {
        // Submission succeeded: clear localStorage progress for this student
        clearLocalProgress(studentKey);
        setShowConfirmModal(false);
        onComplete({
          ...res.result,
          studentKey,
          name: credentials.name.trim(),
          grade: Number(credentials.grade),
          classNum: Number(classVal),
          number: Number(credentials.number),
        });
      } else {
        setErrorMessage(res.error || res.message || '제출에 실패했습니다. 다시 시도해 주세요.');
        setShowConfirmModal(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '제출 처리 중 통신 오류가 발생했습니다.';
      setErrorMessage(`제출 오류: ${msg}`);
      setShowConfirmModal(false);
    } finally {
      submissionLock.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between max-w-xl mx-auto w-full px-4 sm:px-6 py-4 sm:py-6">
      {/* Top Header: Question Counter & Progress Bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="font-batang font-bold text-lg text-slate-900 tracking-tight">
              문제 {currentIndex + 1}
            </span>
            <span className="text-xs text-slate-400 font-sans">
              / {QUIZ_QUESTIONS.length}
            </span>
          </div>

          {/* Real-time Save Status Tag */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-[11px] font-sans">자동 저장됨</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden mb-6">
          <div
            className="h-full bg-gradient-to-r from-rose-700 to-amber-600 transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="font-medium leading-relaxed whitespace-pre-line">
              {errorMessage}
            </span>
          </div>
        )}

        {/* Question Card */}
        <div className="bg-white/90 backdrop-blur-xs p-6 sm:p-7 rounded-2xl border border-amber-900/15 shadow-sm mb-6">
          {/* Question Type Badge */}
          <div className="text-[11px] font-semibold text-rose-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-700" />
            {currentQuestion.type === 'ox' && 'O / X 문항'}
            {currentQuestion.type === 'choice2' && '양자택일 문항'}
            {currentQuestion.type === 'choice4' && '4지선다 객관식'}
          </div>

          {/* Question Content */}
          <h3 className="font-batang font-bold text-lg sm:text-xl text-slate-900 leading-relaxed tracking-tight whitespace-pre-line">
            {currentQuestion.question}
          </h3>
        </div>

        {/* Answer Options Container */}
        <div className="space-y-3">
          {/* Layout for O/X questions */}
          {currentQuestion.type === 'ox' && (
            <div className="grid grid-cols-2 gap-3">
              {currentQuestion.options.map((option) => {
                const isSelected = selectedAnswer === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleSelectOption(option)}
                    className={`min-h-[96px] rounded-2xl flex flex-col items-center justify-center font-batang font-bold text-3xl transition-all duration-200 active:scale-[0.98] border-2 shadow-xs ${
                      isSelected
                        ? 'bg-rose-900 text-amber-100 border-amber-400 ring-2 ring-rose-900/30 shadow-md'
                        : 'bg-white/90 text-slate-800 border-slate-200 hover:border-amber-400 hover:bg-amber-50/50'
                    }`}
                  >
                    <span>{option}</span>
                    <span className="text-[11px] font-sans font-normal opacity-75 mt-1">
                      {option === 'O' ? '그렇다' : '아니다'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Layout for 2-choice questions */}
          {currentQuestion.type === 'choice2' && (
            <div className="grid grid-cols-2 gap-3">
              {currentQuestion.options.map((option, idx) => {
                const isSelected = selectedAnswer === option || selectedAnswer === ['A', 'B'][idx];
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleSelectOption(option, idx)}
                    className={`min-h-[72px] px-4 py-3 rounded-2xl flex items-center justify-center text-center font-batang font-bold text-base sm:text-lg transition-all duration-200 active:scale-[0.98] border-2 shadow-xs ${
                      isSelected
                        ? 'bg-rose-900 text-amber-100 border-amber-400 ring-2 ring-rose-900/30 shadow-md'
                        : 'bg-white/90 text-slate-800 border-slate-200 hover:border-amber-400 hover:bg-amber-50/50'
                    }`}
                  >
                    <span>{option}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Layout for 4-choice questions */}
          {currentQuestion.type === 'choice4' && (
            <div className="space-y-2.5">
              {currentQuestion.options.map((option, idx) => {
                const isSelected = selectedAnswer === option || selectedAnswer === ['A', 'B', 'C', 'D'][idx];
                const optionNumber = idx + 1;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleSelectOption(option, idx)}
                    className={`w-full min-h-[56px] px-4 py-3.5 rounded-xl text-left flex items-center gap-3.5 transition-all duration-200 active:scale-[0.99] border-2 shadow-xs ${
                      isSelected
                        ? 'bg-rose-900 text-amber-100 border-amber-400 ring-2 ring-rose-900/30 shadow-md'
                        : 'bg-white/90 text-slate-800 border-slate-200 hover:border-amber-400 hover:bg-amber-50/50'
                    }`}
                  >
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-amber-400 text-rose-950'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {optionNumber}
                    </span>
                    <span className="font-batang text-base sm:text-lg font-medium leading-normal flex-1">
                      {option}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation Buttons (Thumb zone) */}
      <div className="pt-8 pb-2">
        <div className="grid grid-cols-2 gap-3">
          {/* Previous Button */}
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentIndex === 0 || isSubmitting}
            className={`min-h-[52px] py-3.5 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] ${
              currentIndex === 0
                ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400 border border-slate-200'
                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>이전</span>
          </button>

          {/* Next or Submit Button */}
          {!isLastQuestion ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={isSubmitting}
              className="min-h-[52px] py-3.5 px-4 rounded-xl font-batang font-bold text-sm text-white bg-rose-800 hover:bg-rose-900 active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <span>다음</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpenSubmitConfirm}
              disabled={isSubmitting}
              className="min-h-[52px] py-3.5 px-4 rounded-xl font-batang font-bold text-sm text-amber-100 bg-gradient-to-r from-rose-900 to-amber-900 hover:from-rose-800 hover:to-amber-800 active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-1.5 border border-amber-400/40 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>제출 중…</span>
                </>
              ) : (
                <span>최종 제출</span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onCancel={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};
