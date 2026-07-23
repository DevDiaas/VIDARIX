import React, { useState, useEffect } from 'react';
import { Sparkles, SlidersHorizontal, Check, Trash2, Plus, Search, Filter } from 'lucide-react';
import { RouletteMode, RouletteFilters, MediaItem } from '../types';
import { TMDB_GENRES } from '../data/genres';
import { streamingProviders, StreamingProvider } from '../data/streamingProviders';
import { StreamingProviderLogo } from './StreamingProviderLogo';
import { searchMedia, getPosterUrl, fetchWatchProvidersBR } from '../services/tmdbApi';

interface RouletteConfigurationProps {
  mode: RouletteMode;
  setMode: (mode: RouletteMode) => void;
  filters: RouletteFilters;
  setFilters: React.Dispatch<React.SetStateAction<RouletteFilters>>;
  customList: MediaItem[];
  setCustomList: React.Dispatch<React.SetStateAction<MediaItem[]>>;
}

export const RouletteConfiguration: React.FC<RouletteConfigurationProps> = ({
  mode,
  setMode,
  filters,
  setFilters,
  customList,
  setCustomList
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [providersList, setProvidersList] = useState<StreamingProvider[]>(streamingProviders);

  useEffect(() => {
    fetchWatchProvidersBR().then((res) => {
      setProvidersList([...res]);
    });
  }, []);

  // Toggle Genre
  const toggleGenre = (genreId: number) => {
    setFilters((prev) => {
      const exists = prev.genres.includes(genreId);
      return {
        ...prev,
        genres: exists ? prev.genres.filter((g) => g !== genreId) : [...prev.genres, genreId]
      };
    });
  };

  // Toggle Platform
  const togglePlatform = (platformId: number) => {
    setFilters((prev) => {
      const exists = prev.platforms.includes(platformId);
      return {
        ...prev,
        platforms: exists ? prev.platforms.filter((p) => p !== platformId) : [...prev.platforms, platformId]
      };
    });
  };

  // Handle Custom Title Search
  const handleSearchCustom = async (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const results = await searchMedia(q);
    setSearchResults(results.slice(0, 5));
    setIsSearching(false);
  };

  const addCustomTitle = (item: MediaItem) => {
    if (!customList.some((c) => c.id === item.id && c.media_type === item.media_type)) {
      setCustomList((prev) => [...prev, item]);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeCustomTitle = (id: number) => {
    setCustomList((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-[#151823]/80 border border-white/10 rounded-3xl p-5 sm:p-8 backdrop-blur-xl shadow-2xl mb-8">
      {/* Mode Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#10121A] p-1.5 rounded-2xl mb-8 border border-white/5">
        <button
          onClick={() => setMode('category')}
          className={`py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            mode === 'category'
              ? 'bg-[#8B5CF6] text-white shadow-lg shadow-[#8B5CF6]/30'
              : 'text-[#A7A9B4] hover:text-white hover:bg-white/5'
          }`}
        >
          <span>Por Categoria</span>
        </button>

        <button
          onClick={() => setMode('streaming')}
          className={`py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            mode === 'streaming'
              ? 'bg-[#8B5CF6] text-white shadow-lg shadow-[#8B5CF6]/30'
              : 'text-[#A7A9B4] hover:text-white hover:bg-white/5'
          }`}
        >
          <span>Por Streaming</span>
        </button>

        <button
          onClick={() => setMode('custom')}
          className={`py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            mode === 'custom'
              ? 'bg-[#8B5CF6] text-white shadow-lg shadow-[#8B5CF6]/30'
              : 'text-[#A7A9B4] hover:text-white hover:bg-white/5'
          }`}
        >
          <span>Títulos Escolhidos</span>
          {customList.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 text-white font-mono">
              {customList.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setMode('surprise')}
          className={`py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            mode === 'surprise'
              ? 'bg-gradient-to-r from-[#EC4899] to-[#F43F5E] text-white shadow-lg shadow-[#EC4899]/30'
              : 'text-[#A7A9B4] hover:text-white hover:bg-white/5'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Surpreenda-me</span>
        </button>
      </div>

      {/* Mode 1: Category Settings */}
      {mode === 'category' && (
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-[#F7F7FA] uppercase tracking-wider">
                Selecione os Gêneros desejados:
              </h3>
              <span className="text-xs text-[#A7A9B4]">
                {filters.genres.length === 0 ? 'Todos os gêneros' : `${filters.genres.length} selecionados`}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {TMDB_GENRES.slice(0, 18).map((genre) => {
                const selected = filters.genres.includes(genre.id);
                return (
                  <button
                    key={genre.id}
                    onClick={() => toggleGenre(genre.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
                      selected
                        ? 'bg-[#8B5CF6] text-white border-[#8B5CF6] shadow-md'
                        : 'bg-[#10121A] text-[#A7A9B4] border-white/5 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    {genre.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Filters */}
          <div className="pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-[#A7A9B4]">Formato:</span>
              <div className="flex bg-[#10121A] p-1 rounded-xl border border-white/5 text-xs">
                <button
                  onClick={() => setFilters((p) => ({ ...p, mediaType: 'all' }))}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    filters.mediaType === 'all' ? 'bg-[#8B5CF6] text-white' : 'text-[#A7A9B4]'
                  }`}
                >
                  Ambos
                </button>
                <button
                  onClick={() => setFilters((p) => ({ ...p, mediaType: 'movie' }))}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    filters.mediaType === 'movie' ? 'bg-[#8B5CF6] text-white' : 'text-[#A7A9B4]'
                  }`}
                >
                  Filmes
                </button>
                <button
                  onClick={() => setFilters((p) => ({ ...p, mediaType: 'tv' }))}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    filters.mediaType === 'tv' ? 'bg-[#8B5CF6] text-white' : 'text-[#A7A9B4]'
                  }`}
                >
                  Séries
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="flex items-center gap-2 text-xs font-semibold text-[#8B5CF6] hover:underline"
            >
              <Filter className="w-3.5 h-3.5" />
              {showAdvancedFilters ? 'Ocultar Filtros Avançados' : 'Filtros Avançados (Ano, Nota, Duração)'}
            </button>
          </div>

          {/* Advanced Drawer */}
          {showAdvancedFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#10121A] p-4 rounded-2xl border border-white/5 animate-in fade-in duration-200 text-xs">
              <div>
                <label className="block text-[#A7A9B4] mb-1 font-semibold">Nota Mínima (TMDB):</label>
                <select
                  value={filters.minRating}
                  onChange={(e) => setFilters((p) => ({ ...p, minRating: Number(e.target.value) }))}
                  className="w-full bg-[#151823] border border-white/10 rounded-xl p-2.5 text-white"
                >
                  <option value={0}>Qualquer Nota</option>
                  <option value={6}>6.0+ Bom</option>
                  <option value={7}>7.0+ Muito Bom</option>
                  <option value={8}>8.0+ Aclamado</option>
                </select>
              </div>

              <div>
                <label className="block text-[#A7A9B4] mb-1 font-semibold">Opções Adicionais:</label>
                <label className="flex items-center gap-2 cursor-pointer mt-2 text-[#F7F7FA]">
                  <input
                    type="checkbox"
                    checked={filters.excludeWatched}
                    onChange={(e) => setFilters((p) => ({ ...p, excludeWatched: e.target.checked }))}
                    className="accent-[#8B5CF6] w-4 h-4 rounded"
                  />
                  <span>Excluir títulos que já assisti</span>
                </label>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mode 2: Streaming Platform */}
      {mode === 'streaming' && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-[#F7F7FA] uppercase tracking-wider">
            Selecione seus Serviços de Streaming no Brasil:
          </h3>
          <div className="providers-grid">
            {providersList.map((provider) => {
              const selected = filters.platforms.includes(provider.id);
              return (
                <StreamingProviderLogo
                  key={provider.slug}
                  name={provider.name}
                  logoUrl={provider.logoUrl}
                  selected={selected}
                  initials={provider.initials}
                  onClick={() => togglePlatform(provider.id)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Mode 3: Custom Title Selection */}
      {mode === 'custom' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#F7F7FA] uppercase tracking-wider">
              Monte sua lista de opções para a Roleta:
            </h3>
            {customList.length > 0 && (
              <button
                onClick={() => setCustomList([])}
                className="text-xs text-rose-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <Trash2 className="w-3.5 h-3.5" /> Limpar Seleção
              </button>
            )}
          </div>

          {/* Search Input for Adding Titles */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-[#A7A9B4]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchCustom(e.target.value)}
              placeholder="Pesquise um filme ou série para adicionar (ex: Interstellar)..."
              className="w-full bg-[#10121A] border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder-[#A7A9B4] focus:outline-none focus:border-[#8B5CF6]"
            />

            {/* Results Popup */}
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#151823] border border-white/10 rounded-2xl shadow-2xl z-20 overflow-hidden divide-y divide-white/5">
                {searchResults.map((item) => (
                  <div
                    key={`${item.media_type}_${item.id}`}
                    onClick={() => addCustomTitle(item)}
                    className="flex items-center justify-between p-3 hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={getPosterUrl(item.poster_path)}
                        alt={item.title}
                        className="w-8 h-12 object-cover rounded"
                      />
                      <div>
                        <p className="text-xs font-bold text-white">{item.title || item.name}</p>
                        <p className="text-[10px] text-[#A7A9B4]">
                          {(item.release_date || item.first_air_date || '').slice(0, 4)} •{' '}
                          {item.media_type === 'tv' ? 'Série' : 'Filme'}
                        </p>
                      </div>
                    </div>
                    <Plus className="w-4 h-4 text-[#8B5CF6]" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Custom List Items */}
          {customList.length === 0 ? (
            <div className="bg-[#10121A] border border-dashed border-white/10 rounded-2xl p-6 text-center text-xs text-[#A7A9B4]">
              Nenhum título adicionado ainda. Pesquise e adicione pelo menos 2 filmes ou séries para a roleta!
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {customList.map((item) => (
                <div
                  key={`${item.media_type}_${item.id}`}
                  className="flex items-center justify-between bg-[#10121A] border border-white/10 p-2 rounded-xl text-xs"
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <img
                      src={getPosterUrl(item.poster_path)}
                      alt={item.title}
                      className="w-7 h-10 object-cover rounded"
                    />
                    <span className="font-semibold text-white truncate">{item.title || item.name}</span>
                  </div>
                  <button
                    onClick={() => removeCustomTitle(item.id)}
                    className="p-1 text-[#A7A9B4] hover:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {customList.length === 1 && (
            <p className="text-xs text-amber-400 font-semibold text-center">
              Adicione mais 1 título para desbloquear o giro da roleta!
            </p>
          )}
        </div>
      )}

      {/* Mode 4: Surprise Me */}
      {mode === 'surprise' && (
        <div className="text-center py-4 space-y-2">
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#EC4899] to-[#F43F5E] flex items-center justify-center mx-auto shadow-lg shadow-[#EC4899]/40">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-base font-bold text-white">Curadoria Algorítmica Inteligente</h3>
          <p className="text-xs text-[#A7A9B4] max-w-md mx-auto">
            A VIDARIX analisará seus gêneros favoritos, seus serviços de streaming configurados e os filmes
            mais aclamação do público no Brasil para escolher o sorteio perfeito.
          </p>
        </div>
      )}
    </div>
  );
};
