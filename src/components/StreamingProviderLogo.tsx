import React, { useEffect, useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import {
  getProviderInitials,
  getProviderLogoCandidates
} from '../data/streamingProviders';

export interface StreamingProviderLogoProps {
  name: string;
  logoUrl?: string | null;
  src?: string | null;
  selected?: boolean;
  alt?: string;
  initials?: string;
  onClick?: () => void;
  className?: string;
}

export const StreamingProviderLogo: React.FC<StreamingProviderLogoProps> = ({
  name,
  logoUrl,
  src,
  selected = false,
  alt,
  initials,
  onClick,
  className = ''
}) => {
  const fallbackInitials = initials || getProviderInitials(name);
  const altText = alt || `Logo do ${name}`;

  const logoCandidates = useMemo(
    () =>
      getProviderLogoCandidates({
        name,
        rawLogoPath: src,
        knownLogoUrl: logoUrl,
        size: 'w300'
      }),
    [name, src, logoUrl]
  );

  const [candidateIndex, setCandidateIndex] = useState(0);

  useEffect(() => {
    setCandidateIndex(0);
  }, [logoCandidates.join('|')]);

  const currentLogo = logoCandidates[candidateIndex] || null;

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!onClick || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    onClick();
  };

  return (
    <div
      role={onClick ? 'button' : 'group'}
      tabIndex={onClick ? 0 : undefined}
      aria-label={altText}
      aria-pressed={onClick ? selected : undefined}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={`provider-card ${selected ? 'is-selected' : ''} ${onClick ? 'is-clickable' : ''} ${className}`}
    >
      <div className="provider-logo-wrapper">
        {currentLogo ? (
          <img
            src={currentLogo}
            alt={altText}
            onError={() => setCandidateIndex((index) => index + 1)}
            className="provider-logo provider-logo--onboarding-safe"
            loading="eager"
            decoding="async"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="provider-logo-fallback" aria-label={`Logo indisponível de ${name}`}>
            {fallbackInitials}
          </span>
        )}
      </div>

      <span className="provider-name" title={name}>{name}</span>

      <span className={`provider-check ${selected ? 'is-visible' : ''}`} aria-hidden={!selected}>
        <Check />
      </span>
    </div>
  );
};
