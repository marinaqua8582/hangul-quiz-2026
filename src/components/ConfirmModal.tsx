import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onCancel,
  onConfirm,
  isSubmitting = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#fffdf9] border-2 border-amber-900/40 rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center relative overflow-hidden">
        {/* Traditional decorative top accent line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-800 via-amber-600 to-teal-800" />

        <div className="w-12 h-12 rounded-full bg-rose-100 border border-rose-300 text-rose-700 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>

        <h3 className="font-batang font-bold text-xl text-slate-900 mb-3 tracking-tight">
          최종 제출하시겠습니까?
        </h3>

        <p className="text-slate-600 text-sm leading-relaxed mb-6 whitespace-pre-line font-medium">
          제출 후에는 답을 수정하거나{'\n'}다시 응시할 수 없습니다.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-xl font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] transition-all text-sm border border-slate-300 disabled:opacity-50"
          >
            돌아가기
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-xl font-medium text-white bg-rose-800 hover:bg-rose-900 active:scale-[0.98] transition-all text-sm shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5"
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
        </div>
      </div>
    </div>
  );
};
