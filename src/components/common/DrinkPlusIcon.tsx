import React from 'react';

interface DrinkPlusIconProps {
  className?: string;
  size?: number;
}

/**
 * Ícono de "Invitar un trago":
 * Diseño sobrio, elegante y de alta gama nocturna.
 * Líneas limpias de cristalería fina (cocktail coupe / rocks)
 * con un sutil y sofisticado '+' integrado.
 */
export const DrinkPlusIcon: React.FC<DrinkPlusIconProps> = ({
  className = '',
  size = 22,
}) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-label="Invitar un trago"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-[#F39200]"
      >
        {/* Silueta sobria y elegante de copa / vaso cóctel premium */}
        <path
          d="M5 4H19L14.5 11.5V17H17V19H7V17H9.5V11.5L5 4Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Nivel de licor / trago con brillo sutil */}
        <path
          d="M7.2 7H16.8"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeOpacity="0.8"
        />
        {/* Sorbete / garnish minimalista */}
        <line
          x1="12"
          y1="2"
          x2="13.5"
          y2="6"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>

      {/* '+' sobrio, fino y minimalista en esquina superior derecha */}
      <span className="absolute -top-1 -right-1.5 w-3.5 h-3.5 rounded-full bg-[#121217] border border-[#F39200] text-[#F39200] font-black text-[9px] flex items-center justify-center leading-none shadow-sm">
        +
      </span>
    </div>
  );
};
