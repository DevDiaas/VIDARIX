import type { RealtimeChannel } from '@supabase/supabase-js';
import {
  CommunityGroup,
  CommunityMessage,
  DirectConversation,
  FriendRequest,
  Friendship,
  MediaItem,
  MediaRecommendation,
  SocialActivity,
  SocialNotification,
  SocialUser,
  TitleDiscussionEntry,
  UserProfile
} from '../types';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

type ProfileRow = {
  id: string;
  full_name?: string | null;
  display_name?: string | null;
  username?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  public_profile?: boolean | null;
};

type SocialCache = {
  users: SocialUser[];
  friends: Friendship[];
  requests: FriendRequest[];
  notifications: SocialNotification[];
  recommendations: MediaRecommendation[];
  groups: CommunityGroup[];
  conversations: DirectConversation[];
  activities: SocialActivity[];
};

const emptyCache = (): SocialCache => ({
  users: [],
  friends: [],
  requests: [],
  notifications: [],
  recommendations: [],
  groups: [],
  conversations: [],
  activities: []
});

const currentSocialUser = (profile: UserProfile): SocialUser => ({
  id: profile.id,
  displayName: profile.displayName || profile.fullName || profile.name || 'Cinéfilo VIDARIX',
  username: profile.username || 'cinefilo_vidarix',
  avatar: profile.photoURL || profile.avatar || null,
  bio: profile.bio || '',
  favoriteGenres: profile.favoriteGenres || [],
  watchedCount: 0,
  mutualFriends: 0,
  isOnline: true
});

const profileRowToSocialUser = (row: ProfileRow): SocialUser => ({
  id: row.id,
  displayName: row.display_name || row.full_name || row.username || 'Usuário VIDARIX',
  username: row.username || `user_${row.id.slice(0, 8)}`,
  avatar: row.avatar_url || null,
  bio: row.bio || '',
  favoriteGenres: [],
  watchedCount: 0,
  mutualFriends: 0,
  isOnline: false
});

const fallbackSocialUser = (id: string): SocialUser => ({
  id,
  displayName: 'Usuário VIDARIX',
  username: `user_${id.slice(0, 8)}`,
  avatar: null,
  bio: '',
  favoriteGenres: [],
  watchedCount: 0,
  mutualFriends: 0,
  isOnline: false
});

const normalizeMedia = (
  tmdbId: number,
  mediaType: 'movie' | 'tv',
  title?: string | null,
  posterPath?: string | null,
  mediaData?: unknown,
  mediaPool: MediaItem[] = []
): MediaItem => {
  if (mediaData && typeof mediaData === 'object') {
    const data = mediaData as Partial<MediaItem>;
    return {
      id: Number(data.id ?? tmdbId),
      title: data.title || data.name || title || 'Título VIDARIX',
      name: data.name || data.title || title || undefined,
      media_type: (data.media_type || mediaType) as 'movie' | 'tv',
      overview: data.overview || '',
      poster_path: data.poster_path ?? posterPath ?? null,
      backdrop_path: data.backdrop_path ?? null,
      vote_average: Number(data.vote_average ?? 0),
      genre_ids: Array.isArray(data.genre_ids) ? data.genre_ids : [],
      ...data
    } as MediaItem;
  }

  const found = mediaPool.find((item) => item.id === tmdbId && item.media_type === mediaType);
  if (found) return found;

  return {
    id: tmdbId,
    title: title || 'Título VIDARIX',
    name: mediaType === 'tv' ? title || 'Título VIDARIX' : undefined,
    media_type: mediaType,
    overview: '',
    poster_path: posterPath || null,
    backdrop_path: null,
    vote_average: 0,
    genre_ids: []
  };
};

const dispatchSocialUpdate = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('vidarix-social-updated'));
  }
};

const mapFriendRequestStatus = (status: string): FriendRequest['status'] => {
  if (status === 'accepted') return 'accepted';
  if (status === 'pending') return 'pending';
  if (status === 'rejected' || status === 'cancelled') return 'declined';
  return 'blocked';
};

