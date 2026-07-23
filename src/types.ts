export type MediaType = 'movie' | 'tv';

export interface Genre {
  id: number;
  name: string;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

export interface CrewMember {
  id: number;
  name: string;
  job: string;
}

export interface WatchProviderItem {
  provider_id: number;
  provider_name: string;
  logo_path: string;
  display_priority?: number;
}

export interface WatchProvidersByRegion {
  flatrate?: WatchProviderItem[];
  rent?: WatchProviderItem[];
  buy?: WatchProviderItem[];
  link?: string;
}

export interface MediaVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
}

export interface MediaItem {
  id: number;
  title: string; // Movie title or TV name
  name?: string; // TV show title
  original_title?: string;
  original_name?: string;
  media_type: MediaType;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  vote_count?: number;
  genre_ids: number[];
  genres?: Genre[];
  runtime?: number; // Minutes
  episode_run_time?: number[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  tagline?: string;
  status?: string;
  origin_country?: string[];
  original_language?: string;
  cast?: CastMember[];
  crew?: CrewMember[];
  videos?: MediaVideo[];
  watch_providers?: WatchProvidersByRegion;
  certification?: string; // Classificação indicativa (L, 12, 14, 16, 18)
}

export type RouletteMode = 'category' | 'streaming' | 'custom' | 'surprise';

export interface RouletteFilters {
  genres: number[];
  mediaType: 'all' | 'movie' | 'tv';
  startYear?: number;
  endYear?: number;
  minRating: number;
  maxRuntime?: number;
  onlyNewReleases: boolean;
  excludeWatched: boolean;
  platforms: number[];
}

export type WatchlistStatus = 'watchlist' | 'watched' | 'favorites';

export interface UserWatchlistItem {
  id: string;
  mediaId: number;
  mediaType: MediaType;
  item: MediaItem;
  status: WatchlistStatus;
  addedAt: string;
  userRating?: number; // 1 to 10
  userNote?: string;
}

export interface UserProfile {
  id: string;
  name: string; // Used as display name fallback
  fullName?: string;
  displayName?: string;
  username?: string;
  email?: string;
  avatar: string;
  photoURL?: string | null;
  photoThumbURL?: string | null;
  bio?: string;
  country?: string;
  language?: string;
  birthDate?: string | null;
  streamingProviders: number[];
  favoriteGenres: number[];
  avoidGenres: number[];
  excludedGenres?: number[];
  mediaPreference: 'all' | 'movie' | 'tv';
  minimumRating?: number;
  maximumRuntime?: number | null;
  discoveryPreference?: 'popular' | 'surprises' | 'balanced';
  soundEffects: boolean;
  animations: boolean;
  reducedMotion: boolean;
  onboardingCompleted: boolean;
  isAuthenticated?: boolean;
  roulettePreferences?: {
    onlyMyProviders: boolean;
    excludeWatched: boolean;
    avoidRecentResults: boolean;
    allowSurprises: boolean;
    soundEnabled: boolean;
    confettiEnabled: boolean;
    animationsEnabled: boolean;
  };
  privacy?: {
    publicProfile: boolean;
    showLists: boolean;
    showRatings: boolean;
    showStatistics: boolean;
  };
}

export interface RouletteSpinHistory {
  id: string;
  date: string;
  resultMedia: MediaItem;
  mode: RouletteMode;
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

// Social / Community domain
export type FriendshipStatus = 'pending' | 'accepted' | 'declined' | 'blocked';
export type RecommendationStatus = 'sent' | 'viewed' | 'saved' | 'watched' | 'dismissed';
export type NotificationCategory = 'friendship' | 'recommendation' | 'group' | 'comment' | 'message' | 'system';
export type GroupPrivacy = 'public' | 'private';
export type CommunityTab = 'feed' | 'friends' | 'groups' | 'messages' | 'recommendations';

export interface SocialUser {
  id: string;
  displayName: string;
  username: string;
  avatar?: string | null;
  bio?: string;
  favoriteGenres?: number[];
  watchedCount?: number;
  mutualFriends?: number;
  isOnline?: boolean;
  recentWatched?: MediaItem[];
}

export interface FriendRequest {
  id: string;
  fromUser: SocialUser;
  toUserId: string;
  status: FriendshipStatus;
  createdAt: string;
}

export interface Friendship {
  id: string;
  user: SocialUser;
  createdAt: string;
}

export interface SocialNotification {
  id: string;
  category: NotificationCategory;
  title: string;
  description: string;
  createdAt: string;
  read: boolean;
  actor?: SocialUser;
  targetPath?: string;
  media?: MediaItem;
}

export interface MediaRecommendation {
  id: string;
  sender: SocialUser;
  recipientId: string;
  recipientType: 'user' | 'group';
  recipientName: string;
  media: MediaItem;
  message?: string;
  status: RecommendationStatus;
  createdAt: string;
}

export interface CommunityMessage {
  id: string;
  author: SocialUser;
  text: string;
  createdAt: string;
  media?: MediaItem;
  spoiler?: boolean;
  likes?: string[];
}

export interface DirectConversation {
  id: string;
  participant: SocialUser;
  messages: CommunityMessage[];
  updatedAt: string;
}

export interface CommunityGroup {
  id: string;
  name: string;
  description: string;
  cover?: string | null;
  privacy: GroupPrivacy;
  ownerId: string;
  memberIds: string[];
  members: SocialUser[];
  messages: CommunityMessage[];
  watchlist: MediaItem[];
  createdAt: string;
  linkedMedia?: MediaItem;
}

export interface TitleDiscussionEntry extends CommunityMessage {
  mediaKey: string;
  kind: 'comment' | 'chat' | 'theory' | 'review';
  rating?: number;
  parentId?: string;
}

export interface SocialActivity {
  id: string;
  actor: SocialUser;
  action: 'watched' | 'saved' | 'rated' | 'recommended' | 'joined_group' | 'commented';
  description: string;
  createdAt: string;
  media?: MediaItem;
  group?: CommunityGroup;
}
