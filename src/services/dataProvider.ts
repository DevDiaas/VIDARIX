import { UserProfile, UserWatchlistItem, RouletteSpinHistory, MediaItem, WatchlistStatus } from '../types';
import { StorageService, DEFAULT_USER_PROFILE } from './storageService';
import { IndexedDbService } from './indexedDbService';
import { SupabaseService } from './supabaseService';
import { isSupabaseConfigured } from '../lib/supabase';

export interface VidarixDataProvider {
  getProfile: () => Promise<UserProfile>;
  updateProfile: (data: Partial<UserProfile>) => Promise<UserProfile>;
  saveAvatar: (file: Blob | File) => Promise<string>;
  removeAvatar: () => Promise<void>;
  getWatchlist: () => Promise<UserWatchlistItem[]>;
  addToWatchlist: (item: MediaItem, status?: WatchlistStatus, userRating?: number, userNote?: string) => Promise<UserWatchlistItem[]>;
  removeFromWatchlist: (mediaId: number, mediaType: string) => Promise<UserWatchlistItem[]>;
  getRouletteHistory: () => Promise<RouletteSpinHistory[]>;
  addRouletteHistory: (historyItem: Omit<RouletteSpinHistory, 'id' | 'date'>) => Promise<RouletteSpinHistory[]>;
  clearLocalData: () => Promise<void>;
}

/**
 * Local Data Provider (IndexedDB + LocalStorage sync)
 */
export const LocalDataProvider: VidarixDataProvider = {
  async getProfile(): Promise<UserProfile> {
    const localProfile = StorageService.getProfile();
    const dbProfile = await IndexedDbService.getProfile();
    const avatarFromDb = await IndexedDbService.getAvatar();

    const mergedProfile: UserProfile = {
      ...DEFAULT_USER_PROFILE,
      ...localProfile,
      ...(dbProfile || {}),
      photoURL: avatarFromDb || dbProfile?.photoURL || localProfile.photoURL || null,
      avatar: avatarFromDb || dbProfile?.avatar || localProfile.avatar || '',
      isAuthenticated: false, // Always guest in local mode
    };

    return mergedProfile;
  },

  async updateProfile(data: Partial<UserProfile>): Promise<UserProfile> {
    const current = await this.getProfile();
    const updated: UserProfile = { ...current, ...data };

    StorageService.saveProfile(updated);
    await IndexedDbService.saveProfile(updated);

    return updated;
  },

  async saveAvatar(file: Blob | File): Promise<string> {
    return new Promise((resolve, reject) => {
      if (file.size > 5 * 1024 * 1024) {
        reject(new Error('A foto de perfil deve ter no máximo 5 MB.'));
        return;
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        if (!dataUrl) {
          reject(new Error('Erro ao ler arquivo da imagem.'));
          return;
        }

        // Save image to IndexedDB
        await IndexedDbService.saveAvatar(dataUrl);

        // Update profile reference
        await this.updateProfile({ photoURL: dataUrl, avatar: dataUrl });
        resolve(dataUrl);
      };
      reader.onerror = () => reject(new Error('Falha ao processar arquivo.'));
      reader.readAsDataURL(file);
    });
  },

  async removeAvatar(): Promise<void> {
    await IndexedDbService.removeAvatar();
    await this.updateProfile({ photoURL: null, avatar: '' });
  },

  async getWatchlist(): Promise<UserWatchlistItem[]> {
    const dbItems = await IndexedDbService.getWatchlist();
    if (dbItems && dbItems.length > 0) {
      return dbItems;
    }
    const localItems = StorageService.getWatchlist();
    if (localItems && localItems.length > 0) {
      await IndexedDbService.saveWatchlist(localItems);
    }
    return localItems;
  },

  async addToWatchlist(item: MediaItem, status: WatchlistStatus = 'watchlist', userRating?: number, userNote?: string): Promise<UserWatchlistItem[]> {
    const updatedList = StorageService.addToWatchlist(item, status, userRating, userNote);
    await IndexedDbService.saveWatchlist(updatedList);
    return updatedList;
  },

  async removeFromWatchlist(mediaId: number, mediaType: string): Promise<UserWatchlistItem[]> {
    const updatedList = StorageService.removeFromWatchlist(mediaId, mediaType);
    await IndexedDbService.saveWatchlist(updatedList);
    return updatedList;
  },

  async getRouletteHistory(): Promise<RouletteSpinHistory[]> {
    const dbHistory = await IndexedDbService.getRouletteHistory();
    if (dbHistory && dbHistory.length > 0) {
      return dbHistory;
    }
    const localHistory = StorageService.getRouletteHistory();
    if (localHistory && localHistory.length > 0) {
      await IndexedDbService.saveRouletteHistory(localHistory);
    }
    return localHistory;
  },

  async addRouletteHistory(historyItem: Omit<RouletteSpinHistory, 'id' | 'date'>): Promise<RouletteSpinHistory[]> {
    const updatedHistory = StorageService.addSpinToHistory(historyItem);
    await IndexedDbService.saveRouletteHistory(updatedHistory);
    return updatedHistory;
  },

  async clearLocalData(): Promise<void> {
    StorageService.saveProfile(DEFAULT_USER_PROFILE);
    StorageService.clearHistory();
    localStorage.removeItem('vidarix_user_watchlist');
    await IndexedDbService.removeAvatar();
    await IndexedDbService.saveWatchlist([]);
    await IndexedDbService.saveRouletteHistory([]);
    await IndexedDbService.saveProfile(DEFAULT_USER_PROFILE);
  },
};

