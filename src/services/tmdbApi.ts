import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MediaItem, MediaType, Genre } from '../types';
import { MOCK_MEDIA_ITEMS } from '../data/mockData';
import { TMDB_GENRES } from '../data/genres';
import {
  StreamingProvider,
  TARGET_PROVIDERS,
  normalizeProviderName,
  getTMDBLogoUrl,
  streamingProviders
} from '../data/streamingProviders';

const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/';

export interface RawWatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
  display_priority?: number;
}

export async function fetchWatchProvidersBR(): Promise<StreamingProvider[]> {
  try {
    const [movieRes, tvRes] = await Promise.all([
      fetchFromProxy('/watch/providers/movie', { watch_region: 'BR', language: 'pt-BR' }),
      fetchFromProxy('/watch/providers/tv', { watch_region: 'BR', language: 'pt-BR' })
    ]);

    const combinedMap = new Map<number, RawWatchProvider>();

    if (movieRes && Array.isArray(movieRes.results)) {
      movieRes.results.forEach((p: RawWatchProvider) => {
        if (p && p.provider_id) combinedMap.set(p.provider_id, p);
      });
    }

    if (tvRes && Array.isArray(tvRes.results)) {
      tvRes.results.forEach((p: RawWatchProvider) => {
        if (p && p.provider_id && !combinedMap.has(p.provider_id)) {
          combinedMap.set(p.provider_id, p);
        }
      });
    }

    const rawList = Array.from(combinedMap.values());

    if (rawList.length > 0) {
      TARGET_PROVIDERS.forEach((cfg) => {
        const normalizedAliases = cfg.aliases.map(normalizeProviderName);

        // Find match in raw TMDB list by alias
        const matched = rawList.find((p) => {
          const normName = normalizeProviderName(p.provider_name);
          return normalizedAliases.some((alias) => normName === alias || normName.includes(alias));
        });

        const targetInArray = streamingProviders.find((sp) => sp.slug === cfg.slug);
        if (targetInArray && matched) {
          targetInArray.id = matched.provider_id;
          targetInArray.tmdbName = matched.provider_name;
          // Mantemos o logo local como padrão para evitar logos invisíveis ou inconsistentes.
          if (!targetInArray.logoPath && matched.logo_path) {
            targetInArray.logoPath = matched.logo_path;
            targetInArray.logoUrl = getTMDBLogoUrl(matched.logo_path);
          }
        }
      });
    }
  } catch (err) {
    console.error('Error fetching BR watch providers:', err);
  }

  return streamingProviders;
}

export interface PaginatedResult {
  items: MediaItem[];
  page: number;
  totalPages: number;
  totalResults: number;
}

export function getPosterUrl(path: string | null, size: string = 'w500'): string {
  if (!path) return 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=500&q=80';
  if (path.startsWith('http')) return path;
  return `${IMAGE_BASE_URL}${size}${path}`;
}

export function getBackdropUrl(path: string | null, size: string = 'w1280'): string {
  if (!path) return 'https://images.unsplash.com/photo-1518173946687-a4c8a383392e?auto=format&fit=crop&w=1280&q=80';
  if (path.startsWith('http')) return path;
  return `${IMAGE_BASE_URL}${size}${path}`;
}

let hasLoggedCatalogError = false;

async function fetchFromProxy(endpoint: string, params: Record<string, string> = {}) {
  if (!isSupabaseConfigured) {
    if (!hasLoggedCatalogError && import.meta.env.DEV) {
      console.warn(
        'Catálogo remoto indisponível: configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.',
      );
      hasLoggedCatalogError = true;
    }
    return null;
  }

  try {
    const { data, error } = await supabase.functions.invoke('tmdb-proxy', {
      body: {
        endpoint,
        params,
      },
    });

    if (error) {
      if (!hasLoggedCatalogError) {
        console.error('Falha ao consultar a Edge Function tmdb-proxy:', error.message);
        hasLoggedCatalogError = true;
      }
      return null;
    }

    if (!data || data.error) {
      if (!hasLoggedCatalogError && data?.error) {
        console.error('Erro retornado pelo backend do catálogo:', data.error);
        hasLoggedCatalogError = true;
      }
      return null;
    }

    hasLoggedCatalogError = false;
    return data;
  } catch (error) {
    if (!hasLoggedCatalogError) {
      console.error('Erro inesperado ao consultar o catálogo:', error);
      hasLoggedCatalogError = true;
    }
    return null;
  }
}

