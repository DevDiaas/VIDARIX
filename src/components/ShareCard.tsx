import React from 'react';
import { MediaItem } from '../types';
import { getBackdropUrl, getPosterUrl } from '../services/tmdbApi';
import { RatingBadge } from './RatingBadge';

interface ShareCardProps {
  item: MediaItem;
}

export const ShareCard: React.FC<ShareCardProps> = ({ item }) => {
  const title = item.title || item.name;
  const year = (item.release_date || item.first_air_date || '').slice(0, 4);

  return (
    <div className="relative w-full aspect-[1200/630] rounded-3xl overflow-hidden bg-[#07080D] border border-white/20 p-6 sm:p-8 flex flex-col justify-between shadow-2xl">
      {/* Background with blur vignette */}
      <div className="absolute inset-0 z-0">
        <img
          src={getBackdropUrl(item.backdrop_path)}
          alt={title}
          className="w-full h-full object-cover opacity-30 filter blur-sm"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#07080D] via-[#07080D]/80 to-transparent" />
      </div>

      {/* Brand Header */}
      <div className="relative z-10 flex items-center justify-between">
        <img
          src="/brand/vidarix-logo-horizontal.png"
          alt="VIDARIX"
          className="h-8 w-auto object-contain"
        />
        <span className="text-xs font-bold text-[#EC4899] uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full backdrop-blur-md">
          Sorteio Cinematográfico
        </span>
      </div>

      {/* Center Title Content */}
      <div className="relative z-10 flex items-center gap-6 my-auto">
        <img
          src={getPosterUrl(item.poster_path)}
          alt={title}
          className="w-24 sm:w-32 aspect-[2/3] object-cover rounded-2xl shadow-2xl border border-white/10 shrink-0"
        />
        <div>
          <p className="text-xs font-semibold text-[#8B5CF6] uppercase tracking-wider mb-1">
            Hoje vamos assistir:
          </p>
          <h2 className="text-2xl sm:text-4xl font-black text-white leading-tight mb-2">
            {title}
          </h2>
          <div className="flex items-center gap-3">
            <RatingBadge rating={item.vote_average} size="sm" />
            <span className="text-xs text-[#A7A9B4] font-medium">{year}</span>
          </div>
        </div>
      </div>

      {/* Footer Tagline */}
      <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-[#A7A9B4]">
        <span>escolhido pela VIDARIX</span>
        <span>vidarix.com.br</span>
      </div>
    </div>
  );
};
