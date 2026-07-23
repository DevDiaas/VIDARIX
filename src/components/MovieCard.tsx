import React from 'react';
import { Bookmark, BookmarkCheck, Play } from 'lucide-react';
import { MediaItem } from '../types';
import { getPosterUrl } from '../services/tmdbApi';
import { getGenreName } from '../data/genres';

interface MovieCardProps {
  item: MediaItem;
  isSaved?: boolean;
  onSelect: (item: MediaItem) => void;
  onToggleWatchlist: (item: MediaItem, e: React.MouseEvent) => void;
}

export const MovieCard: React.FC<MovieCardProps> = ({ item, isSaved = false, onSelect, onToggleWatchlist }) => {
  const title = item.title || item.name || 'Sem título';
  const year = (item.release_date || item.first_air_date || '').slice(0, 4);
  const genre = item.genre_ids?.[0] ? getGenreName(item.genre_ids[0]) : 'Entretenimento';
  const provider = item.watch_providers?.flatrate?.[0];

  return (
    <article className="poster-card" onClick={() => onSelect(item)}>
      <div className="poster-card__image">
        <img src={getPosterUrl(item.poster_path)} alt={title} loading="lazy" referrerPolicy="no-referrer" />
        <span className="poster-card__rating">★ {item.vote_average?.toFixed(1) || '—'}</span>
        <button
          className={`poster-card__save ${isSaved ? 'is-saved' : ''}`}
          onClick={(event) => onToggleWatchlist(item, event)}
          aria-label={isSaved ? 'Remover da lista' : 'Salvar na lista'}
        >
          {isSaved ? <BookmarkCheck /> : <Bookmark />}
        </button>
        <div className="poster-card__overlay"><span><Play /> Ver detalhes</span></div>
      </div>
      <div className="poster-card__info">
        <h3>{title}</h3>
        <p><span>{year || 'Em breve'}</span><i /> <span>{genre}</span></p>
        {provider && <small>{provider.provider_name}</small>}
      </div>
    </article>
  );
};
