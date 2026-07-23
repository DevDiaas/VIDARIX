import React, { useEffect, useState } from 'react';
import { Bookmark, BookmarkCheck, MonitorPlay, Play, Sparkles } from 'lucide-react';
import { MediaItem } from '../types';
import { getBackdropUrl } from '../services/tmdbApi';
import { getGenreName } from '../data/genres';

interface HeroProps {
  featuredItems: MediaItem[];
  savedIds: Set<number>;
  onSelectMedia: (item: MediaItem) => void;
  onOpenRoulette: () => void;
  onToggleWatchlist: (item: MediaItem, e: React.MouseEvent) => void;
}

function formatRuntime(minutes?: number) {
  if (!minutes) return null;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours}h ${rest}min` : `${rest}min`;
}

export const Hero: React.FC<HeroProps> = ({
  featuredItems,
  savedIds,
  onSelectMedia,
  onOpenRoulette,
  onToggleWatchlist
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (featuredItems.length <= 1) return;
    const timer = window.setInterval(() => {
      setCurrentIndex((index) => (index + 1) % featuredItems.length);
    }, 8500);
    return () => window.clearInterval(timer);
  }, [featuredItems.length]);

  const item = featuredItems[currentIndex] || featuredItems[0];
  if (!item) return null;

  const title = item.title || item.name || 'Destaque VIDARIX';
  const year = (item.release_date || item.first_air_date || '').slice(0, 4);
  const runtime = formatRuntime(item.runtime || item.episode_run_time?.[0]);
  const genres = item.genre_ids?.slice(0, 3).map(getGenreName).filter(Boolean).join(', ');
  const isSaved = savedIds.has(item.id);

  return (
    <section className="cinema-hero" aria-label={`Destaque: ${title}`}>
      <img
        className="cinema-hero__backdrop"
        src={getBackdropUrl(item.backdrop_path)}
        alt=""
        aria-hidden="true"
      />
      <div className="cinema-hero__wash" />

      <div className="cinema-hero__content">
        <span className="cinema-hero__type">{item.media_type === 'tv' ? 'SÉRIE' : 'FILME'}</span>
        <h1>{title}</h1>

        <div className="cinema-hero__meta">
          {year && <span>{year}</span>}
          {runtime && <><i /> <span>{runtime}</span></>}
          <i />
          <span className="cinema-hero__rating">★ {item.vote_average?.toFixed(1) || '—'}</span>
          {genres && <><i /> <span>{genres}</span></>}
        </div>

        <p>{item.overview || 'Uma história selecionada para transformar sua próxima sessão.'}</p>

        <div className="cinema-hero__actions">
          <button className="brand-primary-button" onClick={() => onSelectMedia(item)}>
            <Play aria-hidden="true" />
            <span>Ver detalhes</span>
          </button>
          <button className="brand-secondary-button" onClick={() => onSelectMedia(item)}>
            <MonitorPlay aria-hidden="true" />
            <span>Onde assistir</span>
          </button>
          <button
            className={`cinema-hero__save ${isSaved ? 'is-saved' : ''}`}
            onClick={(event) => onToggleWatchlist(item, event)}
            aria-label={isSaved ? 'Remover da minha lista' : 'Adicionar à minha lista'}
            title={isSaved ? 'Na minha lista' : 'Adicionar à lista'}
          >
            {isSaved ? <BookmarkCheck /> : <Bookmark />}
          </button>
          <button className="cinema-hero__roulette" onClick={onOpenRoulette}>
            <Sparkles aria-hidden="true" />
            <span>Sortear</span>
          </button>
        </div>
      </div>

      {featuredItems.length > 1 && (
        <div className="cinema-hero__dots" aria-label="Selecionar destaque">
          {featuredItems.map((featured, index) => (
            <button
              key={`${featured.media_type}-${featured.id}`}
              className={index === currentIndex ? 'is-active' : ''}
              onClick={() => setCurrentIndex(index)}
              aria-label={`Mostrar destaque ${index + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
};
