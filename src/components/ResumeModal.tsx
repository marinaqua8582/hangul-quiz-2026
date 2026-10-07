import React from 'react';
import { RotateCcw } from 'lucide-react';

interface ResumeModalProps {
  isOpen: boolean;
  onConfirm: () => void;
}

export const ResumeModal: React.FC<ResumeModalProps> = ({ isOpen, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#fffdf9] border-2 border-amber-900/40 rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center relative overflow-hidden">
        {/* Dancheong gradient header bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-700 via-amber-600 to-rose-700" />

        <div className="w-12 h-12 rounded-full bg-teal-100 border border-teal-300 text-teal-800 flex items-center justify-center mx-auto mb-4">
          <RotateCcw className="w-6 h-6" />
        </div>

        <h3 className="font-batang font-bold text-xl text-slate-900 mb-3 tracking-tight">
          이어서 풀기
        </h3>

        <p className="text-slate-600 text-sm leading-relaxed mb-6 whitespace-pre-line font-medium">
          진행 중인 퀴즈가 있습니다.{'\n'}이어서 풀까요?
        </p>

        <button
          type="button"
          onClick={onConfirm}
          className="w-full py-3.5 px-5 rounded-xl font-medium text-white bg-teal-800 hover:bg-teal-900 active:scale-[0.98] transition-all text-sm shadow-md"
        >
          이어서 풀기
        </button>
      </div>
    </div>
  );
};
