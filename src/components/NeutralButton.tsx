import React from 'react';
import { Loader2 } from 'lucide-react';

export interface NeutralButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'purple' | 'header-purple' | 'light' | 'dark' | 'outline' | 'ghost';
  compact?: boolean;
  isLoading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  children: React.ReactNode;
}

export const NeutralButton: React.FC<NeutralButtonProps> = ({
  variant = 'purple',
  compact = false,
  isLoading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  children,
  className = '',
  ...props
}) => {
  const variantClass = {
    purple: 'vidarix-solid-button vidarix-solid-button--primary',
    'header-purple': 'vidarix-solid-button vidarix-solid-button--header',
    light: 'vidarix-solid-button vidarix-solid-button--light',
    dark: 'vidarix-solid-button vidarix-solid-button--dark',
    outline: 'vidarix-solid-button vidarix-solid-button--outline',
    ghost: 'vidarix-solid-button vidarix-solid-button--ghost'
  }[variant];

  return (
    <button
      disabled={disabled || isLoading}
      data-vidarix-button={variant}
      className={`${variantClass} ${compact ? 'vidarix-solid-button--compact' : ''} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
          <span>{children}</span>
        </>
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <span className="vidarix-solid-button__icon" aria-hidden="true">{icon}</span>
          )}
          <span>{children}</span>
          {icon && iconPosition === 'right' && (
            <span className="vidarix-solid-button__icon" aria-hidden="true">{icon}</span>
          )}
        </>
      )}
    </button>
  );
};
