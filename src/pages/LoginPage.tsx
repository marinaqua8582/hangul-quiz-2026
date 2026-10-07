import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, AlertCircle, LogIn, ChevronDown, RefreshCw } from 'lucide-react';
import { StudentCredentials, LoginResponse, RosterOptions } from '../types/index.ts';
import { loginStudent, getRosterOptions } from '../services/api.ts';

interface LoginPageProps {
  onBack: () => void;
  onLoginSuccess: (response: LoginResponse, credentials: StudentCredentials) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onBack, onLoginSuccess }) => {
  // Roster Options State
  const [rosterOptions, setRosterOptions] = useState<RosterOptions | null>(null);
  const [isLoadingOptions, setIsLoadingOptions] = useState<boolean>(true);
  const [optionsError, setOptionsError] = useState<string>('');

  // Selected Student Credentials
  const [grade, setGrade] = useState<string>('');
  const [classVal, setClassVal] = useState<string>('');
  const [numberVal, setNumberVal] = useState<string>('');
  const [name, setName] = useState<string>('');

  // Form Submission State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Fetch Roster Options on Mount
  const fetchOptions = async () => {
    setIsLoadingOptions(true);
    setOptionsError('');
    try {
      const data = await getRosterOptions();
      const isSuccess = data.success === true || data.ok === true;
      if (isSuccess && data.grades && data.grades.length > 0) {
        setRosterOptions(data);

        // Auto-select if only 1 grade available (e.g. 2학년)
        if (data.grades.length === 1) {
          const autoGrade = data.grades[0];
          setGrade(autoGrade);

          // If that grade has only 1 class, auto-select class as well
          const availableClasses = data.classesByGrade[autoGrade] || [];
          if (availableClasses.length === 1) {
            setClassVal(availableClasses[0]);
          }
        }
      } else {
        setOptionsError(data.error || data.message || '학생 명단을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
      }
    } catch (err: unknown) {
      setOptionsError('학생 명단을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsLoadingOptions(false);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  // Compute dynamic classes and numbers based on current selection
  const availableGrades = rosterOptions?.grades || [];
  const availableClasses = grade && rosterOptions ? rosterOptions.classesByGrade[grade] || [] : [];
  const gradeClassKey = `${grade}-${classVal}`;
  const availableNumbers = grade && classVal && rosterOptions ? rosterOptions.numbersByGradeClass[gradeClassKey] || [] : [];

  // Handle Grade Change: Reset Class & Number
  const handleGradeChange = (newGrade: string) => {
    setGrade(newGrade);
    setClassVal('');
    setNumberVal('');
    setErrorMessage('');

    // If new grade has only 1 class, auto-select it
    if (newGrade && rosterOptions) {
      const classes = rosterOptions.classesByGrade[newGrade] || [];
      if (classes.length === 1) {
        setClassVal(classes[0]);
      }
    }
  };

  // Handle Class Change: Reset Number
  const handleClassChange = (newClass: string) => {
    setClassVal(newClass);
    setNumberVal('');
    setErrorMessage('');
  };

  // Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!grade) {
      setErrorMessage('학년을 선택해 주세요.');
      return;
    }
    if (!classVal) {
      setErrorMessage('반을 선택해 주세요.');
      return;
    }
    if (!numberVal) {
      setErrorMessage('번호를 선택해 주세요.');
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage('이름을 입력해 주세요.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    const credentials: StudentCredentials = {
      grade,
      class: classVal,
      classNum: classVal,
      number: numberVal,
      name: trimmedName,
    };

    try {
      const res = await loginStudent(credentials);
      const isSuccess = res.success === true || res.ok === true;

      if (isSuccess) {
        onLoginSuccess(res, credentials);
      } else {
        // Display exact error message returned by server
        setErrorMessage(res.error || res.message || '학년, 반, 번호, 이름을 다시 확인해 주세요.');
      }
    } catch (err: unknown) {
      setErrorMessage('서버와 통신할 수 없습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between max-w-md mx-auto w-full px-5 py-6 sm:py-10">
      <div>
        {/* Back navigation */}
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 py-1.5 px-2.5 rounded-lg hover:bg-black/5 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>처음으로</span>
        </button>

        {/* Page Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-300 text-amber-900 flex items-center justify-center mx-auto mb-3 shadow-inner">
            <User className="w-6 h-6" />
          </div>
          <h2 className="font-batang font-bold text-2xl text-slate-900 tracking-tight mb-1.5">
            학생 본인 확인
          </h2>
          <p className="text-xs text-slate-500">
            학교 명단(Roster)에 등록된 본인의 학년, 반, 번호, 이름을 입력하세요.
          </p>
        </div>

        {/* Options Loading or Error Notice */}
        {isLoadingOptions && (
          <div className="mb-4 p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-700" />
            <span className="font-medium">명단 불러오는 중…</span>
          </div>
        )}

        {optionsError && !isLoadingOptions && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-medium">{optionsError}</span>
            </div>
            <button
              type="button"
              onClick={fetchOptions}
              className="text-[11px] underline font-semibold text-rose-900 shrink-0 hover:text-rose-700"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* Form Card */}
        <form onSubmit={handleSubmit} className="space-y-4 bg-white/80 backdrop-blur-xs p-6 rounded-2xl border border-amber-900/15 shadow-sm">
          {/* Dynamic Dropdowns for Grade, Class, Number */}
          <div className="grid grid-cols-3 gap-2.5">
            {/* Grade */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                학년
              </label>
              <div className="relative">
                <select
                  value={grade}
                  onChange={(e) => handleGradeChange(e.target.value)}
                  disabled={isLoadingOptions || isLoading || availableGrades.length === 0}
                  className="w-full h-12 px-3 pr-8 rounded-xl border border-slate-300 bg-white text-slate-800 text-sm font-medium focus:ring-2 focus:ring-rose-700 focus:outline-none appearance-none disabled:bg-slate-100 disabled:text-slate-400"
                >
                  {availableGrades.length !== 1 && (
                    <option value="">선택</option>
                  )}
                  {availableGrades.map((g) => (
                    <option key={g} value={g}>
                      {g}학년
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Class */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                반
              </label>
              <div className="relative">
                <select
                  value={classVal}
                  onChange={(e) => handleClassChange(e.target.value)}
                  disabled={isLoadingOptions || isLoading || !grade || availableClasses.length === 0}
                  className="w-full h-12 px-3 pr-8 rounded-xl border border-slate-300 bg-white text-slate-800 text-sm font-medium focus:ring-2 focus:ring-rose-700 focus:outline-none appearance-none disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="">선택</option>
                  {availableClasses.map((c) => (
                    <option key={c} value={c}>
                      {c}반
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                번호
              </label>
              <div className="relative">
                <select
                  value={numberVal}
                  onChange={(e) => {
                    setNumberVal(e.target.value);
                    setErrorMessage('');
                  }}
                  disabled={isLoadingOptions || isLoading || !classVal || availableNumbers.length === 0}
                  className="w-full h-12 px-3 pr-8 rounded-xl border border-slate-300 bg-white text-slate-800 text-sm font-medium focus:ring-2 focus:ring-rose-700 focus:outline-none appearance-none disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="">선택</option>
                  {availableNumbers.map((n) => (
                    <option key={n} value={n}>
                      {n}번
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Name input */}
          <div className="pt-1">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              이름
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errorMessage) setErrorMessage('');
              }}
              placeholder="예: 김과학"
              disabled={isLoading}
              maxLength={20}
              className="w-full h-12 px-4 rounded-xl border border-slate-300 bg-white text-slate-900 text-base placeholder:text-slate-400 focus:ring-2 focus:ring-rose-700 focus:outline-none font-medium"
            />
          </div>

          {/* Error notice (Server error message strictly displayed) */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-medium leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={isLoading || isLoadingOptions}
              className="w-full min-h-[52px] py-3.5 px-5 rounded-xl font-batang font-bold text-base text-white bg-rose-800 hover:bg-rose-900 active:scale-[0.98] transition-all shadow-md shadow-rose-950/20 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>확인 중…</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>확인 및 퀴즈 입장</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Helpful note at bottom */}
      <div className="mt-8 text-center text-[11px] text-slate-500">
        <p>* 이름 앞뒤의 불필요한 공백은 자동으로 정리됩니다.</p>
        <p className="mt-0.5">* 중복 응시 방지를 위해 학생 고유 번호로 기록됩니다.</p>
      </div>
    </div>
  );
};
