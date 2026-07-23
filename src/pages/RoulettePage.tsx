import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { MediaItem, RouletteMode, RouletteFilters } from '../types';
import { RouletteConfiguration } from '../components/RouletteConfiguration';
import { RouletteWheel } from '../components/RouletteWheel';
import { RouletteResultModal } from '../components/RouletteResultModal';
import { discoverCatalog, fetchTrending } from '../services/tmdbApi';
import { StorageService } from '../services/storageService';

interface RoulettePageProps {
  allMedia: MediaItem[];
  savedIds: Set<number>;
  soundEnabled: boolean;
  onSelectMedia: (item: MediaItem) => void;
  onToggleWatchlist: (item: MediaItem, status: 'watchlist' | 'watched') => void;
}

export const RoulettePage: React.FC<RoulettePageProps> = ({
  allMedia,
  savedIds,
  soundEnabled,
  onSelectMedia,
  onToggleWatchlist
}) => {
  const [mode, setMode] = useState<RouletteMode>('category');
  const [filters, setFilters] = useState<RouletteFilters>({
    genres: [],
    mediaType: 'all',
    minRating: 0,
    onlyNewReleases: false,
    excludeWatched: false,
    platforms: []
  });

  const [customList, setCustomList] = useState<MediaItem[]>([]);
  const [candidates, setCandidates] = useState<MediaItem[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [winnerItem, setWinnerItem] = useState<MediaItem | null>(null);

  // Compute candidates based on active mode & filters
  useEffect(() => {
    let isMounted = true;
    setLoadingCandidates(true);

    const computeCandidates = async () => {
      if (mode === 'custom') {
        if (isMounted) {
          setCandidates(customList);
          setLoadingCandidates(false);
        }
        return;
      }

      try {
        let pool: MediaItem[] = [];

        if (mode === 'category') {
          const page = Math.floor(Math.random() * 3) + 1;
          const genreId = filters.genres.length > 0 ? filters.genres[0] : null;
          const res = await discoverCatalog({
            page,
            mediaType: filters.mediaType,
            genreId,
            minRating: filters.minRating,
            sortBy: 'popularity.desc'
          });
          pool = res.items;
        } else if (mode === 'streaming') {
          const page = Math.floor(Math.random() * 3) + 1;
          const providerId = filters.platforms.length > 0 ? filters.platforms[0] : null;
          const res = await discoverCatalog({
            page,
            mediaType: filters.mediaType,
            providerId,
            minRating: filters.minRating,
            sortBy: 'popularity.desc'
          });
          pool = res.items;
        } else if (mode === 'surprise') {
          const trending = await fetchTrending('all', Math.floor(Math.random() * 2) + 1);
          pool = trending;
        }

        if (pool.length === 0) {
          pool = allMedia;
        }

        // Apply watched filter if required
        if (filters.excludeWatched) {
          const watchedItems = StorageService.getWatchlist().filter((w) => w.status === 'watched');
          const watchedKeys = new Set(watchedItems.map((w) => `${w.mediaType}_${w.mediaId}`));
          pool = pool.filter((item) => !watchedKeys.has(`${item.media_type}_${item.id}`));
        }

        if (isMounted) {
          // Shuffle candidates pool
          const shuffled = [...pool].sort(() => Math.random() - 0.5);
          setCandidates(shuffled.length > 0 ? shuffled : allMedia);
          setLoadingCandidates(false);
        }
      } catch {
        if (isMounted) {
          setCandidates(allMedia);
          setLoadingCandidates(false);
        }
      }
    };

    computeCandidates();
    return () => {
      isMounted = false;
    };
  }, [mode, filters, customList, allMedia]);

  const handleSpinEnd = (winner: MediaItem) => {
    setWinnerItem(winner);
    StorageService.addSpinToHistory({
      resultMedia: winner,
      mode
    });
  };

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="text-center max-w-2xl mx-auto mb-8">
        <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#7868C7]/20 text-[#9588DB] text-xs font-black uppercase tracking-widest mb-3 border border-[#7868C7]/30">
          <Sparkles className="w-4 h-4" /> Roleta Cinematográfica
        </span>
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
          O que vamos assistir hoje?
        </h1>
        <p className="text-sm sm:text-base text-[#A7A9B4] mt-2 font-medium">
          Deixe a VIDARIX escolher sua próxima história.
        </p>
      </div>

      {/* Configuration Settings Box */}
      <RouletteConfiguration
        mode={mode}
        setMode={setMode}
        filters={filters}
        setFilters={setFilters}
        customList={customList}
        setCustomList={setCustomList}
      />

      {/* Interactive Roulette Wheel */}
      <div className="flex flex-col items-center justify-center my-8">
        {loadingCandidates ? (
          <div className="p-12 text-center text-xs text-[#A7A9B4] animate-pulse">
            Carregando catálogo de candidatos para a roleta...
          </div>
        ) : (
          <RouletteWheel
            candidates={candidates.slice(0, 12)}
            soundEnabled={soundEnabled}
            onSpinEnd={handleSpinEnd}
          />
        )}
      </div>

      {/* Result Modal */}
      {winnerItem && (
        <RouletteResultModal
          item={winnerItem}
          isSaved={savedIds.has(winnerItem.id)}
          isWatched={StorageService.isSaved(winnerItem.id, winnerItem.media_type, 'watched')}
          onClose={() => setWinnerItem(null)}
          onSpinAgain={() => setWinnerItem(null)}
          onSelectMedia={onSelectMedia}
          onToggleWatchlist={onToggleWatchlist}
        />
      )}
    </div>
  );
};
