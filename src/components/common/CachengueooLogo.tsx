import React, { useState } from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light' | 'dark';
  showSubtitle?: boolean;
  customLogoUrl?: string;
  className?: string;
}

const DEFAULT_OFFICIAL_LOGO = '/assets/aistudio/Cachengueoo_blanco_af647c21.png';

export const CachengueooLogo: React.FC<LogoProps> = ({
  size = 'md',
  variant = 'light',
  showSubtitle = false,
  customLogoUrl,
  className = '',
}) => {
  const [hasError, setHasError] = useState(false);
  const logoSrc = customLogoUrl || DEFAULT_OFFICIAL_LOGO;

  const heightClasses = {
    sm: 'h-5 sm:h-6 max-w-[130px] sm:max-w-[150px]',
    md: 'h-8 sm:h-8 md:h-8.5 max-w-[185px] sm:max-w-[215px] md:max-w-[240px]',
    lg: 'h-9 sm:h-10 md:h-11 max-w-[210px] sm:max-w-[260px]',
    xl: 'h-11 sm:h-13 md:h-16 max-w-[260px] sm:max-w-[340px]',
  };

  const sizeClasses = {
    sm: 'text-lg sm:text-lg tracking-tight',
    md: 'text-2xl sm:text-2xl md:text-3xl tracking-tighter',
    lg: 'text-3xl sm:text-3xl tracking-tighter',
    xl: 'text-4xl sm:text-5xl tracking-tighter',
  };

  if (!hasError && logoSrc) {
    return (
      <div className={`inline-flex flex-col items-start select-none ${className}`}>
        <img
          src={logoSrc}
          alt="Cachengueoo Mendoza"
          onError={() => setHasError(true)}
          className={`${heightClasses[size]} w-auto object-contain transition-all`}
          referrerPolicy="no-referrer"
        />
        {showSubtitle && (
          <span className="text-[9px] uppercase font-bold tracking-[0.25em] text-zinc-400 mt-1">
            Mendoza · Argentina
          </span>
        )}
      </div>
    );
  }

  const textColor = variant === 'light' ? 'text-white' : 'text-zinc-900';

  return (
    <div className={`inline-flex flex-col items-start select-none ${className}`}>
      <span className={`font-black font-display uppercase leading-none ${sizeClasses[size]}`}>
        <span className={textColor}>CACHENGU</span>
        <span className="text-[#F39200]">EOO</span>
      </span>
      {showSubtitle && (
        <span className="text-[9px] uppercase font-bold tracking-[0.3em] text-zinc-400 mt-1">
          Mendoza · Club & Match
        </span>
      )}
    </div>
  );
};
