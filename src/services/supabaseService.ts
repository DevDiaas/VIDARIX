import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { UserProfile, UserWatchlistItem, RouletteSpinHistory, MediaItem, WatchlistStatus, RouletteMode } from '../types';
import { DEFAULT_USER_PROFILE, StorageService } from './storageService';

export class SupabaseService {
  /**
   * Check if username is available (case-insensitive)
   */
  public static async checkUsernameAvailability(username: string, currentUserId?: string): Promise<{ available: boolean; error?: string }> {
    if (!isSupabaseConfigured) return { available: true };
    if (!username || username.trim().length < 3) return { available: false, error: 'Username muito curto' };

    const cleanUsername = username.trim().toLowerCase();

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username')
        .ilike('username', cleanUsername);

      if (error) {
        console.error('Error checking username availability:', error);
        return { available: true }; // soft fallback
      }

      if (data && data.length > 0) {
        const matches = data.filter((p) => p.id !== currentUserId);
        if (matches.length > 0) {
          return { available: false, error: 'Este nome de usuário já está em uso.' };
        }
      }

      return { available: true };
    } catch {
      return { available: true };
    }
  }

  /**
   * Fetch complete profile from Supabase
   */
  public static async fetchProfile(userId: string): Promise<UserProfile | null> {
    if (!isSupabaseConfigured || !userId) return null;

    try {
      // 1. Fetch main profile
      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileErr) {
        console.error('Supabase fetch profile error:', profileErr);
        return null;
      }

      // 2. Fetch streaming providers
      const { data: providersData } = await supabase
        .from('user_streaming_providers')
        .select('provider_id')
        .eq('user_id', userId);

      // 3. Fetch favorite genres
      const { data: favGenresData } = await supabase
        .from('user_favorite_genres')
        .select('genre_id')
        .eq('user_id', userId);

      // 4. Fetch excluded genres
      const { data: avoidGenresData } = await supabase
        .from('user_excluded_genres')
        .select('genre_id')
        .eq('user_id', userId);

      // 5. Fetch preferences
      const { data: prefData } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      const streamingProviders = providersData ? providersData.map((p) => p.provider_id) : [8, 119, 337, 1899];
      const favoriteGenres = favGenresData ? favGenresData.map((g) => g.genre_id) : [28, 878, 18, 35];
      const avoidGenres = avoidGenresData ? avoidGenresData.map((g) => g.genre_id) : [];

      const mergedProfile: UserProfile = {
        ...DEFAULT_USER_PROFILE,
        id: userId,
        fullName: profileData.full_name || profileData.display_name || 'Cinéfilo VIDARIX',
        displayName: profileData.display_name || 'Cinéfilo VIDARIX',
        name: profileData.display_name || profileData.full_name || 'Cinéfilo VIDARIX',
        username: profileData.username || 'cinefilo',
        bio: profileData.bio || '',
        avatar: profileData.avatar_url || '',
        photoURL: profileData.avatar_url || null,
        country: profileData.country || 'Brasil',
        language: profileData.language || 'pt-BR',
        birthDate: profileData.birth_date || null,
        mediaPreference: (profileData.media_preference as any) || 'all',
        minimumRating: profileData.minimum_rating ? parseFloat(profileData.minimum_rating) : 6.5,
        maximumRuntime: profileData.maximum_runtime || null,
        streamingProviders,
        favoriteGenres,
        avoidGenres,
        discoveryPreference: prefData?.allow_surprises === false ? 'popular' : 'balanced',
        onboardingCompleted: true,
        isAuthenticated: true,
        privacy: {
          publicProfile: profileData.public_profile !== false,
          showLists: true,
          showRatings: true,
          showStatistics: true,
        },
        roulettePreferences: {
          onlyMyProviders: prefData?.only_my_providers !== false,
          excludeWatched: prefData?.exclude_watched !== false,
          avoidRecentResults: prefData?.avoid_recent_results !== false,
          allowSurprises: prefData?.allow_surprises !== false,
          soundEnabled: prefData?.sound_enabled !== false,
          confettiEnabled: prefData?.confetti_enabled !== false,
          animationsEnabled: prefData?.animations_enabled !== false,
        },
        soundEffects: prefData?.sound_enabled !== false,
        animations: prefData?.animations_enabled !== false,
      };

      return mergedProfile;
    } catch (err) {
      console.error('Failed to load profile from Supabase:', err);
      return null;
    }
  }

  /**
   * Save / update complete profile to Supabase
   */
  public static async saveProfile(userId: string, updated: Partial<UserProfile>): Promise<void> {
    if (!isSupabaseConfigured || !userId) return;

    try {
      // 1. Update profiles table
      const profileUpdates: Record<string, any> = {};
      if (updated.fullName !== undefined) profileUpdates.full_name = updated.fullName;
      if (updated.displayName !== undefined) profileUpdates.display_name = updated.displayName;
      if (updated.username !== undefined) profileUpdates.username = updated.username.toLowerCase();
      if (updated.bio !== undefined) profileUpdates.bio = updated.bio;
      if (updated.photoURL !== undefined || updated.avatar !== undefined) {
        profileUpdates.avatar_url = updated.photoURL || updated.avatar || null;
      }
      if (updated.country !== undefined) profileUpdates.country = updated.country;
      if (updated.language !== undefined) profileUpdates.language = updated.language;
      if (updated.birthDate !== undefined) profileUpdates.birth_date = updated.birthDate || null;
      if (updated.mediaPreference !== undefined) profileUpdates.media_preference = updated.mediaPreference;
      if (updated.minimumRating !== undefined) profileUpdates.minimum_rating = updated.minimumRating;
      if (updated.maximumRuntime !== undefined) profileUpdates.maximum_runtime = updated.maximumRuntime;
      if (updated.privacy?.publicProfile !== undefined) profileUpdates.public_profile = updated.privacy.publicProfile;

      if (Object.keys(profileUpdates).length > 0) {
        const { error: profErr } = await supabase
          .from('profiles')
          .update(profileUpdates)
          .eq('id', userId);

        if (profErr) {
          console.error('Error updating profiles table:', profErr);
          throw profErr;
        }
      }

      // 2. Update streaming providers
      if (updated.streamingProviders) {
        await supabase.from('user_streaming_providers').delete().eq('user_id', userId);

        if (updated.streamingProviders.length > 0) {
          const providerRows = updated.streamingProviders.map((pId) => ({
            user_id: userId,
            provider_id: pId,
            provider_name: `Provider_${pId}`,
          }));
          await supabase.from('user_streaming_providers').insert(providerRows);
        }
      }

      // 3. Update favorite genres
      if (updated.favoriteGenres) {
        await supabase.from('user_favorite_genres').delete().eq('user_id', userId);

        if (updated.favoriteGenres.length > 0) {
          const genreRows = updated.favoriteGenres.map((gId) => ({
            user_id: userId,
            genre_id: gId,
            genre_name: `Genre_${gId}`,
          }));
          await supabase.from('user_favorite_genres').insert(genreRows);
        }
      }

      // 4. Update avoided / excluded genres
      if (updated.avoidGenres) {
        await supabase.from('user_excluded_genres').delete().eq('user_id', userId);

        if (updated.avoidGenres.length > 0) {
          const avoidRows = updated.avoidGenres.map((gId) => ({
            user_id: userId,
            genre_id: gId,
            genre_name: `Genre_${gId}`,
          }));
          await supabase.from('user_excluded_genres').insert(avoidRows);
        }
      }

      // 5. Update preferences
      if (updated.roulettePreferences || updated.soundEffects !== undefined || updated.animations !== undefined || updated.discoveryPreference !== undefined) {
        const prefUpdates: Record<string, any> = {
          updated_at: new Date().toISOString(),
        };
        if (updated.roulettePreferences?.onlyMyProviders !== undefined) prefUpdates.only_my_providers = updated.roulettePreferences.onlyMyProviders;
        if (updated.roulettePreferences?.excludeWatched !== undefined) prefUpdates.exclude_watched = updated.roulettePreferences.excludeWatched;
        if (updated.roulettePreferences?.avoidRecentResults !== undefined) prefUpdates.avoid_recent_results = updated.roulettePreferences.avoidRecentResults;
        if (updated.roulettePreferences?.allowSurprises !== undefined) prefUpdates.allow_surprises = updated.roulettePreferences.allowSurprises;
        if (updated.soundEffects !== undefined) prefUpdates.sound_enabled = updated.soundEffects;
        if (updated.animations !== undefined) prefUpdates.animations_enabled = updated.animations;
        if (updated.discoveryPreference !== undefined) prefUpdates.allow_surprises = updated.discoveryPreference !== 'popular';

        await supabase.from('user_preferences').upsert({
          user_id: userId,
          ...prefUpdates,
        });
      }
    } catch (err) {
      console.error('Error saving profile to Supabase:', err);
      throw err;
    }
  }

  /**
   * Upload Avatar to Supabase Storage ('avatars' bucket)
   */
  public static async uploadAvatar(userId: string, file: Blob | File): Promise<{ avatarUrl: string; avatarPath: string }> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase não está configurado.');
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error('A imagem deve ter no máximo 5 MB.');
    }

    const filePath = `${userId}/avatar.webp`;

    // 1. Upload to storage bucket
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        contentType: 'image/webp',
        upsert: true,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error(`Erro ao enviar foto: ${uploadError.message}`);
    }

    // 2. Get Public URL with cache buster
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
    const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`;

    // 3. Update profiles table with avatar_url & avatar_path
    await supabase
      .from('profiles')
      .update({
        avatar_url: publicUrl,
        avatar_path: filePath,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    return { avatarUrl: publicUrl, avatarPath: filePath };
  }

  /**
   * Remove Avatar from Supabase Storage & Profile
   */
  public static async removeAvatar(userId: string): Promise<void> {
    if (!isSupabaseConfigured) return;

    const filePath = `${userId}/avatar.webp`;

    try {
      await supabase.storage.from('avatars').remove([filePath]);
    } catch (err) {
      console.warn('File removal error (may not exist):', err);
    }

    await supabase
      .from('profiles')
      .update({
        avatar_url: null,
        avatar_path: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
  }

  /**
   * Helper to construct MediaItem
   */
  private static makeMediaItem(row: { tmdb_id: number; media_type: string; title: string; poster_path: string | null }): MediaItem {
    return {
      id: row.tmdb_id,
      media_type: row.media_type as any,
      title: row.title,
      name: row.title,
      poster_path: row.poster_path,
      backdrop_path: null,
      overview: '',
      vote_average: 0,
      genre_ids: [],
    };
  }

  /**
   * Fetch Watchlist, Favorites, and Watched from Supabase
   */
  public static async fetchWatchlist(userId: string): Promise<UserWatchlistItem[]> {
    if (!isSupabaseConfigured || !userId) return [];

    try {
      const [watchlistRes, watchedRes, favoritesRes, ratingsRes] = await Promise.all([
        supabase.from('watchlist').select('*').eq('user_id', userId),
        supabase.from('watched_titles').select('*').eq('user_id', userId),
        supabase.from('favorites').select('*').eq('user_id', userId),
        supabase.from('user_ratings').select('*').eq('user_id', userId),
      ]);

      const items: UserWatchlistItem[] = [];

      // Map Ratings lookup
      const ratingsMap = new Map<string, { rating: number; review?: string }>();
      if (ratingsRes.data) {
        for (const r of ratingsRes.data) {
          ratingsMap.set(`${r.media_type}_${r.tmdb_id}`, { rating: parseFloat(r.rating), review: r.review });
        }
      }

      if (watchlistRes.data) {
        for (const row of watchlistRes.data) {
          const key = `${row.media_type}_${row.tmdb_id}`;
          const r = ratingsMap.get(key);
          items.push({
            id: `wl_${row.id}`,
            mediaId: row.tmdb_id,
            mediaType: row.media_type as any,
            item: this.makeMediaItem(row),
            status: 'watchlist',
            addedAt: row.created_at,
            userRating: r?.rating,
            userNote: r?.review,
          });
        }
      }

      if (watchedRes.data) {
        for (const row of watchedRes.data) {
          const key = `${row.media_type}_${row.tmdb_id}`;
          const r = ratingsMap.get(key);
          items.push({
            id: `watched_${row.id}`,
            mediaId: row.tmdb_id,
            mediaType: row.media_type as any,
            item: this.makeMediaItem(row),
            status: 'watched',
            addedAt: row.watched_at,
            userRating: r?.rating,
            userNote: r?.review,
          });
        }
      }

      if (favoritesRes.data) {
        for (const row of favoritesRes.data) {
          const key = `${row.media_type}_${row.tmdb_id}`;
          const r = ratingsMap.get(key);
          items.push({
            id: `fav_${row.id}`,
            mediaId: row.tmdb_id,
            mediaType: row.media_type as any,
            item: this.makeMediaItem(row),
            status: 'favorites',
            addedAt: row.created_at,
            userRating: r?.rating,
            userNote: r?.review,
          });
        }
      }

      return items;
    } catch (err) {
      console.error('Error fetching watchlist from Supabase:', err);
      return [];
    }
  }

  /**
   * Save item to Watchlist, Watched, or Favorites in Supabase
   */
  public static async saveWatchlistItem(userId: string, item: MediaItem, status: WatchlistStatus, userRating?: number, userNote?: string): Promise<void> {
    if (!isSupabaseConfigured || !userId) return;

    try {
      const mediaTitle = item.title || item.name || 'Título sem nome';
      const poster = item.poster_path || null;

      // First clean from all status tables for this item
      await Promise.all([
        supabase.from('watchlist').delete().eq('user_id', userId).eq('tmdb_id', item.id).eq('media_type', item.media_type),
        supabase.from('watched_titles').delete().eq('user_id', userId).eq('tmdb_id', item.id).eq('media_type', item.media_type),
        supabase.from('favorites').delete().eq('user_id', userId).eq('tmdb_id', item.id).eq('media_type', item.media_type),
      ]);

      // Insert into appropriate table
      if (status === 'watchlist') {
        await supabase.from('watchlist').insert({
          user_id: userId,
          tmdb_id: item.id,
          media_type: item.media_type,
          title: mediaTitle,
          poster_path: poster,
        });
      } else if (status === 'watched') {
        await supabase.from('watched_titles').insert({
          user_id: userId,
          tmdb_id: item.id,
          media_type: item.media_type,
          title: mediaTitle,
          poster_path: poster,
        });
      } else if (status === 'favorites') {
        await supabase.from('favorites').insert({
          user_id: userId,
          tmdb_id: item.id,
          media_type: item.media_type,
          title: mediaTitle,
          poster_path: poster,
        });
      }

      // Save user rating if provided
      if (userRating !== undefined && userRating > 0) {
        await supabase.from('user_ratings').upsert({
          user_id: userId,
          tmdb_id: item.id,
          media_type: item.media_type,
          rating: userRating,
          review: userNote || null,
          updated_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('Error saving watchlist item to Supabase:', err);
    }
  }

  /**
   * Remove item from Watchlist/Watched/Favorites in Supabase
   */
  public static async removeWatchlistItem(userId: string, mediaId: number, mediaType: string): Promise<void> {
    if (!isSupabaseConfigured || !userId) return;

    try {
      await Promise.all([
        supabase.from('watchlist').delete().eq('user_id', userId).eq('tmdb_id', mediaId).eq('media_type', mediaType),
        supabase.from('watched_titles').delete().eq('user_id', userId).eq('tmdb_id', mediaId).eq('media_type', mediaType),
        supabase.from('favorites').delete().eq('user_id', userId).eq('tmdb_id', mediaId).eq('media_type', mediaType),
      ]);
    } catch (err) {
      console.error('Error removing item from Supabase:', err);
    }
  }

  /**
   * Save spin result to Roulette History
   */
  public static async addRouletteHistory(userId: string, historyItem: RouletteSpinHistory): Promise<void> {
    if (!isSupabaseConfigured || !userId) return;

    try {
      const resultItem = historyItem.resultMedia;
      const mediaTitle = resultItem.title || resultItem.name || 'Título sem nome';
      await supabase.from('roulette_history').insert({
        user_id: userId,
        tmdb_id: resultItem.id,
        media_type: resultItem.media_type,
        title: mediaTitle,
        poster_path: resultItem.poster_path || null,
        selection_mode: historyItem.mode || 'random',
        filters: {},
        spun_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Error adding roulette history to Supabase:', err);
    }
  }

  /**
   * Fetch Roulette History from Supabase
   */
  public static async fetchRouletteHistory(userId: string): Promise<RouletteSpinHistory[]> {
    if (!isSupabaseConfigured || !userId) return [];

    try {
      const { data, error } = await supabase
        .from('roulette_history')
        .select('*')
        .eq('user_id', userId)
        .order('spun_at', { ascending: false })
        .limit(50);

      if (error || !data) return [];

      return data.map((row) => ({
        id: `rh_${row.id}`,
        date: row.spun_at,
        resultMedia: this.makeMediaItem(row),
        mode: (row.selection_mode as RouletteMode) || 'category',
      }));
    } catch (err) {
      console.error('Error fetching roulette history:', err);
      return [];
    }
  }

  /**
   * Migrate Guest Local Data to Supabase User Account
   */
  public static async migrateGuestDataToUser(userId: string): Promise<void> {
    if (!isSupabaseConfigured || !userId) return;

    try {
      // 1. Migrate watchlist
      const localWatchlist = StorageService.getWatchlist();
      if (localWatchlist && localWatchlist.length > 0) {
        for (const item of localWatchlist) {
          if (item.item) {
            await this.saveWatchlistItem(userId, item.item, item.status, item.userRating, item.userNote);
          }
        }
      }

      // 2. Migrate roulette history
      const localHistory = StorageService.getRouletteHistory();
      if (localHistory && localHistory.length > 0) {
        for (const h of localHistory) {
          await this.addRouletteHistory(userId, h);
        }
      }
    } catch (err) {
      console.error('Failed to migrate guest data:', err);
    }
  }
}
