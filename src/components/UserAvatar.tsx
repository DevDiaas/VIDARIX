import React, { useState } from 'react';

export interface UserAvatarProps {
  src?: string | null;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showBorder?: boolean;
  borderColor?: string;
  onClick?: () => void;
  altText?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  name = 'Cinéfilo VIDARIX',
  size = 'md',
  className = '',
  showBorder = true,
  borderColor = 'border-[#8B5CF6]',
  onClick,
  altText
}) => {
  const [imgError, setImgError] = useState(false);

  // Derive initials
  const getInitials = (strName: string) => {
    if (!strName) return 'V';
    const trimmed = strName.trim();
    if (!trimmed) return 'V';
    const parts = trimmed.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return trimmed.slice(0, 2).toUpperCase();
  };

  const initials = getInitials(name);

  // Size mappings
  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base font-bold',
    xl: 'w-24 h-24 text-2xl font-black',
    '2xl': 'w-32 h-32 sm:w-36 sm:h-36 text-4xl font-black'
  };

  const borderClass = showBorder ? `border ${borderColor}` : '';

  const finalSrc = src && src.trim().length > 0 ? src : null;
  const showImage = finalSrc && !imgError;

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`relative rounded-full overflow-hidden shrink-0 flex items-center justify-center select-none ${sizeClasses[size]} ${borderClass} ${
        onClick ? 'cursor-pointer transition-transform hover:scale-105 active:scale-95' : ''
      } ${className}`}
      style={{
        background: 'linear-gradient(135deg, #FF174D 0%, #C026D3 50%, #7C3AED 100%)'
      }}
    >
      {showImage ? (
        <img
          src={finalSrc}
          alt={altText || name}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover object-center rounded-full"
          loading="lazy"
        />
      ) : (
        <span className="text-white font-black tracking-wider drop-shadow-sm">
          {initials}
        </span>
      )}
    </div>
  );
};
