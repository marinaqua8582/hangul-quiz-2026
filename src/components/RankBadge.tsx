import React, { useState } from 'react';
import { RankDefinition } from '../types/index.ts';

interface RankBadgeProps {
  rank: RankDefinition;
  className?: string;
}

export const RankBadge: React.FC<RankBadgeProps> = ({ rank, className = '' }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const imageSrc = `/assets/ranks/${rank.imageFileName}`;

  if (imgFailed) {
    return (
      <div className={`w-full max-w-sm mx-auto py-8 px-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs text-center ${className}`}>
        등급 이미지를 불러오지 못했습니다.
      </div>
    );
  }

  return (
    <div className={`w-full flex justify-center items-center my-3 ${className}`}>
      <img
        src={imageSrc}
        alt={rank.title}
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
        className="w-[85%] sm:w-[80%] max-w-[340px] sm:max-w-[380px] h-auto object-contain drop-shadow-md select-none transition-all duration-300"
      />
    </div>
  );
};
