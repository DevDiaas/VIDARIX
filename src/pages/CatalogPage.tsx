import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Filter, Loader2, Sparkles, RefreshCw, X } from 'lucide-react';
import { MediaItem } from '../types';
import { MovieCard } from '../components/MovieCard';
import { TMDB_GENRES } from '../data/genres';
import { streamingProviders, StreamingProvider } from '../data/streamingProviders';
import { StreamingProviderLogo } from '../components/StreamingProviderLogo';
import { discoverCatalog, fetchWatchProvidersBR } from '../services/tmdbApi';

interface CatalogPageProps {
  initialType?: 'movie' | 'tv' | 'all';
  savedIds: Set<number>;
  onSelectMedia: (item: MediaItem) => void;
  onToggleWatchlist: (item: MediaItem, e: React.MouseEvent) => void;
}

export const CatalogPage: React.FC<CatalogPageProps> = ({
  initialType = 'all',
  savedIds,
  onSelectMedia,
  onToggleWatchlist
}) => {
  // Read query params from URL if navigated with filters
  const urlParams = new URLSearchParams(window.location.search);
  const initialProvider = urlParams.get('provider') ? Number(urlParams.get('provider')) : null;
  const initialSort = urlParams.get('sort') || 'popularity.desc';
  const initialGenre = urlParams.get('genre') ? Number(urlParams.get('genre')) : null;

  const [mediaType, setMediaType] = useState<'all' | 'movie' | 'tv'>(initialType);
  const [selectedGenre, setSelectedGenre] = useState<number | null>(initialGenre);
  const [selectedPlatform, setSelectedPlatform] = useState<number | null>(initialProvider);
  const [sortBy, setSortBy] = useState<string>(initialSort);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [providersList, setProvidersList] = useState<StreamingProvider[]>(streamingProviders);

  useEffect(() => {
    fetchWatchProvidersBR().then((res) => {
      setProvidersList([...res]);
    });
  }, []);

  const [items, setItems] = useState<MediaItem[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalResults, setTotalResults] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const activeControllerRef = useRef<AbortController | null>(null);

  // Load page 1 whenever filters change
  const loadFirstPage = useCallback(async () => {
    if (activeControllerRef.current) {
      activeControllerRef.current.abort();
    }
    const controller = new AbortController();
    activeControllerRef.current = controller;

    setIsLoading(true);
    setCurrentPage(1);
    setHasMore(true);

    try {
      const res = await discoverCatalog({
        page: 1,
        mediaType,
        genreId: selectedGenre,
        providerId: selectedPlatform,
        sortBy,
        query: searchQuery
      });

      if (!controller.signal.aborted) {
        setItems(res.items);
        setCurrentPage(res.page);
        setTotalPages(res.totalPages);
        setTotalResults(res.totalResults);
        setHasMore(res.page < res.totalPages);
        setIsLoading(false);
      }
    } catch {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [mediaType, selectedGenre, selectedPlatform, sortBy, searchQuery]);

  useEffect(() => {
    loadFirstPage();
  }, [loadFirstPage]);

  // Load next page for infinite scroll
  const loadNextPage = useCallback(async () => {
    if (isLoading || isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    const nextPage = currentPage + 1;

    try {
      const res = await discoverCatalog({
        page: nextPage,
        mediaType,
        genreId: selectedGenre,
        providerId: selectedPlatform,
        sortBy,
        query: searchQuery
      });

      setItems((prev) => {
        const existingIds = new Set(prev.map((item) => `${item.media_type}_${item.id}`));
        const newUnique = res.items.filter((item) => !existingIds.has(`${item.media_type}_${item.id}`));
        return [...prev, ...newUnique];
      });

      setCurrentPage(res.page);
      setTotalPages(res.totalPages);
      setTotalResults(res.totalResults);
      setHasMore(res.page < res.totalPages);
    } catch {
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [currentPage, hasMore, isLoading, isLoadingMore, mediaType, selectedGenre, selectedPlatform, sortBy, searchQuery]);

  // IntersectionObserver for Infinite Scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !isLoadingMore) {
          loadNextPage();
        }
      },
      { rootMargin: '400px' }
    );

    observer.observe(sentinel);
    return () => {
      observer.disconnect();
    };
  }, [hasMore, isLoading, isLoadingMore, loadNextPage]);

  const handleClearFilters = () => {
    setSelectedGenre(null);
    setSelectedPlatform(null);
    setSortBy('popularity.desc');
    setSearchQuery('');
    setMediaType('all');
  };

  const activeFiltersCount =
    (selectedGenre !== null ? 1 : 0) +
    (selectedPlatform !== null ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0) +
    (mediaType !== 'all' ? 1 : 0);

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#8B5CF6]/15 text-[#8B5CF6] text-xs font-bold uppercase tracking-wider mb-2 border border-[#8B5CF6]/30">
            <Sparkles className="w-3.5 h-3.5" /> Catálogo Atualizado no Brasil
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            {mediaType === 'movie' ? 'Explorar Filmes' : mediaType === 'tv' ? 'Explorar Séries' : 'Catálogo Completo'}
          </h1>
          <p className="text-xs sm:text-sm text-[#A7A9B4] mt-1">
            Navegue por milhares de filmes e séries, filtre por streaming no Brasil e descubra onde assistir.
          </p>
        </div>

        {totalResults > 0 && !isLoading && (
          <div className="text-xs text-[#A7A9B4] bg-[#151823] px-4 py-2.5 rounded-2xl border border-white/10 shrink-0 font-medium">
            Exibindo <span className="font-bold text-white">{items.length}</span> de{' '}
            <span className="font-bold text-[#8B5CF6]">{totalResults.toLocaleString('pt-BR')}</span> títulos
          </div>
        )}
      </div>

      {/* Filter Panel */}
      <div className="bg-[#151823] border border-white/10 rounded-3xl p-4 sm:p-6 mb-8 space-y-5 shadow-xl">
        {/* Row 1: Search & Type & Sort */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-5 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-[#A7A9B4]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar título, ator ou palavra-chave..."
              className="w-full bg-[#10121A] border border-white/10 rounded-2xl pl-10 pr-9 py-2.5 text-xs text-white placeholder-[#A7A9B4] focus:outline-none focus:border-[#8B5CF6]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-[#A7A9B4] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Media type toggle */}
          <div className="lg:col-span-4 flex bg-[#10121A] p-1 rounded-2xl border border-white/5 text-xs">
            <button
              onClick={() => setMediaType('all')}
              className={`flex-1 py-2 rounded-xl font-bold transition-all ${
                mediaType === 'all' ? 'bg-[#8B5CF6] text-white shadow-md' : 'text-[#A7A9B4] hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setMediaType('movie')}
              className={`flex-1 py-2 rounded-xl font-bold transition-all ${
                mediaType === 'movie' ? 'bg-[#8B5CF6] text-white shadow-md' : 'text-[#A7A9B4] hover:text-white'
              }`}
            >
              Filmes
            </button>
            <button
              onClick={() => setMediaType('tv')}
              className={`flex-1 py-2 rounded-xl font-bold transition-all ${
                mediaType === 'tv' ? 'bg-[#8B5CF6] text-white shadow-md' : 'text-[#A7A9B4] hover:text-white'
              }`}
            >
              Séries
            </button>
          </div>

          {/* Sort selector */}
          <div className="lg:col-span-3 flex items-center gap-2 text-xs">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-[#10121A] border border-white/10 rounded-2xl px-3.5 py-2.5 text-white font-bold focus:outline-none focus:border-[#8B5CF6]"
            >
              <option value="popularity.desc">Mais Populares</option>
              <option value="vote_average.desc">Melhor Avaliados</option>
              <option value="primary_release_date.desc">Lançamentos Recentes</option>
              <option value="title.asc">Ordem Alfabética (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Row 2: Streaming Platforms Filter */}
        <div className="space-y-2 pt-2 border-t border-white/5">
          <div className="flex items-center justify-between text-xs font-bold text-[#A7A9B4]">
            <span>Filtrar por Plataforma de Streaming no Brasil:</span>
            {selectedPlatform && (
              <button
                onClick={() => setSelectedPlatform(null)}
                className="text-xs text-[#EC4899] hover:underline"
              >
                Limpar Plataforma
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            <button
              onClick={() => setSelectedPlatform(null)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold shrink-0 border transition-all ${
                selectedPlatform === null
                  ? 'bg-[#8B5CF6] text-white border-[#8B5CF6]'
                  : 'bg-[#10121A] text-[#A7A9B4] border-white/10 hover:text-white'
              }`}
            >
              Todas Plataformas
            </button>
            {providersList.map((provider) => {
              const active = selectedPlatform === provider.id;
              return (
                <button
                  key={provider.slug}
                  onClick={() => setSelectedPlatform(active ? null : provider.id)}
                  className={`px-3 py-1.5 rounded-2xl text-xs font-bold shrink-0 border transition-all flex items-center gap-2 ${
                    active
                      ? 'bg-[#10121A] border-[#8B5CF6] text-white ring-1 ring-[#8B5CF6]'
                      : 'bg-[#10121A]/60 border-white/5 text-[#A7A9B4] hover:text-white'
                  }`}
                >
                  {provider.logoUrl ? (
                    <img src={provider.logoUrl} alt={`Logo do ${provider.name}`} className="w-5 h-5 object-contain" />
                  ) : (
                    <span className="w-5 h-5 rounded-full bg-[#8B5CF6] text-white flex items-center justify-center text-[10px] font-black">
                      {provider.initials}
                    </span>
                  )}
                  <span>{provider.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 3: Genres Scroll */}
        <div className="space-y-2 pt-2 border-t border-white/5">
          <div className="flex items-center justify-between text-xs font-bold text-[#A7A9B4]">
            <span>Filtrar por Gênero:</span>
            {selectedGenre && (
              <button
                onClick={() => setSelectedGenre(null)}
                className="text-xs text-[#EC4899] hover:underline"
              >
                Limpar Gênero
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            <button
              onClick={() => setSelectedGenre(null)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                selectedGenre === null
                  ? 'bg-[#EC4899] text-white shadow-md'
                  : 'bg-[#10121A] text-[#A7A9B4] hover:text-white'
              }`}
            >
              Todos os Gêneros
            </button>
            {TMDB_GENRES.map((genre) => (
              <button
                key={genre.id}
                onClick={() => setSelectedGenre(selectedGenre === genre.id ? null : genre.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                  selectedGenre === genre.id
                    ? 'bg-[#8B5CF6] text-white shadow-md'
                    : 'bg-[#10121A] text-[#A7A9B4] hover:text-white'
                }`}
              >
                {genre.name}
              </button>
            ))}
          </div>
        </div>

        {/* Active Filters Clear Action */}
        {activeFiltersCount > 0 && (
          <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-[#A7A9B4]">
            <span>{activeFiltersCount} filtro(s) ativo(s)</span>
            <button
              onClick={handleClearFilters}
              className="text-[#EC4899] hover:underline font-bold flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Limpar Todos os Filtros
            </button>
          </div>
        )}
      </div>

      {/* Initial Skeleton Loader */}
      {isLoading ? (
        <div className="catalog-grid">
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[2/3] bg-[#151823] rounded-3xl animate-pulse border border-white/5"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        /* Empty State */
        <div className="text-center py-20 bg-[#151823]/60 border border-white/10 rounded-3xl p-8 max-w-lg mx-auto my-12">
          <div className="w-16 h-16 rounded-full bg-[#8B5CF6]/20 text-[#8B5CF6] flex items-center justify-center mx-auto mb-4">
            <Filter className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Nenhum resultado encontrado</h3>
          <p className="text-xs text-[#A7A9B4] mb-6 leading-relaxed">
            Não encontramos títulos para a combinação de filtros selecionada. Tente remover alguns filtros para expandir a busca.
          </p>
          <button
            onClick={handleClearFilters}
            className="px-6 py-3 rounded-2xl bg-[#8B5CF6] text-white font-bold text-xs hover:bg-[#8B5CF6]/90 transition-all shadow-lg shadow-[#8B5CF6]/30"
          >
            Limpar Filtros e Ver Todos
          </button>
        </div>
      ) : (
        /* Catalog Items Grid */
        <div className="space-y-12">
          <div className="catalog-grid">
            {items.map((item) => (
              <MovieCard
                key={`${item.media_type}_${item.id}`}
                item={item}
                isSaved={savedIds.has(item.id)}
                onSelect={onSelectMedia}
                onToggleWatchlist={onToggleWatchlist}
              />
            ))}
          </div>

          {/* Sentinel Element & Infinite Scroll Spinner */}
          <div ref={sentinelRef} className="py-8 text-center flex flex-col items-center justify-center">
            {isLoadingMore && (
              <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-[#151823] border border-white/10 text-xs font-bold text-white shadow-xl animate-in fade-in duration-200">
                <Loader2 className="w-5 h-5 text-[#8B5CF6] animate-spin" />
                <span>Carregando mais títulos...</span>
              </div>
            )}

            {!hasMore && items.length > 0 && (
              <p className="text-xs text-[#A7A9B4] italic py-4">
                Você chegou ao fim do catálogo para estes filtros! ✨
              </p>
            )}

            {hasMore && !isLoadingMore && (
              <button
                onClick={loadNextPage}
                className="px-6 py-3 rounded-2xl bg-[#151823] hover:bg-[#10121A] border border-white/10 hover:border-[#8B5CF6]/40 text-xs font-bold text-white transition-all shadow-lg"
              >
                Carregar mais filmes e séries
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
