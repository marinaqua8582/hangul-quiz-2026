import React, { useState, useEffect, useRef } from 'react';
import { LogOut, Printer, RefreshCw, ChevronDown, Users, BookOpen } from 'lucide-react';
import { DashboardStudent } from '../types/index.ts';
import { getDashboard } from '../services/api.ts';

interface AdminDashboardPageProps {
  token: string;
  onLogout: () => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ token, onLogout }) => {
  const [selectedGrade, setSelectedGrade] = useState<number | 'all'>('all');
  const [selectedClass, setSelectedClass] = useState<number | 'all'>('all');
  const [students, setStudents] = useState<DashboardStudent[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const requestSequence = useRef(0);

  const fetchDashboardData = async () => {
    const requestId = ++requestSequence.current;
    setIsLoading(true);
    setStudents([]);
    setTotalCount(0);
    setErrorMessage('');
    try {
      const res = await getDashboard({
        token,
        grade: selectedGrade,
        class: selectedClass,
        classNum: selectedClass,
      });

      if (requestId !== requestSequence.current) return;
      if (res.ok || res.success) {
        setStudents([...(res.students || [])].sort((a, b) => a.grade - b.grade || a.classNum - b.classNum || a.number - b.number));
        setTotalCount(res.totalCount !== undefined ? res.totalCount : (res.students || []).length);
      } else {
        setErrorMessage(res.error || res.message || '데이터를 불러오지 못했습니다.');
      }
    } catch (err: unknown) {
      if (requestId !== requestSequence.current) return;
      setErrorMessage(err instanceof Error ? err.message : '통신 오류가 발생했습니다.');
    } finally {
      if (requestId === requestSequence.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedGrade, selectedClass]);

  const handlePrint = () => {
    if (isSpecificClassSelected && !isLoading && !errorMessage) window.print();
  };

  const isSpecificClassSelected = selectedGrade !== 'all' && selectedClass !== 'all';

  const getPrintHeading = () => {
    if (selectedGrade !== 'all' && selectedClass !== 'all') {
      return `${selectedGrade}학년 ${selectedClass}반`;
    }
    if (selectedGrade !== 'all') {
      return `${selectedGrade}학년 전체`;
    }
    return '전체 학년';
  };

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10">
      {/* Printable Heading (Only visible during print) */}
      <div className="hidden print-only mb-6 text-center border-b-2 border-slate-900 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">
          2026 한글날 퀴즈 결과
        </h1>
        <div className="text-base font-semibold text-slate-700">
          {getPrintHeading()} (참여 인원: {totalCount}명)
        </div>
        <div className="text-xs text-slate-400 mt-1">
          출력일시: {new Date().toLocaleDateString('ko-KR')}
        </div>
      </div>

      {/* Screen Controls Header (Hidden in Print) */}
      <div className="no-print mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h1 className="font-batang font-bold text-2xl text-slate-900 tracking-tight">
              2026 한글날 퀴즈
            </h1>
            <h2 className="text-sm font-medium text-slate-500">
              교사용 대시보드
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={isLoading || !!errorMessage || !isSpecificClassSelected || students.length === 0}
              className="py-2 px-3.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 active:scale-[0.98] transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>현재 학급 결과 인쇄</span>
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="py-2 px-3 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>로그아웃</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="mt-4 p-4 bg-white/90 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Grade Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">학년:</span>
              <div className="relative">
                <select
                  value={selectedGrade}
                  onChange={(e) => {
                    const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                    setSelectedGrade(val);
                    setSelectedClass('all');
                  }}
                  className="h-9 px-3 pr-7 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-800 appearance-none"
                >
                  <option value="all">전체 학년</option>
                  <option value={1}>1학년</option>
                  <option value={2}>2학년</option>
                  <option value={3}>3학년</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Class Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">반:</span>
              <div className="relative">
                <select
                  value={selectedClass}
                  onChange={(e) => {
                    const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                    setSelectedClass(val);
                  }}
                  className="h-9 px-3 pr-7 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-800 appearance-none"
                >
                  <option value="all">전체 반</option>
                  {Array.from({ length: 15 }, (_, i) => i + 1).map((c) => (
                    <option key={c} value={c}>
                      {c}반
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <button
              type="button"
              onClick={fetchDashboardData}
              disabled={isLoading}
              title="새로고침"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Participant Count Summary Box */}
          <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200">
            <Users className="w-4 h-4 text-slate-600" />
            <span className="text-xs font-medium text-slate-700">
              참여 인원: <strong className="text-slate-900 font-bold">{totalCount}명</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="no-print mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
          {errorMessage}
        </div>
      )}

      {/* Student Results Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-slate-500" />
            <span>응시 결과를 불러오는 중입니다…</span>
          </div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            제출된 응시 결과가 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-semibold">
                  {!isSpecificClassSelected && (
                    <>
                      <th className="py-3 px-4 text-center w-16">학년</th>
                      <th className="py-3 px-4 text-center w-16">반</th>
                    </>
                  )}
                  <th className="py-3 px-4 text-center w-16">번호</th>
                  <th className="py-3 px-4">이름</th>
                  <th className="py-3 px-4 text-right tabular-nums w-24">점수</th>
                  <th className="py-3 px-4 text-center w-28">등급</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {students.map((st) => (
                  <tr
                    key={st.studentKey || `${st.grade}-${st.classNum}-${st.number}`}
                    className="hover:bg-slate-50/70 transition-colors page-break-inside-avoid"
                  >
                    {!isSpecificClassSelected && (
                      <>
                        <td className="py-3 px-4 text-center tabular-nums text-slate-600 text-xs">
                          {st.grade}학년
                        </td>
                        <td className="py-3 px-4 text-center tabular-nums text-slate-600 text-xs">
                          {st.classNum}반
                        </td>
                      </>
                    )}
                    <td className="py-3 px-4 text-center tabular-nums font-medium text-slate-700">
                      {st.number}번
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {st.name}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums font-bold text-slate-900">
                      {st.score}점
                    </td>
                    <td className="py-3 px-4 text-center font-medium">
                      <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
                        {st.rankTitle}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Screen bottom notice (no ranks against each other) */}
      <div className="no-print mt-6 text-center text-[11px] text-slate-400">
        * 학년 → 반 → 번호 순으로 정렬되어 있습니다. (학생 순위 및 시간은 표시되지 않습니다.)
      </div>
    </div>
  );
};