export class SocialService {
  private static cache: SocialCache = emptyCache();
  private static profile: UserProfile | null = null;
  private static mediaPool: MediaItem[] = [];
  private static profileMap = new Map<string, SocialUser>();
  private static discussionCache = new Map<string, TitleDiscussionEntry[]>();
  private static realtimeChannel: RealtimeChannel | null = null;
  private static currentUserId = '';
  private static loadPromise: Promise<void> | null = null;
  private static reloadTimer: number | null = null;

  static async initialize(profile: UserProfile, mediaPool: MediaItem[] = []): Promise<void> {
    this.profile = profile;
    this.mediaPool = mediaPool;

    if (!this.canUseBackend(profile)) {
      await this.disconnectRealtime();
      this.currentUserId = '';
      this.profileMap.clear();
      this.cache = emptyCache();
      dispatchSocialUpdate();
      return;
    }

    const changedUser = this.currentUserId !== profile.id;
    this.currentUserId = profile.id;
    this.profileMap.set(profile.id, currentSocialUser(profile));

    if (changedUser) {
      await this.disconnectRealtime();
      this.discussionCache.clear();
    }

    if (!this.loadPromise) {
      this.loadPromise = this.loadAll()
        .catch((error) => {
          console.error('Erro ao carregar backend social da VIDARIX:', error);
        })
        .finally(() => {
          this.loadPromise = null;
        });
    }

    await this.loadPromise;
    await this.connectRealtime();
  }

  private static canUseBackend(profile: UserProfile | null = this.profile): profile is UserProfile {
    return Boolean(
      isSupabaseConfigured &&
      profile?.id &&
      profile.id !== 'guest_user' &&
      !profile.id.startsWith('guest_') &&
      !profile.id.startsWith('local_') &&
      profile.isAuthenticated !== false
    );
  }

  private static requireUser(): string {
    if (!this.canUseBackend() || !this.profile) {
      throw new Error('Entre na sua conta para usar os recursos da Comunidade.');
    }
    return this.profile.id;
  }

