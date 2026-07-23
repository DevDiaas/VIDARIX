import React, { useState } from 'react';
import { Bookmark, Check, Star, Trash2, Sparkles, Filter } from 'lucide-react';
import { UserWatchlistItem, WatchlistStatus, MediaItem } from '../types';
import { MovieCard } from '../components/MovieCard';
import { StorageService } from '../services/storageService';

interface WatchlistPageProps {
  watchlist: UserWatchlistItem[];
  onRefreshWatchlist: () => void;
  onSelectMedia: (item: MediaItem) => void;
  onToggleWatchlist: (item: MediaItem, e: React.MouseEvent) => void;
}

export const WatchlistPage: React.FC<WatchlistPageProps> = ({
  watchlist,
  onRefreshWatchlist,
  onSelectMedia,
  onToggleWatchlist
}) => {
  const [activeTab, setActiveTab] = useState<WatchlistStatus | 'roulette' | 'ratings'>('watchlist');

  const filteredItems = watchlist.filter((item) => {
    if (activeTab === 'watchlist') return item.status === 'watchlist';
    if (activeTab === 'watched') return item.status === 'watched';
    if (activeTab === 'favorites') return item.status === 'favorites';
    if (activeTab === 'ratings') return item.userRating !== undefined && item.userRating > 0;
    return true;
  });

  const handleRemove = (mediaId: number, mediaType: string, e: React.MouseEvent) => {
    e.stopPropagation();
    StorageService.removeFromWatchlist(mediaId, mediaType);
    onRefreshWatchlist();
  };

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Minha Lista Pessoal</h1>
        <p className="text-xs sm:text-sm text-[#A7A9B4] mt-1">
          Gerencie seus filmes salvos, títulos assistidos, favoritos e avaliações.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar bg-[#151823] p-1.5 rounded-2xl border border-white/10 mb-8">
        <button
          onClick={() => setActiveTab('watchlist')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shrink-0 transition-all ${
            activeTab === 'watchlist'
              ? 'bg-[#8B5CF6] text-white shadow-lg'
              : 'text-[#A7A9B4] hover:text-white'
          }`}
        >
          <Bookmark className="w-4 h-4" /> Quero Assistir
        </button>

        <button
          onClick={() => setActiveTab('watched')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shrink-0 transition-all ${
            activeTab === 'watched'
              ? 'bg-[#8B5CF6] text-white shadow-lg'
              : 'text-[#A7A9B4] hover:text-white'
          }`}
        >
          <Check className="w-4 h-4" /> Já Assisti
        </button>

        <button
          onClick={() => setActiveTab('favorites')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shrink-0 transition-all ${
            activeTab === 'favorites'
              ? 'bg-[#8B5CF6] text-white shadow-lg'
              : 'text-[#A7A9B4] hover:text-white'
          }`}
        >
          <Star className="w-4 h-4 text-amber-400 fill-current" /> Favoritos
        </button>

        <button
          onClick={() => setActiveTab('ratings')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shrink-0 transition-all ${
            activeTab === 'ratings'
              ? 'bg-[#8B5CF6] text-white shadow-lg'
              : 'text-[#A7A9B4] hover:text-white'
          }`}
        >
          <Star className="w-4 h-4" /> Avaliados por mim
        </button>
      </div>

      {/* Content Grid */}
      {filteredItems.length === 0 ? (
        <div className="bg-[#151823]/50 border border-white/5 rounded-3xl p-12 text-center max-w-lg mx-auto my-12">
          <Bookmark className="w-12 h-12 text-[#8B5CF6] mx-auto mb-3 opacity-60" />
          <h3 className="text-base font-bold text-white mb-1">Esta lista está vazia</h3>
          <p className="text-xs text-[#A7A9B4] leading-relaxed">
            Navegue pelo catálogo de filmes e séries para salvar histórias em sua lista pessoal.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {filteredItems.map((entry) => (
            <div key={entry.id} className="relative group">
              <MovieCard
                item={entry.item}
                isSaved={true}
                onSelect={onSelectMedia}
                onToggleWatchlist={onToggleWatchlist}
              />
              <button
                onClick={(e) => handleRemove(entry.mediaId, entry.mediaType, e)}
                className="absolute top-2 right-2 p-2 rounded-full bg-rose-600/90 text-white opacity-0 group-hover:opacity-100 transition-opacity z-20 hover:scale-110 shadow-lg"
                title="Remover da lista"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
