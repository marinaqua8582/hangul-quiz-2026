import React from 'react';
import { ArrowRight, ShieldCheck, Sparkles, BookOpen } from 'lucide-react';

interface HomePageProps {
  onStartQuiz: () => void;
  onGoToAdmin: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onStartQuiz, onGoToAdmin }) => {
  return (
    <div className="flex-1 flex flex-col justify-between max-w-xl mx-auto w-full px-5 py-8 sm:py-12">
      {/* Top Banner / Emblems */}
      <div className="text-center pt-2 sm:pt-6">
        {/* Traditional Royal Medallion Symbol */}
        <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-amber-700 via-rose-900 to-slate-900 text-amber-200 shadow-xl border-2 border-amber-400/50 mb-6 p-1 relative">
          <div className="w-full h-full rounded-full border border-amber-400/30 flex flex-col items-center justify-center">
            <span className="font-batang text-xs tracking-widest text-amber-300/80">訓民正音</span>
            <span className="font-batang font-bold text-2xl sm:text-3xl text-amber-100 mt-0.5">한글</span>
            <span className="text-[10px] text-amber-300/70 font-sans tracking-tight">580돌</span>
          </div>
          {/* Dancheong subtle corner dots */}
          <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-teal-600 border border-amber-200" />
          <div className="absolute -bottom-1 -left-1 w-3.5 h-3.5 rounded-full bg-rose-700 border border-amber-200" />
        </div>

        {/* Main Title Section */}
        <div className="space-y-2 mb-4">
          <h1 className="font-batang font-bold text-3xl sm:text-4xl text-slate-900 tracking-tight leading-tight">
            2026 한글날 퀴즈
          </h1>
          <h2 className="font-batang font-semibold text-lg sm:text-xl text-rose-800 tracking-normal">
            훈민정음 반포 580돌
          </h2>
        </div>

        {/* Description Callout */}
        <div className="max-w-md mx-auto my-6 p-4 rounded-2xl bg-amber-50/80 border border-amber-800/20 shadow-xs">
          <p className="font-batang text-slate-800 text-base sm:text-lg font-medium leading-relaxed">
            「재미있는 한글과 우리말의 세계에 도전해 보세요!」
          </p>
        </div>

        {/* Feature Highlights for Middle School Students */}
        <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto text-left mt-6 mb-8 text-xs text-slate-600">
          <div className="p-3 rounded-xl bg-white/70 border border-amber-900/10 shadow-xs flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-slate-800">총 20문항</div>
              <div className="text-[11px] text-slate-500">O/X, 양자택일, 4지선다</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/70 border border-amber-900/10 shadow-xs flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-slate-800">자동 진행 저장</div>
              <div className="text-[11px] text-slate-500">언제든 이어서 풀기 가능</div>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Action Button (Thumb Ergonomics) */}
      <div className="space-y-4 pt-4 pb-2">
        <button
          type="button"
          onClick={onStartQuiz}
          className="w-full min-h-[56px] py-4 px-6 rounded-2xl font-batang font-bold text-lg text-amber-50 bg-gradient-to-r from-rose-900 via-rose-800 to-amber-900 hover:from-rose-800 hover:to-amber-800 active:scale-[0.98] transition-all shadow-lg shadow-rose-950/20 flex items-center justify-center gap-3 border border-amber-400/30"
        >
          <span>퀴즈 시작하기</span>
          <ArrowRight className="w-5 h-5 text-amber-300" />
        </button>

        {/* Teacher Entry (Subtle) */}
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={onGoToAdmin}
            className="text-xs text-slate-500 hover:text-slate-800 py-2 px-3 rounded-lg hover:bg-black/5 transition-colors"
          >
            교사용
          </button>
        </div>
      </div>
    </div>
  );
};