export async function fetchTrending(mediaType: MediaType | 'all' = 'all', page: number = 1): Promise<MediaItem[]> {
  const data = await fetchFromProxy(`/trending/${mediaType}/day`, { page: String(page) });
  if (data && data.results) {
    return parseTmdbList(data.results);
  }
  return MOCK_MEDIA_ITEMS;
}

export async function fetchPopular(mediaType: MediaType = 'movie', page: number = 1): Promise<MediaItem[]> {
  const data = await fetchFromProxy(`/${mediaType}/popular`, { page: String(page) });
  if (data && data.results) {
    return parseTmdbList(data.results, mediaType);
  }
  return MOCK_MEDIA_ITEMS.filter((item) => item.media_type === mediaType);
}

export async function fetchTopRated(mediaType: MediaType = 'movie', page: number = 1): Promise<MediaItem[]> {
  const data = await fetchFromProxy(`/${mediaType}/top_rated`, { page: String(page) });
  if (data && data.results) {
    return parseTmdbList(data.results, mediaType);
  }
  return MOCK_MEDIA_ITEMS.filter((item) => item.vote_average >= 8.0);
}

export async function fetchByGenre(genreId: number, mediaType: MediaType = 'movie', page: number = 1): Promise<MediaItem[]> {
  const data = await fetchFromProxy(`/discover/${mediaType}`, {
    with_genres: String(genreId),
    page: String(page),
    sort_by: 'popularity.desc'
  });
  if (data && data.results) {
    return parseTmdbList(data.results, mediaType);
  }
  return MOCK_MEDIA_ITEMS.filter((item) => item.genre_ids.includes(genreId));
}

export async function fetchByProvider(providerId: number, mediaType: MediaType = 'movie', page: number = 1): Promise<MediaItem[]> {
  const data = await fetchFromProxy(`/discover/${mediaType}`, {
    watch_region: 'BR',
    with_watch_providers: String(providerId),
    page: String(page),
    sort_by: 'popularity.desc'
  });
  if (data && data.results) {
    return parseTmdbList(data.results, mediaType);
  }
  return MOCK_MEDIA_ITEMS.filter((item) =>
    item.watch_providers?.flatrate?.some((p) => p.provider_id === providerId)
  );
}

export async function searchMedia(query: string, page: number = 1): Promise<MediaItem[]> {
  if (!query.trim()) return [];
  const data = await fetchFromProxy('/search/multi', { query, page: String(page) });
  if (data && data.results) {
    return parseTmdbList(data.results.filter((i: { media_type?: string }) => i.media_type === 'movie' || i.media_type === 'tv'));
  }
  const q = query.toLowerCase();
  return MOCK_MEDIA_ITEMS.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      (item.original_title && item.original_title.toLowerCase().includes(q)) ||
      (item.overview && item.overview.toLowerCase().includes(q))
  );
}

export interface DiscoverCatalogParams {
  page?: number;
  mediaType?: 'all' | 'movie' | 'tv';
  genreId?: number | null;
  providerId?: number | null;
  sortBy?: string;
  minRating?: number;
  year?: number | null;
  query?: string;
}

