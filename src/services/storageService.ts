import { UserProfile, UserWatchlistItem, RouletteSpinHistory, MediaItem, WatchlistStatus } from '../types';

const PROFILE_KEY = 'vidarix_user_profile';
const WATCHLIST_KEY = 'vidarix_user_watchlist';
const HISTORY_KEY = 'vidarix_roulette_history';

export const DEFAULT_USER_PROFILE: UserProfile = {
  id: 'guest_user',
  name: 'Cinéfilo VIDARIX',
  fullName: 'Cinéfilo VIDARIX',
  displayName: 'Cinéfilo VIDARIX',
  username: 'cinefilo_vidarix',
  email: '',
  bio: 'Apaixonado por cinema, séries e descobertas surpreendentes na roleta VIDARIX.',
  avatar: '',
  photoURL: null,
  photoThumbURL: null,
  country: 'Brasil',
  language: 'pt-BR',
  birthDate: null,
  streamingProviders: [8, 119, 337, 1899], // Default Netflix, Prime, Disney+, Max
  favoriteGenres: [28, 878, 18, 35],
  avoidGenres: [],
  excludedGenres: [],
  mediaPreference: 'all',
  minimumRating: 6.5,
  maximumRuntime: null,
  discoveryPreference: 'balanced',
  soundEffects: true,
  animations: true,
  reducedMotion: false,
  onboardingCompleted: false,
  isAuthenticated: false,
  roulettePreferences: {
    onlyMyProviders: true,
    excludeWatched: true,
    avoidRecentResults: true,
    allowSurprises: true,
    soundEnabled: true,
    confettiEnabled: true,
    animationsEnabled: true
  },
  privacy: {
    publicProfile: true,
    showLists: true,
    showRatings: true,
    showStatistics: true
  }
};

export class StorageService {
  public static getProfile(): UserProfile {
    try {
      const data = localStorage.getItem(PROFILE_KEY);
      if (data) {
        return { ...DEFAULT_USER_PROFILE, ...JSON.parse(data) };
      }
    } catch {
      // localStorage read fallback
    }
    return DEFAULT_USER_PROFILE;
  }

  public static saveProfile(profile: Partial<UserProfile>): UserProfile {
    const current = this.getProfile();
    const updated = { ...current, ...profile };
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
    } catch {
      // localStorage write fallback
    }
    return updated;
  }

  public static getWatchlist(): UserWatchlistItem[] {
    try {
      const data = localStorage.getItem(WATCHLIST_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // localStorage read fallback
    }
    return [];
  }

  public static addToWatchlist(item: MediaItem, status: WatchlistStatus = 'watchlist', userRating?: number, userNote?: string): UserWatchlistItem[] {
    const watchlist = this.getWatchlist();
    const existingIndex = watchlist.findIndex((w) => w.mediaId === item.id && w.mediaType === item.media_type);

    if (existingIndex >= 0) {
      watchlist[existingIndex] = {
        ...watchlist[existingIndex],
        status,
        userRating: userRating !== undefined ? userRating : watchlist[existingIndex].userRating,
        userNote: userNote !== undefined ? userNote : watchlist[existingIndex].userNote
      };
    } else {
      watchlist.unshift({
        id: `${item.media_type}_${item.id}_${Date.now()}`,
        mediaId: item.id,
        mediaType: item.media_type,
        item,
        status,
        addedAt: new Date().toISOString(),
        userRating,
        userNote
      });
    }

    try {
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
    } catch {
      // Storage fallback
    }
    return watchlist;
  }

  public static removeFromWatchlist(mediaId: number, mediaType: string): UserWatchlistItem[] {
    const watchlist = this.getWatchlist().filter(
      (w) => !(w.mediaId === mediaId && w.mediaType === mediaType)
    );
    try {
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
    } catch {
      // Storage fallback
    }
    return watchlist;
  }

  public static isSaved(mediaId: number, mediaType: string, status?: WatchlistStatus): boolean {
    const watchlist = this.getWatchlist();
    return watchlist.some(
      (w) => w.mediaId === mediaId && w.mediaType === mediaType && (!status || w.status === status)
    );
  }

  public static getRouletteHistory(): RouletteSpinHistory[] {
    try {
      const data = localStorage.getItem(HISTORY_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // storage fallback
    }
    return [];
  }

  public static addSpinToHistory(historyItem: Omit<RouletteSpinHistory, 'id' | 'date'>): RouletteSpinHistory[] {
    const history = this.getRouletteHistory();
    const newEntry: RouletteSpinHistory = {
      ...historyItem,
      id: `spin_${Date.now()}`,
      date: new Date().toISOString()
    };
    history.unshift(newEntry);
    // Keep max 50 items
    const trimmed = history.slice(0, 50);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
    } catch {
      // storage fallback
    }
    return trimmed;
  }

  public static clearHistory(): void {
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {
      // storage fallback
    }
  }
}
