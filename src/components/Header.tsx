import React from 'react';
import { BookOpen, Settings } from 'lucide-react';

interface HeaderProps {
  onOpenSettings?: () => void;
  showSettingsBtn?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings, showSettingsBtn = true }) => {
  return (
    <header className="no-print w-full bg-[#1e293b] text-amber-50 border-b border-amber-900/40 sticky top-0 z-20 shadow-sm">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Brand Zone */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 font-batang font-bold text-base shadow-inner">
            글
          </div>
          <div className="leading-tight">
            <span className="font-batang font-bold text-sm sm:text-base tracking-tight text-amber-100 block">
              2026 한글날 퀴즈
            </span>
            <span className="text-[11px] text-amber-300/80 block">
              훈민정음 반포 580돌 기념
            </span>
          </div>
        </div>

        {/* Right utility */}
        <div className="flex items-center gap-2">
          {showSettingsBtn && onOpenSettings && (
            <button
              onClick={onOpenSettings}
              title="API 설정"
              className="p-2 rounded-lg text-amber-200/70 hover:text-amber-100 hover:bg-slate-800 transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
