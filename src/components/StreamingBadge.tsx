import React, { useEffect, useMemo, useState } from 'react';
import { WatchProviderItem } from '../types';
import {
  getProviderByTmdbId,
  getProviderInitials,
  getProviderLogoCandidates
} from '../data/streamingProviders';

interface StreamingBadgeProps {
  provider?: WatchProviderItem;
  providerId?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const StreamingBadge: React.FC<StreamingBadgeProps> = ({
  provider,
  providerId,
  size = 'md'
}) => {
  const known = providerId
    ? getProviderByTmdbId(providerId)
    : provider?.provider_id
      ? getProviderByTmdbId(provider.provider_id)
      : undefined;

  const name = known?.name || provider?.provider_name || 'Streaming';
  const initials = known?.initials || getProviderInitials(name);

  const logoCandidates = useMemo(
    () =>
      getProviderLogoCandidates({
        name,
        rawLogoPath: provider?.logo_path,
        knownLogoPath: known?.logoPath,
        knownLogoUrl: known?.logoUrl,
        size: size === 'sm' ? 'w92' : 'w154'
      }),
    [name, provider?.logo_path, known?.logoPath, known?.logoUrl, size]
  );

  const [candidateIndex, setCandidateIndex] = useState(0);

  useEffect(() => {
    setCandidateIndex(0);
  }, [logoCandidates.join('|')]);

  const currentLogo = logoCandidates[candidateIndex] || null;

  const dimensions = {
    sm: 'w-7 h-7 rounded-lg',
    md: 'w-9 h-9 rounded-xl',
    lg: 'w-11 h-11 rounded-xl'
  };

  return (
    <div
      className={`streaming-badge relative inline-flex items-center justify-center overflow-hidden border border-white/10 shadow-md transition-transform hover:scale-105 shrink-0 bg-[#090B12] ${dimensions[size]}`}
      title={`Disponível no ${name}`}
      aria-label={`Logo do ${name}`}
    >
      {currentLogo ? (
        <img
          src={currentLogo}
          alt={`Logo do ${name}`}
          className="streaming-badge__image"
          loading="lazy"
          decoding="async"
          onError={() => setCandidateIndex((index) => index + 1)}
        />
      ) : (
        <span className="streaming-badge__fallback">{initials}</span>
      )}
    </div>
  );
};
