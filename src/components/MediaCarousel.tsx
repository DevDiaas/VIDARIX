import React, { useRef } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { MediaItem } from '../types';
import { MovieCard } from './MovieCard';

interface MediaCarouselProps {
  title: string;
  subtitle?: string;
  items: MediaItem[];
  savedIds: Set<number>;
  onSelectMedia: (item: MediaItem) => void;
  onToggleWatchlist: (item: MediaItem, e: React.MouseEvent) => void;
  onSeeAll?: () => void;
}

export const MediaCarousel: React.FC<MediaCarouselProps> = ({
  title,
  subtitle,
  items,
  savedIds,
  onSelectMedia,
  onToggleWatchlist,
  onSeeAll
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollBy({ left: (direction === 'left' ? -1 : 1) * container.clientWidth * 0.82, behavior: 'smooth' });
  };

  if (!items?.length) return null;

  return (
    <section className="media-rail">
      <div className="media-rail__header">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <div className="media-rail__actions">
          {onSeeAll && (
            <button className="media-rail__see-all" onClick={onSeeAll}>
              <span>Ver todos</span><ArrowRight />
            </button>
          )}
          <button onClick={() => scroll('left')} aria-label="Rolar para a esquerda"><ChevronLeft /></button>
          <button onClick={() => scroll('right')} aria-label="Rolar para a direita"><ChevronRight /></button>
        </div>
      </div>
      <div ref={scrollRef} className="media-rail__track no-scrollbar">
        {items.map((item) => (
          <div key={`${item.media_type}_${item.id}`} className="media-rail__item">
            <MovieCard
              item={item}
              isSaved={savedIds.has(item.id)}
              onSelect={onSelectMedia}
              onToggleWatchlist={onToggleWatchlist}
            />
          </div>
        ))}
      </div>
    </section>
  );
};
