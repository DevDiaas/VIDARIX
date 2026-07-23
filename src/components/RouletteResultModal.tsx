import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronDown,
  ChevronUp,
  Play,
  RotateCcw,
  Share2,
  Sparkles,
  Tv,
  X
} from 'lucide-react';
import { MediaItem } from '../types';
import { getBackdropUrl, getPosterUrl } from '../services/tmdbApi';
import { RatingBadge } from './RatingBadge';
import { StreamingBadge } from './StreamingBadge';
import { getGenreName } from '../data/genres';
import { ShareCard } from './ShareCard';

interface RouletteResultModalProps {
  item: MediaItem;
  isSaved: boolean;
  isWatched: boolean;
  onClose: () => void;
  onSpinAgain: () => void;
  onSelectMedia: (item: MediaItem) => void;
  onToggleWatchlist: (item: MediaItem, status: 'watchlist' | 'watched') => void;
}

export const RouletteResultModal: React.FC<RouletteResultModalProps> = ({
  item,
  isSaved,
  isWatched,
  onClose,
  onSpinAgain,
  onSelectMedia,
  onToggleWatchlist
}) => {
  const modalRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [copied, setCopied] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const [showFullOverview, setShowFullOverview] = useState(false);

  const title = item.title || item.name || 'Título sorteado';
  const year = (item.release_date || item.first_air_date || '').slice(0, 4);
  const backdropUrl = getBackdropUrl(item.backdrop_path);
  const posterUrl = getPosterUrl(item.poster_path);
  const overview = item.overview || 'Sinopse ainda não disponível.';
  const isLongOverview = overview.length > 330;
  const displayedOverview = isLongOverview && !showFullOverview ? `${overview.slice(0, 330).trim()}…` : overview;
  const flatrate = item.watch_providers?.flatrate || [];
  const rent = item.watch_providers?.rent || [];
  const buy = item.watch_providers?.buy || [];
  const hasProviders = flatrate.length > 0 || rent.length > 0 || buy.length > 0;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !modalRef.current) return;
      const focusable = Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ) as HTMLElement[];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  const handleShare = async () => {
    const text = `Hoje vamos assistir: ${title}${year ? ` (${year})` : ''} — escolhido pela VIDARIX.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `VIDARIX — ${title}`, text });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2500);
      } else {
        setShowShareCard((value) => !value);
      }
    } catch {
      // Sharing can be cancelled by the user; no error UI is necessary.
    }
  };

  const renderProviderGroup = (label: string, providers: typeof flatrate) => {
    if (providers.length === 0) return null;
    return (
      <div className="vidarix-result-provider-group">
        <span>{label}</span>
        <div>
          {providers.map((provider) => (
            <div key={`${label}-${provider.provider_id}`} className="vidarix-result-provider-chip">
              <StreamingBadge provider={provider} size="sm" />
              <span>{provider.provider_name}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return createPortal(
    <div
      id="vidarix-roulette-result-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={modalRef}
        id="vidarix-roulette-result-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="roulette-result-title"
        aria-describedby="roulette-result-description"
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          ref={closeButtonRef}
          type="button"
          className="vidarix-result-close"
          aria-label="Fechar resultado da roleta"
          onClick={onClose}
        >
          <X aria-hidden="true" />
        </button>

        <header className="vidarix-result-hero">
          <img src={backdropUrl} alt="" className="vidarix-result-backdrop-image" />
          <div className="vidarix-result-backdrop-overlay" />
          <div className="vidarix-result-title-block">
            <span className="vidarix-result-kicker">
              <Sparkles aria-hidden="true" /> Escolha da VIDARIX
            </span>
            <h2 id="roulette-result-title">{title}</h2>
            <div className="vidarix-result-quick-meta">
              <RatingBadge rating={item.vote_average} size="md" />
              {year && <span>{year}</span>}
              {item.runtime && <span>{item.runtime} min</span>}
              <span>{item.media_type === 'tv' ? 'Série' : 'Filme'}</span>
            </div>
          </div>
        </header>

        <div className="vidarix-result-body">
          <aside className="vidarix-result-poster-column">
            <img src={posterUrl} alt={`Pôster de ${title}`} className="vidarix-result-poster" />
            <div className="vidarix-result-selection-note">
              <span>Resultado confirmado</span>
              <strong>{title}</strong>
            </div>
          </aside>

          <div className="vidarix-result-information">
            {item.genre_ids?.length > 0 && (
              <p className="vidarix-result-genres">
                {item.genre_ids.map(getGenreName).filter(Boolean).slice(0, 5).join(' • ')}
              </p>
            )}

            <div className="vidarix-result-synopsis">
              <h3>Sinopse</h3>
              <p id="roulette-result-description">{displayedOverview}</p>
              {isLongOverview && (
                <button type="button" onClick={() => setShowFullOverview((value) => !value)}>
                  {showFullOverview ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
                  {showFullOverview ? 'Mostrar menos' : 'Ler sinopse completa'}
                </button>
              )}
            </div>

            <section className="vidarix-result-providers" aria-label="Onde assistir no Brasil">
              <div className="vidarix-result-providers__title">
                <Tv aria-hidden="true" />
                <div>
                  <strong>Onde assistir no Brasil</strong>
                  <span>Disponibilidade informada pelo catálogo</span>
                </div>
              </div>

              {hasProviders ? (
                <div className="vidarix-result-provider-list">
                  {renderProviderGroup('Incluído na assinatura', flatrate)}
                  {renderProviderGroup('Aluguel', rent)}
                  {renderProviderGroup('Compra', buy)}
                </div>
              ) : (
                <p className="vidarix-result-empty-provider">
                  Não encontramos disponibilidade para este título no Brasil no momento.
                </p>
              )}
            </section>

            {showShareCard && <ShareCard item={item} />}
          </div>
        </div>

        <footer className="vidarix-result-actions">
          <div className="vidarix-result-actions__main">
            <button
              type="button"
              className="vidarix-result-action vidarix-result-action--primary"
              onClick={() => {
                onSelectMedia(item);
                onClose();
              }}
            >
              <Play aria-hidden="true" /> Ver detalhes
            </button>

            <button
              type="button"
              className={`vidarix-result-action ${isSaved ? 'is-success' : ''}`}
              onClick={() => onToggleWatchlist(item, 'watchlist')}
            >
              {isSaved ? <BookmarkCheck aria-hidden="true" /> : <Bookmark aria-hidden="true" />}
              {isSaved ? 'Na minha lista' : 'Salvar'}
            </button>

            <button
              type="button"
              className={`vidarix-result-action ${isWatched ? 'is-active' : ''}`}
              onClick={() => onToggleWatchlist(item, 'watched')}
            >
              <Check aria-hidden="true" /> {isWatched ? 'Já assisti' : 'Marcar visto'}
            </button>

            <button type="button" className="vidarix-result-action" onClick={onSpinAgain}>
              <RotateCcw aria-hidden="true" /> Girar novamente
            </button>
          </div>

          <button type="button" className="vidarix-result-share" onClick={handleShare}>
            {copied ? <Check aria-hidden="true" /> : <Share2 aria-hidden="true" />}
            {copied ? 'Copiado' : 'Compartilhar'}
          </button>
        </footer>
      </section>
    </div>,
    document.body
  );
};
