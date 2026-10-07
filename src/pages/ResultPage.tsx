import React from 'react';
import { Home, AlertCircle } from 'lucide-react';
import { FinalResult } from '../types/index.ts';
import { getRankByScore, getRankByTitle } from '../data/ranks.ts';
import { RankBadge } from '../components/RankBadge.tsx';

interface ResultPageProps {
  result: FinalResult;
  isAlreadySubmittedNotice?: boolean;
  onGoHome: () => void;
}

export const ResultPage: React.FC<ResultPageProps> = ({
  result,
  isAlreadySubmittedNotice = false,
  onGoHome,
}) => {
  const rank = getRankByTitle(result.rankTitle) || getRankByScore(result.score);

  return (
    <div className="flex-1 flex flex-col justify-between max-w-lg mx-auto w-full px-4 sm:px-6 py-6 sm:py-10">
      <div>
        {/* Notice banner if accessed via re-login */}
        {isAlreadySubmittedNotice && (
          <div className="mb-6 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
            <span className="font-medium">
              이미 최종 제출한 퀴즈입니다. 이전 제출 결과가 표시됩니다.
            </span>
          </div>
        )}

        {/* Student Name Header */}
        <div className="text-center mb-6">
          <div className="inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium mb-2 border border-slate-200">
            {result.grade}학년 {result.classNum}반 {result.number}번
          </div>
          <h2 className="font-batang font-bold text-2xl text-slate-900 tracking-tight">
            {result.name} 학생의 결과
          </h2>
        </div>

        {/* Main Result Card: Score, Rank Image, and Rank Comment */}
        <div className="bg-white/90 backdrop-blur-xs p-6 sm:p-8 rounded-3xl border border-amber-900/15 shadow-md text-center mb-6 relative overflow-hidden">
          {/* Subtle top decorative accent */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-800 via-amber-600 to-teal-800" />

          {/* Score Display */}
          <div className="mb-4">
            <div className="text-xs text-slate-400 font-medium mb-1">최종 점수</div>
            <div className="font-batang font-bold text-5xl text-rose-900 tracking-tight">
              {result.score}
              <span className="text-2xl text-slate-600 font-sans ml-1">점</span>
            </div>
          </div>

          {/* Actual Rank PNG Image (large, centered, no duplicate title text) */}
          <div className="my-4">
            <RankBadge rank={rank} />
          </div>

          {/* Rank Comment */}
          <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-amber-50/70 border border-amber-800/15">
            <p className="font-batang text-slate-800 text-base sm:text-lg leading-relaxed whitespace-pre-line font-medium">
              {rank.comment}
            </p>
          </div>
        </div>

        {/* Submission Confirmation Notice */}
        <div className="text-center text-xs text-slate-500 py-1">
          답안이 정상적으로 제출되었습니다.
        </div>
      </div>

      {/* Return Home Button */}
      <div className="pt-6 pb-2">
        <button
          type="button"
          onClick={onGoHome}
          className="w-full min-h-[52px] py-3.5 px-5 rounded-xl font-medium text-sm text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xs"
        >
          <Home className="w-4 h-4 text-slate-500" />
          <span>처음 화면으로</span>
        </button>
      </div>
    </div>
  );
};
