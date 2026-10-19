import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light' | 'dark';
  showSubtitle?: boolean;
  customLogoUrl?: string;
  className?: string;
}

export const CachengueooLogo: React.FC<LogoProps> = ({
  size = 'md',
  variant = 'light',
  showSubtitle = false,
  customLogoUrl,
  className = '',
}) => {
  // Dimensiones según tamaño
  const sizeClasses = {
    sm: 'text-base sm:text-lg tracking-tight',
    md: 'text-xl sm:text-2xl tracking-tighter',
    lg: 'text-2xl sm:text-3xl tracking-tighter',
    xl: 'text-3xl sm:text-5xl tracking-tighter',
  };

  if (customLogoUrl) {
    return (
      <div className={`inline-flex flex-col items-start ${className}`}>
        <img
          src={customLogoUrl}
          alt="Cachengueoo Mendoza"
          className="h-8 sm:h-10 w-auto object-contain"
          referrerPolicy="no-referrer"
        />
        {showSubtitle && (
          <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-zinc-400 mt-1">
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
