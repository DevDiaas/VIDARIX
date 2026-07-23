import React, { useState, useEffect } from 'react';
import { Search, X, History, Film, Tv, SlidersHorizontal, Loader2 } from 'lucide-react';
import { MediaItem } from '../types';
import { searchMedia, getPosterUrl, fetchWatchProvidersBR } from '../services/tmdbApi';
import { RatingBadge } from './RatingBadge';
import { streamingProviders, StreamingProvider } from '../data/streamingProviders';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMedia: (item: MediaItem) => void;
}

const RECENT_SEARCHES_KEY = 'vidarix_recent_searches';

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectMedia
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'movie' | 'tv'>('all');
  const [selectedPlatform, setSelectedPlatform] = useState<number | null>(null);
  const [providersList, setProvidersList] = useState<StreamingProvider[]>(streamingProviders);

  useEffect(() => {
    fetchWatchProvidersBR().then((res) => {
      setProvidersList([...res]);
    });
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch {
      // Storage fallback
    }
  }, []);

  // Keyboard shortcut listener for '/'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !isOpen && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        // open search trigger
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Debounced Search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      const searchRes = await searchMedia(query);
      setResults(searchRes);
      setLoading(false);
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectResult = (item: MediaItem) => {
    // Save to recent
    if (query.trim() && !recentSearches.includes(query.trim())) {
      const updated = [query.trim(), ...recentSearches.slice(0, 4)];
      setRecentSearches(updated);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch {
        // fallback
      }
    }
    onSelectMedia(item);
    onClose();
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  };

  if (!isOpen) return null;

  // Filter results
  let filtered = results;
  if (filterType !== 'all') {
    filtered = filtered.filter((i) => i.media_type === filterType);
  }
  if (selectedPlatform) {
    filtered = filtered.filter((i) =>
      i.watch_providers?.flatrate?.some((p) => p.provider_id === selectedPlatform)
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-[#151823] border border-white/15 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center gap-3 bg-[#10121A]">
          <Search className="w-5 h-5 text-[#8B5CF6] shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquise por nome de filme, série, ator ou diretor..."
            className="w-full bg-transparent text-sm sm:text-base font-medium text-white placeholder-[#A7A9B4] focus:outline-none"
          />
          {loading && <Loader2 className="w-5 h-5 text-[#8B5CF6] animate-spin shrink-0" />}
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-full text-[#A7A9B4] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 text-xs font-semibold text-[#A7A9B4] hover:text-white hover:bg-white/10 ml-2"
          >
            Esc
          </button>
        </div>

        {/* Filter Pills */}
        <div className="px-4 py-3 bg-[#07080D]/60 border-b border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-[#A7A9B4] font-medium mr-1">Tipo:</span>
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-full font-semibold transition-all ${
                filterType === 'all' ? 'bg-[#8B5CF6] text-white' : 'bg-white/5 text-[#A7A9B4]'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterType('movie')}
              className={`px-3 py-1 rounded-full font-semibold transition-all ${
                filterType === 'movie' ? 'bg-[#8B5CF6] text-white' : 'bg-white/5 text-[#A7A9B4]'
              }`}
            >
              Filmes
            </button>
            <button
              onClick={() => setFilterType('tv')}
              className={`px-3 py-1 rounded-full font-semibold transition-all ${
                filterType === 'tv' ? 'bg-[#8B5CF6] text-white' : 'bg-white/5 text-[#A7A9B4]'
              }`}
            >
              Séries
            </button>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[#A7A9B4] font-medium mr-1">Streaming:</span>
            {providersList.slice(0, 6).map((p) => (
              <button
                key={p.slug}
                onClick={() => setSelectedPlatform(selectedPlatform === p.id ? null : p.id)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                  selectedPlatform === p.id
                    ? 'bg-[#8B5CF6] text-white border-[#8B5CF6]'
                    : 'bg-white/5 text-[#A7A9B4] border-white/5 hover:text-white'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Results / Recent List Body */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {!query.trim() && (
            <div>
              {recentSearches.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-[#A7A9B4] flex items-center gap-1.5 uppercase">
                      <History className="w-3.5 h-3.5 text-[#8B5CF6]" /> Pesquisas Recentes
                    </span>
                    <button
                      onClick={clearRecentSearches}
                      className="text-xs text-rose-400 hover:underline"
                    >
                      Limpar
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((term, idx) => (
                      <button
                        key={idx}
                        onClick={() => setQuery(term)}
                        className="px-3.5 py-1.5 rounded-xl bg-[#10121A] border border-white/5 text-xs text-[#F7F7FA] hover:border-white/20"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-center py-8 text-xs text-[#A7A9B4]">
                Digite o nome de qualquer filme, série ou artista para iniciar a busca na VIDARIX.
              </div>
            </div>
          )}

          {query.trim() && filtered.length === 0 && !loading && (
            <div className="text-center py-12">
              <p className="text-sm font-bold text-white mb-1">Nenhum resultado encontrado</p>
              <p className="text-xs text-[#A7A9B4]">
                Tente buscar por termos mais genéricos ou mudar os filtros selecionados.
              </p>
            </div>
          )}

          {filtered.map((item) => {
            const title = item.title || item.name;
            const year = (item.release_date || item.first_air_date || '').slice(0, 4);
            const poster = getPosterUrl(item.poster_path);

            return (
              <div
                key={`${item.media_type}_${item.id}`}
                onClick={() => handleSelectResult(item)}
                className="flex items-center justify-between p-3 rounded-2xl bg-[#10121A] border border-white/5 hover:border-[#8B5CF6]/50 hover:bg-[#151823] cursor-pointer transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={poster}
                    alt={title}
                    className="w-10 h-14 object-cover rounded-xl shrink-0 border border-white/10"
                  />
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-white group-hover:text-[#8B5CF6] transition-colors truncate">
                      {title}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-[#A7A9B4] mt-1">
                      <span>{year || 'Sem data'}</span>
                      <span>•</span>
                      <span className="uppercase text-[10px] font-semibold px-1.5 py-0.2 rounded bg-white/5">
                        {item.media_type === 'tv' ? 'Série' : 'Filme'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 ml-2">
                  <RatingBadge rating={item.vote_average} size="sm" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