/**
 * Supabase Data Provider (Cloud sync)
 */
export const SupabaseDataProvider: VidarixDataProvider = {
  async getProfile(): Promise<UserProfile> {
    const user = (await import('../lib/supabase')).supabase?.auth.getUser();
    const userId = (await user)?.data.user?.id;
    if (!userId) return LocalDataProvider.getProfile();

    const cloudProfile = await SupabaseService.fetchProfile(userId);
    return cloudProfile || LocalDataProvider.getProfile();
  },

  async updateProfile(data: Partial<UserProfile>): Promise<UserProfile> {
    const user = (await import('../lib/supabase')).supabase?.auth.getUser();
    const userId = (await user)?.data.user?.id;
    if (userId) {
      await SupabaseService.saveProfile(userId, data);
    }
    return LocalDataProvider.updateProfile(data);
  },

  async saveAvatar(file: Blob | File): Promise<string> {
    const user = (await import('../lib/supabase')).supabase?.auth.getUser();
    const userId = (await user)?.data.user?.id;
    if (userId && isSupabaseConfigured) {
      const { avatarUrl } = await SupabaseService.uploadAvatar(userId, file);
      await LocalDataProvider.updateProfile({ photoURL: avatarUrl, avatar: avatarUrl });
      return avatarUrl;
    }
    return LocalDataProvider.saveAvatar(file);
  },

  async removeAvatar(): Promise<void> {
    const user = (await import('../lib/supabase')).supabase?.auth.getUser();
    const userId = (await user)?.data.user?.id;
    if (userId && isSupabaseConfigured) {
      await SupabaseService.removeAvatar(userId);
    }
    await LocalDataProvider.removeAvatar();
  },

  async getWatchlist(): Promise<UserWatchlistItem[]> {
    const user = (await import('../lib/supabase')).supabase?.auth.getUser();
    const userId = (await user)?.data.user?.id;
    if (userId && isSupabaseConfigured) {
      const items = await SupabaseService.fetchWatchlist(userId);
      if (items && items.length > 0) return items;
    }
    return LocalDataProvider.getWatchlist();
  },

  async addToWatchlist(item: MediaItem, status: WatchlistStatus = 'watchlist', userRating?: number, userNote?: string): Promise<UserWatchlistItem[]> {
    const user = (await import('../lib/supabase')).supabase?.auth.getUser();
    const userId = (await user)?.data.user?.id;
    if (userId && isSupabaseConfigured) {
      await SupabaseService.saveWatchlistItem(userId, item, status, userRating, userNote);
    }
    return LocalDataProvider.addToWatchlist(item, status, userRating, userNote);
  },

  async removeFromWatchlist(mediaId: number, mediaType: string): Promise<UserWatchlistItem[]> {
    const user = (await import('../lib/supabase')).supabase?.auth.getUser();
    const userId = (await user)?.data.user?.id;
    if (userId && isSupabaseConfigured) {
      await SupabaseService.removeWatchlistItem(userId, mediaId, mediaType);
    }
    return LocalDataProvider.removeFromWatchlist(mediaId, mediaType);
  },

  async getRouletteHistory(): Promise<RouletteSpinHistory[]> {
    const user = (await import('../lib/supabase')).supabase?.auth.getUser();
    const userId = (await user)?.data.user?.id;
    if (userId && isSupabaseConfigured) {
      const history = await SupabaseService.fetchRouletteHistory(userId);
      if (history && history.length > 0) return history;
    }
    return LocalDataProvider.getRouletteHistory();
  },

  async addRouletteHistory(historyItem: Omit<RouletteSpinHistory, 'id' | 'date'>): Promise<RouletteSpinHistory[]> {
    const fullHistoryItem: RouletteSpinHistory = {
      ...historyItem,
      id: `spin_${Date.now()}`,
      date: new Date().toISOString(),
    };
    const user = (await import('../lib/supabase')).supabase?.auth.getUser();
    const userId = (await user)?.data.user?.id;
    if (userId && isSupabaseConfigured) {
      await SupabaseService.addRouletteHistory(userId, fullHistoryItem);
    }
    return LocalDataProvider.addRouletteHistory(historyItem);
  },

  async clearLocalData(): Promise<void> {
    await LocalDataProvider.clearLocalData();
  },
};

/**
 * Choose Active Data Provider
 */
export const dataProvider: VidarixDataProvider = isSupabaseConfigured
  ? SupabaseDataProvider
  : LocalDataProvider;

/**
 * Migration helper to migrate local guest data to Supabase when user signs in
 */
export async function migrateLocalDataToSupabase(userId: string): Promise<void> {
  if (!isSupabaseConfigured || !userId) return;

  try {
    // 1. Local Profile
    const localProfile = await LocalDataProvider.getProfile();
    await SupabaseService.saveProfile(userId, localProfile);

    // 2. Watchlist & Favorites
    const localWatchlist = await LocalDataProvider.getWatchlist();
    for (const item of localWatchlist) {
      if (item.item) {
        await SupabaseService.saveWatchlistItem(userId, item.item, item.status, item.userRating, item.userNote);
      }
    }

    // 3. Roulette History
    const localHistory = await LocalDataProvider.getRouletteHistory();
    for (const h of localHistory) {
      await SupabaseService.addRouletteHistory(userId, h);
    }
  } catch (err) {
    console.error('Erro na migração de dados locais para Supabase:', err);
  }
}