  private static async disconnectRealtime() {
    if (this.realtimeChannel) {
      await supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
  }

  private static scheduleReload() {
    if (typeof window === 'undefined') return;
    if (this.reloadTimer) window.clearTimeout(this.reloadTimer);
    this.reloadTimer = window.setTimeout(() => {
      this.reloadTimer = null;
      void this.loadAll().catch((error) => console.error('Erro ao atualizar dados sociais em tempo real:', error));
    }, 220);
  }

  private static async connectRealtime() {
    if (!this.canUseBackend() || this.realtimeChannel) return;

    const tables = [
      'friend_requests',
      'friendships',
      'messages',
      'group_messages',
      'groups',
      'group_members',
      'group_watchlist',
      'recommendations',
      'notifications',
      'title_discussions',
      'discussion_likes'
    ];

    let channel = supabase.channel(`vidarix-social-${this.currentUserId}`);
    tables.forEach((table) => {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => this.scheduleReload()
      );
    });

    this.realtimeChannel = channel.subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn('Realtime social temporariamente indisponível:', status);
      }
    });
  }

  private static async fetchProfiles(ids?: string[]): Promise<Map<string, SocialUser>> {
    let query = supabase
      .from('profiles')
      .select('id, full_name, display_name, username, bio, avatar_url, public_profile');

    if (ids && ids.length > 0) query = query.in('id', [...new Set(ids)]);

    const { data, error } = await query;
    if (error) {
      console.warn('Não foi possível carregar alguns perfis sociais:', error.message);
      return this.profileMap;
    }

    (data || []).forEach((row: ProfileRow) => {
      this.profileMap.set(row.id, profileRowToSocialUser(row));
    });

    if (this.profile) this.profileMap.set(this.profile.id, currentSocialUser(this.profile));
    return this.profileMap;
  }

  private static userById(id: string): SocialUser {
    return this.profileMap.get(id) || fallbackSocialUser(id);
  }

  private static async loadAll(): Promise<void> {
    if (!this.canUseBackend()) return;

    await this.fetchProfiles();

    await Promise.all([
      this.loadFriendData(),
      this.loadGroups(),
      this.loadConversations(),
      this.loadRecommendations(),
      this.loadNotifications()
    ]);

    this.cache.users = [...this.profileMap.values()]
      .filter((user) => user.id !== this.currentUserId)
      .sort((a, b) => a.displayName.localeCompare(b.displayName, 'pt-BR'));

    this.cache.activities = this.buildActivities();
    dispatchSocialUpdate();
  }

  private static async loadFriendData() {
    const userId = this.requireUser();

    const [requestResult, friendshipResult] = await Promise.all([
      supabase
        .from('friend_requests')
        .select('*')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false }),
      supabase
        .from('friendships')
        .select('*')
        .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
        .order('created_at', { ascending: false })
    ]);

    if (requestResult.error) throw requestResult.error;
    if (friendshipResult.error) throw friendshipResult.error;

    const relatedIds = [
      ...(requestResult.data || []).flatMap((row: any) => [row.sender_id, row.receiver_id]),
      ...(friendshipResult.data || []).flatMap((row: any) => [row.user_a_id, row.user_b_id])
    ];
    if (relatedIds.length > 0) await this.fetchProfiles(relatedIds);

    this.cache.requests = (requestResult.data || []).map((row: any) => ({
      id: row.id,
      fromUser: this.userById(row.sender_id),
      toUserId: row.receiver_id,
      status: mapFriendRequestStatus(row.status),
      createdAt: row.created_at
    }));

    this.cache.friends = (friendshipResult.data || []).map((row: any) => {
      const friendId = row.user_a_id === userId ? row.user_b_id : row.user_a_id;
      return {
        id: row.id,
        user: this.userById(friendId),
        createdAt: row.created_at
      };
    });
  }

  private static async loadGroups() {
    const { data: groupRows, error: groupError } = await supabase
      .from('groups')
      .select('*')
      .order('updated_at', { ascending: false });

    if (groupError) throw groupError;
    if (!groupRows?.length) {
      this.cache.groups = [];
      return;
    }

    const groupIds = groupRows.map((row: any) => row.id);
    const [memberResult, messageResult, watchlistResult] = await Promise.all([
      supabase.from('group_members').select('*').in('group_id', groupIds),
      supabase.from('group_messages').select('*').in('group_id', groupIds).order('created_at', { ascending: true }),
      supabase.from('group_watchlist').select('*').in('group_id', groupIds).order('created_at', { ascending: false })
    ]);

    if (memberResult.error) throw memberResult.error;
    if (messageResult.error) throw messageResult.error;
    if (watchlistResult.error) throw watchlistResult.error;

    const relatedIds = [
      ...groupRows.map((row: any) => row.owner_id),
      ...(memberResult.data || []).map((row: any) => row.user_id),
      ...(messageResult.data || []).map((row: any) => row.sender_id)
    ];
    if (relatedIds.length > 0) await this.fetchProfiles(relatedIds);

    this.cache.groups = groupRows.map((group: any) => {
      const memberships = (memberResult.data || []).filter((row: any) => row.group_id === group.id && row.status === 'active');
      const messages: CommunityMessage[] = (messageResult.data || [])
        .filter((row: any) => row.group_id === group.id)
        .map((row: any) => ({
          id: row.id,
          author: this.userById(row.sender_id),
          text: row.body || '',
          media: row.media_data
            ? normalizeMedia(
                Number((row.media_data as any)?.id || 0),
                ((row.media_data as any)?.media_type || 'movie') as 'movie' | 'tv',
                (row.media_data as any)?.title,
                (row.media_data as any)?.poster_path,
                row.media_data,
                this.mediaPool
              )
            : undefined,
          spoiler: Boolean(row.spoiler),
          createdAt: row.created_at
        }));

      const watchlist: MediaItem[] = (watchlistResult.data || [])
        .filter((row: any) => row.group_id === group.id)
        .map((row: any) => normalizeMedia(
          row.tmdb_id,
          row.media_type,
          row.title,
          row.poster_path,
          row.media_data,
          this.mediaPool
        ));

      const linkedMedia = group.linked_media && typeof group.linked_media === 'object'
        ? normalizeMedia(
            Number(group.linked_media.id || 0),
            (group.linked_media.media_type || 'movie') as 'movie' | 'tv',
            group.linked_media.title,
            group.linked_media.poster_path,
            group.linked_media,
            this.mediaPool
          )
        : undefined;

      return {
        id: group.id,
        name: group.name,
        description: group.description || '',
        cover: group.cover_url || null,
        privacy: group.privacy,
        ownerId: group.owner_id,
        memberIds: memberships.map((row: any) => row.user_id),
        members: memberships.map((row: any) => this.userById(row.user_id)),
        messages,
        watchlist,
        createdAt: group.created_at,
        linkedMedia
      } as CommunityGroup;
    });
  }

  private static async loadConversations() {
    const userId = this.requireUser();
    const { data: ownParticipants, error: ownError } = await supabase
      .from('conversation_participants')
      .select('*')
      .eq('user_id', userId)
      .eq('archived', false);

    if (ownError) throw ownError;
    if (!ownParticipants?.length) {
      this.cache.conversations = [];
      return;
    }

    const conversationIds = ownParticipants.map((row: any) => row.conversation_id);
    const [conversationResult, participantResult, messageResult] = await Promise.all([
      supabase.from('conversations').select('*').in('id', conversationIds).order('updated_at', { ascending: false }),
      supabase.from('conversation_participants').select('*').in('conversation_id', conversationIds),
      supabase.from('messages').select('*').in('conversation_id', conversationIds).order('created_at', { ascending: true })
    ]);

    if (conversationResult.error) throw conversationResult.error;
    if (participantResult.error) throw participantResult.error;
    if (messageResult.error) throw messageResult.error;

    const profileIds = [
      ...(participantResult.data || []).map((row: any) => row.user_id),
      ...(messageResult.data || []).map((row: any) => row.sender_id)
    ];
    if (profileIds.length > 0) await this.fetchProfiles(profileIds);

    this.cache.conversations = (conversationResult.data || []).map((conversation: any) => {
      const participantRows = (participantResult.data || []).filter((row: any) => row.conversation_id === conversation.id);
      const otherParticipant = participantRows.find((row: any) => row.user_id !== userId);
      const messages: CommunityMessage[] = (messageResult.data || [])
        .filter((row: any) => row.conversation_id === conversation.id)
        .map((row: any) => ({
          id: row.id,
          author: this.userById(row.sender_id),
          text: row.body || '',
          media: row.media_data
            ? normalizeMedia(
                Number((row.media_data as any)?.id || 0),
                ((row.media_data as any)?.media_type || 'movie') as 'movie' | 'tv',
                (row.media_data as any)?.title,
                (row.media_data as any)?.poster_path,
                row.media_data,
                this.mediaPool
              )
            : undefined,
          spoiler: Boolean(row.spoiler),
          createdAt: row.created_at
        }));

      return {
        id: conversation.id,
        participant: this.userById(otherParticipant?.user_id || userId),
        messages,
        updatedAt: conversation.updated_at || conversation.created_at
      } as DirectConversation;
    });
  }

  private static async loadRecommendations() {
    const { data, error } = await supabase
      .from('recommendations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const profileIds = (data || []).flatMap((row: any) => [row.sender_id, row.recipient_user_id].filter(Boolean));
    if (profileIds.length > 0) await this.fetchProfiles(profileIds);

    const groupsById = new Map(this.cache.groups.map((group) => [group.id, group]));
    this.cache.recommendations = (data || []).map((row: any) => {
      const recipientType = row.recipient_user_id ? 'user' : 'group';
      const recipientId = row.recipient_user_id || row.recipient_group_id;
      const recipientName = recipientType === 'user'
        ? this.userById(recipientId).displayName
        : groupsById.get(recipientId)?.name || 'Grupo VIDARIX';

      return {
        id: row.id,
        sender: this.userById(row.sender_id),
        recipientId,
        recipientType,
        recipientName,
        media: normalizeMedia(
          row.tmdb_id,
          row.media_type,
          row.title,
          row.poster_path,
          row.media_data,
          this.mediaPool
        ),
        message: row.message || undefined,
        status: row.status,
        createdAt: row.created_at
      } as MediaRecommendation;
    });
  }

  private static async loadNotifications() {
    const userId = this.requireUser();
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    const actorIds = (data || []).map((row: any) => row.actor_id).filter(Boolean);
    if (actorIds.length > 0) await this.fetchProfiles(actorIds);

    this.cache.notifications = (data || []).map((row: any) => ({
      id: row.id,
      category: row.category,
      title: row.title,
      description: row.description,
      createdAt: row.created_at,
      read: Boolean(row.read),
      actor: row.actor_id ? this.userById(row.actor_id) : undefined,
      targetPath: row.target_path || undefined,
      media: row.media_data && typeof row.media_data === 'object'
        ? normalizeMedia(
            Number(row.media_data.id || 0),
            (row.media_data.media_type || 'movie') as 'movie' | 'tv',
            row.media_data.title,
            row.media_data.poster_path,
            row.media_data,
            this.mediaPool
          )
        : undefined
    }));
  }

  private static buildActivities(): SocialActivity[] {
    const recommendationActivities: SocialActivity[] = this.cache.recommendations.map((item) => ({
      id: `recommendation_${item.id}`,
      actor: item.sender,
      action: 'recommended',
      description: `recomendou ${item.media.title || item.media.name} para ${item.recipientName}`,
      media: item.media,
      createdAt: item.createdAt
    }));

    const groupActivities: SocialActivity[] = this.cache.groups.map((group) => ({
      id: `group_${group.id}`,
      actor: this.userById(group.ownerId),
      action: 'joined_group',
      description: `criou o grupo ${group.name}`,
      group,
      createdAt: group.createdAt
    }));

    return [...recommendationActivities, ...groupActivities]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 80);
  }

  static getUsers(): SocialUser[] {
    return [...this.cache.users];
  }

  static getFriends(): Friendship[] {
    return [...this.cache.friends];
  }

  static getFriendRequests(): FriendRequest[] {
    return [...this.cache.requests];
  }

  static getNotifications(): SocialNotification[] {
    return [...this.cache.notifications];
  }

  static getRecommendations(): MediaRecommendation[] {
    return [...this.cache.recommendations];
  }

  static getGroups(): CommunityGroup[] {
    return [...this.cache.groups];
  }

  static getConversations(): DirectConversation[] {
    return [...this.cache.conversations];
  }

  static getActivities(): SocialActivity[] {
    return [...this.cache.activities];
  }

  static getTitleDiscussion(media: MediaItem): TitleDiscussionEntry[] {
    return [...(this.discussionCache.get(`${media.media_type}:${media.id}`) || [])];
  }

  static async loadTitleDiscussion(media: MediaItem): Promise<TitleDiscussionEntry[]> {
    this.requireUser();
    const { data: discussionRows, error } = await supabase
      .from('title_discussions')
      .select('*')
      .eq('tmdb_id', media.id)
      .eq('media_type', media.media_type)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const ids = (discussionRows || []).map((row: any) => row.id);
    const [likesResult] = await Promise.all([
      ids.length > 0
        ? supabase.from('discussion_likes').select('*').in('discussion_id', ids)
        : Promise.resolve({ data: [], error: null } as any),
      this.fetchProfiles((discussionRows || []).map((row: any) => row.user_id))
    ]);

    if (likesResult.error) throw likesResult.error;

    const entries: TitleDiscussionEntry[] = (discussionRows || []).map((row: any) => ({
      id: row.id,
      mediaKey: `${row.media_type}:${row.tmdb_id}`,
      author: this.userById(row.user_id),
      text: row.body,
      kind: row.kind,
      spoiler: Boolean(row.spoiler),
      rating: row.rating == null ? undefined : Number(row.rating),
      parentId: row.parent_id || undefined,
      likes: (likesResult.data || [])
        .filter((like: any) => like.discussion_id === row.id)
        .map((like: any) => like.user_id),
      createdAt: row.created_at
    }));

    this.discussionCache.set(`${media.media_type}:${media.id}`, entries);
    dispatchSocialUpdate();
    return entries;
  }

  static async sendFriendRequest(target: SocialUser, _profile?: UserProfile) {
    const userId = this.requireUser();
    const { error } = await supabase.from('friend_requests').insert({
      sender_id: userId,
      receiver_id: target.id,
      status: 'pending'
    });
    if (error) throw error;
    await this.loadAll();
  }

  static async acceptFriendRequest(requestId: string) {
    this.requireUser();
    const { error } = await supabase
      .from('friend_requests')
      .update({ status: 'accepted' })
      .eq('id', requestId);
    if (error) throw error;
    await this.loadAll();
  }

  static async declineFriendRequest(requestId: string) {
    this.requireUser();
    const { error } = await supabase
      .from('friend_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId);
    if (error) throw error;
    await this.loadAll();
  }

  static async removeFriend(userId: string) {
    const currentUserId = this.requireUser();
    const { error } = await supabase
      .from('friendships')
      .delete()
      .or(
        `and(user_a_id.eq.${currentUserId},user_b_id.eq.${userId}),and(user_a_id.eq.${userId},user_b_id.eq.${currentUserId})`
      );
    if (error) throw error;
    await this.loadAll();
  }

  static async markNotificationRead(id: string) {
    const previous = this.cache.notifications;
    this.cache.notifications = previous.map((item) => item.id === id ? { ...item, read: true } : item);
    dispatchSocialUpdate();

    const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
    if (error) {
      this.cache.notifications = previous;
      dispatchSocialUpdate();
      throw error;
    }
  }

  static async markAllNotificationsRead() {
    const userId = this.requireUser();
    const previous = this.cache.notifications;
    this.cache.notifications = previous.map((item) => ({ ...item, read: true }));
    dispatchSocialUpdate();

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      this.cache.notifications = previous;
      dispatchSocialUpdate();
      throw error;
    }
  }

  static async pushNotification(_input: Omit<SocialNotification, 'id' | 'createdAt' | 'read'>) {
    // As notificações são geradas por triggers seguros no banco.
  }

  static async sendRecommendation(
    media: MediaItem,
    recipients: Array<{ id: string; name: string; type: 'user' | 'group' }>,
    message: string,
    _profile?: UserProfile
  ) {
    const userId = this.requireUser();
    if (recipients.length === 0) return;

    const rows = recipients.map((recipient) => ({
      sender_id: userId,
      recipient_user_id: recipient.type === 'user' ? recipient.id : null,
      recipient_group_id: recipient.type === 'group' ? recipient.id : null,
      tmdb_id: media.id,
      media_type: media.media_type,
      title: media.title || media.name || 'Título VIDARIX',
      poster_path: media.poster_path,
      media_data: media,
      message: message.trim() || null,
      status: 'sent'
    }));

    const { error } = await supabase.from('recommendations').insert(rows);
    if (error) throw error;

    await Promise.all(
      recipients
        .filter((recipient) => recipient.type === 'group')
        .map((recipient) => this.addMediaToGroup(recipient.id, media))
    );
    await this.loadAll();
  }

  static async updateRecommendationStatus(id: string, status: MediaRecommendation['status']) {
    this.requireUser();
    const payload: Record<string, unknown> = { status };
    if (status === 'viewed' || status === 'saved') payload.viewed_at = new Date().toISOString();

    const { error } = await supabase.from('recommendations').update(payload).eq('id', id);
    if (error) throw error;
    await this.loadRecommendations();
    this.cache.activities = this.buildActivities();
    dispatchSocialUpdate();
  }

  static async createGroup(
    input: { name: string; description: string; privacy: 'public' | 'private' },
    _profile?: UserProfile
  ) {
    const userId = this.requireUser();
    const { error } = await supabase.from('groups').insert({
      owner_id: userId,
      name: input.name.trim(),
      description: input.description.trim() || null,
      privacy: input.privacy
    });
    if (error) throw error;
    await this.loadAll();
  }

  static async joinGroup(groupId: string, _profile?: UserProfile) {
    const userId = this.requireUser();
    const { error } = await supabase.from('group_members').insert({
      group_id: groupId,
      user_id: userId,
      role: 'member',
      status: 'active'
    });
    if (error && error.code !== '23505') throw error;
    await this.loadAll();
  }

  static async leaveGroup(groupId: string, _profile?: UserProfile) {
    const userId = this.requireUser();
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId);
    if (error) throw error;
    await this.loadAll();
  }

  static async sendGroupMessage(groupId: string, text: string, _profile?: UserProfile, media?: MediaItem) {
    const userId = this.requireUser();
    if (!text.trim() && !media) return;

    const { error } = await supabase.from('group_messages').insert({
      group_id: groupId,
      sender_id: userId,
      body: text.trim() || null,
      media_data: media || null
    });
    if (error) throw error;
    await this.loadGroups();
    dispatchSocialUpdate();
  }

  static async addMediaToGroup(groupId: string, media: MediaItem) {
    const userId = this.requireUser();
    const { error } = await supabase.from('group_watchlist').upsert(
      {
        group_id: groupId,
        added_by: userId,
        tmdb_id: media.id,
        media_type: media.media_type,
        title: media.title || media.name || 'Título VIDARIX',
        poster_path: media.poster_path,
        media_data: media
      },
      { onConflict: 'group_id,tmdb_id,media_type', ignoreDuplicates: true }
    );
    if (error) throw error;
  }

  static async ensureConversation(friend: SocialUser): Promise<string> {
    this.requireUser();
    const existing = this.cache.conversations.find((conversation) => conversation.participant.id === friend.id);
    if (existing) return existing.id;

    const { data, error } = await supabase.rpc('get_or_create_direct_conversation', {
      other_user_id: friend.id
    });
    if (error) throw error;

    await this.loadConversations();
    dispatchSocialUpdate();
    return String(data);
  }

  static async sendDirectMessage(friend: SocialUser, text: string, _profile?: UserProfile, media?: MediaItem) {
    const userId = this.requireUser();
    if (!text.trim() && !media) return;

    const conversationId = await this.ensureConversation(friend);
    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: userId,
      body: text.trim() || null,
      media_data: media || null
    });
    if (error) throw error;

    await this.loadConversations();
    await this.loadNotifications();
    dispatchSocialUpdate();
  }

  static async addTitleDiscussion(
    media: MediaItem,
    input: { text: string; kind: TitleDiscussionEntry['kind']; spoiler?: boolean; rating?: number },
    _profile?: UserProfile
  ) {
    const userId = this.requireUser();
    if (!input.text.trim()) return;

    const { error } = await supabase.from('title_discussions').insert({
      user_id: userId,
      tmdb_id: media.id,
      media_type: media.media_type,
      kind: input.kind,
      body: input.text.trim(),
      rating: input.rating ?? null,
      spoiler: Boolean(input.spoiler)
    });
    if (error) throw error;
    await this.loadTitleDiscussion(media);
  }

  static async toggleDiscussionLike(entryId: string, profile?: UserProfile) {
    const userId = this.requireUser();
    const entry = [...this.discussionCache.values()].flat().find((item) => item.id === entryId);
    const liked = Boolean(entry?.likes?.includes(profile?.id || userId));

    if (liked) {
      const { error } = await supabase
        .from('discussion_likes')
        .delete()
        .eq('discussion_id', entryId)
        .eq('user_id', userId);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('discussion_likes').insert({
        discussion_id: entryId,
        user_id: userId
      });
      if (error && error.code !== '23505') throw error;
    }

    const mediaKey = entry?.mediaKey;
    if (mediaKey) {
      const [mediaType, tmdbId] = mediaKey.split(':');
      await this.loadTitleDiscussion({
        id: Number(tmdbId),
        title: '',
        media_type: mediaType as 'movie' | 'tv',
        overview: '',
        poster_path: null,
        backdrop_path: null,
        vote_average: 0,
        genre_ids: []
      });
    }
  }
}