export async function discoverCatalog(params: DiscoverCatalogParams): Promise<PaginatedResult> {
  const page = params.page || 1;
  const mediaType = params.mediaType || 'all';

  if (params.query && params.query.trim()) {
    const data = await fetchFromProxy('/search/multi', {
      query: params.query.trim(),
      page: String(page)
    });
    if (data && data.results) {
      const items = parseTmdbList(
        data.results.filter((i: { media_type?: string }) => i.media_type === 'movie' || i.media_type === 'tv')
      );
      return {
        items,
        page: data.page || page,
        totalPages: data.total_pages || 1,
        totalResults: data.total_results || items.length
      };
    }
  }

  const endpoint = mediaType === 'all' ? '/discover/movie' : `/discover/${mediaType}`;
  const queryParams: Record<string, string> = {
    page: String(page),
    sort_by: params.sortBy || 'popularity.desc',
    'vote_count.gte': '20'
  };

  if (params.genreId) {
    queryParams.with_genres = String(params.genreId);
  }

  if (params.providerId) {
    queryParams.watch_region = 'BR';
    queryParams.with_watch_providers = String(params.providerId);
    queryParams.with_watch_monetization_types = 'flatrate|free|ads|rent|buy';
  }

  if (params.minRating && params.minRating > 0) {
    queryParams['vote_average.gte'] = String(params.minRating);
  }

  if (params.year) {
    if (mediaType === 'tv') {
      queryParams.first_air_date_year = String(params.year);
    } else {
      queryParams.primary_release_year = String(params.year);
    }
  }

  const data = await fetchFromProxy(endpoint, queryParams);

  if (data && data.results && data.results.length > 0) {
    const items = parseTmdbList(data.results, mediaType === 'all' ? 'movie' : mediaType);
    return {
      items,
      page: data.page || page,
      totalPages: data.total_pages || 500,
      totalResults: data.total_results || 10000
    };
  }

  // Generate fallback pagination from mock items
  let filtered = [...MOCK_MEDIA_ITEMS];
  if (mediaType !== 'all') {
    filtered = filtered.filter((m) => m.media_type === mediaType);
  }
  if (params.genreId) {
    filtered = filtered.filter((m) => m.genre_ids.includes(params.genreId!));
  }
  if (params.minRating) {
    filtered = filtered.filter((m) => m.vote_average >= params.minRating!);
  }

  const pageSize = 12;
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const startIndex = (page - 1) * pageSize;
  const paginatedItems = filtered.slice(startIndex, startIndex + pageSize);

  return {
    items: paginatedItems,
    page,
    totalPages,
    totalResults: filtered.length
  };
}

export async function fetchMediaDetails(id: number, type: MediaType): Promise<MediaItem> {
  const data = await fetchFromProxy(`/${type}/${id}`, {
    append_to_response: 'credits,videos,watch/providers,recommendations'
  });

  if (data && !data.fallback) {
    const brWatch = data['watch/providers']?.results?.BR || {};
    return {
      id: data.id,
      title: data.title || data.name,
      name: data.name,
      original_title: data.original_title || data.original_name,
      media_type: type,
      overview: data.overview,
      poster_path: data.poster_path,
      backdrop_path: data.backdrop_path,
      release_date: data.release_date || data.first_air_date,
      first_air_date: data.first_air_date,
      vote_average: Math.round((data.vote_average || 0) * 10) / 10,
      vote_count: data.vote_count,
      genre_ids: (data.genres || []).map((g: Genre) => g.id),
      genres: data.genres,
      runtime: data.runtime || (data.episode_run_time ? data.episode_run_time[0] : undefined),
      number_of_seasons: data.number_of_seasons,
      number_of_episodes: data.number_of_episodes,
      tagline: data.tagline,
      status: data.status,
      origin_country: data.origin_country,
      original_language: data.original_language,
      cast: (data.credits?.cast || []).slice(0, 10).map((c: { id: number; name: string; character: string; profile_path: string | null }) => ({
        id: c.id,
        name: c.name,
        character: c.character,
        profile_path: c.profile_path
      })),
      videos: (data.videos?.results || []).map((v: { id: string; key: string; name: string; site: string; type: string }) => ({
        id: v.id,
        key: v.key,
        name: v.name,
        site: v.site,
        type: v.type
      })),
      watch_providers: {
        flatrate: brWatch.flatrate || [],
        rent: brWatch.rent || [],
        buy: brWatch.buy || [],
        link: brWatch.link
      }
    };
  }

  // Fallback to local mock data
  const local = MOCK_MEDIA_ITEMS.find((m) => m.id === id);
  if (local) return local;
  return MOCK_MEDIA_ITEMS[0];
}

function parseTmdbList(rawList: Array<Record<string, unknown>>, defaultType?: MediaType): MediaItem[] {
  return rawList.map((item) => {
    const type = (item.media_type as MediaType) || defaultType || 'movie';
    return {
      id: item.id as number,
      title: (item.title || item.name) as string,
      name: item.name as string,
      original_title: (item.original_title || item.original_name) as string,
      media_type: type,
      overview: (item.overview as string) || '',
      poster_path: (item.poster_path as string) || null,
      backdrop_path: (item.backdrop_path as string) || null,
      release_date: (item.release_date || item.first_air_date) as string,
      vote_average: Math.round(((item.vote_average as number) || 0) * 10) / 10,
      vote_count: (item.vote_count as number) || 0,
      genre_ids: (item.genre_ids as number[]) || [],
      genres: ((item.genre_ids as number[]) || []).map((gid) => ({
        id: gid,
        name: TMDB_GENRES.find((g) => g.id === gid)?.name || 'Gênero'
      }))
    };
  });
}
