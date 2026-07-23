import React from 'react';
import { Loader2 } from 'lucide-react';

export interface PremiumGradientButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  compact?: boolean;
  isLoading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  children: React.ReactNode;
}

export const PremiumGradientButton: React.FC<PremiumGradientButtonProps> = ({
  compact = false,
  isLoading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  children,
  className = '',
  ...props
}) => {
  const baseClass = compact ? 'button-header-watch' : 'neutral-purple-button';

  return (
    <button
      disabled={disabled || isLoading}
      className={`neutral-button ${baseClass} ${className}`}
      {...props}
    >
      <span className="relative z-10 flex items-center justify-center gap-2.5 w-full text-current">
        {isLoading ? (
          <>
            <Loader2 className="w-4.5 h-4.5 animate-spin text-white shrink-0" />
            <span>{children}</span>
          </>
        ) : (
          <>
            {icon && iconPosition === 'left' && (
              <span className="button-icon shrink-0 text-white">{icon}</span>
            )}
            <span>{children}</span>
            {icon && iconPosition === 'right' && (
              <span className="button-icon shrink-0 text-white">{icon}</span>
            )}
          </>
        )}
      </span>
    </button>
  );
};
