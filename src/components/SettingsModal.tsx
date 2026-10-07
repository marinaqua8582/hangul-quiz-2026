import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react';
import { getScriptUrl, setCustomScriptUrl, isUsingLiveApi, sanitizeScriptUrl } from '../services/api.ts';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [url, setUrl] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setUrl(getScriptUrl());
      setTestStatus('idle');
      setTestMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    setCustomScriptUrl(url);
    setUrl(getScriptUrl());
    onClose();
  };

  const handleResetToEnv = () => {
    const envUrl = (import.meta.env.VITE_APPS_SCRIPT_URL as string) || '';
    const sanitized = sanitizeScriptUrl(envUrl);
    setUrl(sanitized);
    setCustomScriptUrl(sanitized);
    setTestStatus('idle');
    setTestMessage('기본 환경변수 값으로 재설정되었습니다.');
  };

  const handleTestConnection = async () => {
    const targetUrl = sanitizeScriptUrl(url);
    if (!targetUrl) {
      setTestStatus('error');
      setTestMessage('URL을 입력해 주세요. 운영 API 설정이 필요합니다.');
      return;
    }

    setTestStatus('testing');
    setTestMessage('Google Apps Script 연결 테스트 중…');

    try {
      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({ action: 'getRosterOptions' }),
        redirect: 'follow',
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const text = await res.text();
      let json: Record<string, unknown> = {};
      try {
        json = JSON.parse(text);
      } catch {
        json = {};
      }

      if (json.ok === true || json.success === true) {
        setTestStatus('success');
        setTestMessage('Google Apps Script 연결 및 Roster 옵션 조회에 성공했습니다.');
      } else {
        throw new Error('API 응답이 성공 상태가 아닙니다.');
      }
    } catch (err: unknown) {
      setTestStatus('error');
      setTestMessage(
        '연결 실패: Google Apps Script 배포 시 「액세스 권한: 모든 사용자(Anyone)」로 설정했는지 확인해 주세요.'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#fffdf9] border-2 border-amber-900/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-amber-900/10 mb-4">
          <h3 className="font-batang font-bold text-lg text-slate-900 flex items-center gap-2">
            <span>⚙️ Google Apps Script 연동 설정</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current status pill */}
        <div className="mb-4 p-3 rounded-xl border text-xs leading-relaxed flex items-center gap-2.5 bg-slate-50 border-slate-200 text-slate-700">
          {isUsingLiveApi() ? (
            <>
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>실제 연동 모드:</strong> Google Apps Script Web App과 실시간 동기화 중입니다.
              </span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>API 설정 필요:</strong> URL이 없어 로그인과 제출을 진행할 수 없습니다.
              </span>
            </>
          )}
        </div>

        <div className="space-y-3 mb-5">
          <label className="block text-xs font-semibold text-slate-700">
            Google Apps Script 웹 앱 배포 URL (exec):
          </label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://script.google.com/macros/s/AKfycb.../exec"
            className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-600 font-mono bg-white text-slate-800"
          />
          <p className="text-[11px] text-slate-500">
            * <code>.env.example</code>의 <code>VITE_APPS_SCRIPT_URL</code>을 설정하거나, 여기서 직접 입력하여 저장할 수 있습니다.
          </p>
        </div>

        {/* Test Result Message */}
        {testMessage && (
          <div
            className={`p-3 rounded-xl text-xs mb-4 flex items-start gap-2 ${
              testStatus === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : testStatus === 'error'
                ? 'bg-rose-50 text-rose-800 border border-rose-200'
                : 'bg-blue-50 text-blue-800 border border-blue-200'
            }`}
          >
            {testStatus === 'testing' && (
              <RefreshCw className="w-4 h-4 animate-spin text-blue-600 shrink-0 mt-0.5" />
            )}
            <span>{testMessage}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testStatus === 'testing'}
              className="py-2 px-3 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 active:scale-95 transition-all"
            >
              연결 테스트
            </button>
            <button
              type="button"
              onClick={handleResetToEnv}
              className="py-2 px-3 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
            >
              기본값 복원
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              닫기
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="py-2 px-4 rounded-lg text-xs font-medium text-white bg-slate-900 hover:bg-slate-800"
            >
              저장하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
