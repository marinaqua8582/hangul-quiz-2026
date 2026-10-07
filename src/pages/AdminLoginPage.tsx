import React, { useState } from 'react';
import { ArrowLeft, Lock, KeyRound, AlertCircle } from 'lucide-react';
import { adminLogin } from '../services/api.ts';

interface AdminLoginPageProps {
  onBack: () => void;
  onLoginSuccess: (token: string) => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onBack, onLoginSuccess }) => {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setErrorMessage('비밀번호를 입력해 주세요.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await adminLogin(password);
      if ((res.ok || res.success) && res.token) {
        onLoginSuccess(res.token);
      } else {
        setErrorMessage(res.error || res.message || '관리자 비밀번호가 일치하지 않습니다.');
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : '서버와 통신할 수 없습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between max-w-sm mx-auto w-full px-5 py-6 sm:py-10">
      <div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 py-1.5 px-2.5 rounded-lg hover:bg-black/5 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>메인 화면으로</span>
        </button>

        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-amber-300 flex items-center justify-center mx-auto mb-3 shadow-md">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="font-batang font-bold text-2xl text-slate-900 tracking-tight mb-1">
            교사용 로그인
          </h2>
          <p className="text-xs text-slate-500">
            관리자 비밀번호를 입력하여 응시 현황을 조회합니다.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-white/80 p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              비밀번호
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder="비밀번호 입력"
                disabled={isLoading}
                className="w-full h-12 px-4 pr-10 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-slate-800 focus:outline-none"
              />
              <KeyRound className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 py-3 px-4 rounded-xl font-medium text-sm text-white bg-slate-900 hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>확인 중…</span>
              </>
            ) : (
              <span>대시보드 접속</span>
            )}
          </button>
        </form>
      </div>

      <div className="text-center text-[11px] text-slate-400 py-4">
        * 교사가 설정한 관리자 비밀번호를 입력하세요.
      </div>
    </div>
  );
};
