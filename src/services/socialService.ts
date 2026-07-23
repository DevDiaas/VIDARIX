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

const KEYS = {
  users: 'vidarix_social_users_v1',
  friends: 'vidarix_social_friends_v1',
  requests: 'vidarix_social_friend_requests_v1',
  notifications: 'vidarix_social_notifications_v1',
  recommendations: 'vidarix_social_recommendations_v1',
  groups: 'vidarix_social_groups_v1',
  conversations: 'vidarix_social_conversations_v1',
  discussions: 'vidarix_social_title_discussions_v1',
  activities: 'vidarix_social_activities_v1'
} as const;

const nowMinus = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
const makeId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const DEMO_USERS: SocialUser[] = [
  {
    id: 'social_ana',
    displayName: 'Ana Martins',
    username: 'ana.cinefila',
    bio: 'Suspense, ficção científica e finais que rendem teoria.',
    favoriteGenres: [878, 53, 9648],
    watchedCount: 148,
    mutualFriends: 3,
    isOnline: true
  },
  {
    id: 'social_caio',
    displayName: 'Caio Nunes',
    username: 'caio.maratonas',
    bio: 'Sempre procurando a próxima série para maratonar.',
    favoriteGenres: [18, 35, 10765],
    watchedCount: 92,
    mutualFriends: 2,
    isOnline: false
  },
  {
    id: 'social_marina',
    displayName: 'Marina Rocha',
    username: 'marina.noir',
    bio: 'Cinema brasileiro, terror e dramas intensos.',
    favoriteGenres: [27, 18, 80],
    watchedCount: 211,
    mutualFriends: 5,
    isOnline: true
  },
  {
    id: 'social_pedro',
    displayName: 'Pedro Lima',
    username: 'pedro.popcorn',
    bio: 'Ação, aventura e animação para assistir com todo mundo.',
    favoriteGenres: [28, 12, 16],
    watchedCount: 76,
    mutualFriends: 1,
    isOnline: true
  },
  {
    id: 'social_livia',
    displayName: 'Lívia Souza',
    username: 'livia.series',
    bio: 'Especialista em séries curtas e episódios finais.',
    favoriteGenres: [18, 9648, 10765],
    watchedCount: 130,
    mutualFriends: 4,
    isOnline: false
  }
];

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Browser storage may be unavailable in private mode.
  }
  window.dispatchEvent(new CustomEvent('vidarix-social-updated'));
}

function currentUser(profile: UserProfile): SocialUser {
  return {
    id: profile.id || 'guest_user',
    displayName: profile.displayName || profile.fullName || profile.name || 'Cinéfilo VIDARIX',
    username: profile.username || 'cinefilo_vidarix',
    avatar: profile.photoURL || profile.avatar || null,
    bio: profile.bio,
    favoriteGenres: profile.favoriteGenres,
    watchedCount: 0,
    mutualFriends: 0,
    isOnline: true
  };
}

function safeMedia(item?: MediaItem): MediaItem | undefined {
  if (!item) return undefined;
  return {
    ...item,
    title: item.title || item.name || 'Título VIDARIX',
    name: item.name || item.title
  };
}

export class SocialService {
  static initialize(profile: UserProfile, mediaPool: MediaItem[] = []) {
    const storedUsers = read<SocialUser[]>(KEYS.users, DEMO_USERS);
    const enrichedUsers = storedUsers.map((user, index) => ({
      ...user,
      recentWatched: user.recentWatched?.length
        ? user.recentWatched
        : mediaPool.slice(index * 2, index * 2 + 4).map((item) => safeMedia(item)!).filter(Boolean)
    }));
    write(KEYS.users, enrichedUsers);

    const demoUserById = (id: string) => enrichedUsers.find((user) => user.id === id) || DEMO_USERS.find((user) => user.id === id)!;

    if (!localStorage.getItem(KEYS.friends)) {
      const friends: Friendship[] = [
        { id: 'friend_ana', user: demoUserById('social_ana'), createdAt: nowMinus(60 * 24 * 14) },
        { id: 'friend_marina', user: demoUserById('social_marina'), createdAt: nowMinus(60 * 24 * 7) }
      ];
      write(KEYS.friends, friends);
    }

    const existingFriends = this.getFriends();
    if (existingFriends.length > 0) {
      write(KEYS.friends, existingFriends.map((friend) => ({
        ...friend,
        user: demoUserById(friend.user.id) || friend.user
      })));
    }

    if (!localStorage.getItem(KEYS.requests)) {
      const requests: FriendRequest[] = [
        {
          id: 'request_caio',
          fromUser: demoUserById('social_caio'),
          toUserId: profile.id,
          status: 'pending',
          createdAt: nowMinus(85)
        }
      ];
      write(KEYS.requests, requests);
    }

    if (!localStorage.getItem(KEYS.notifications)) {
      const media = safeMedia(mediaPool[0]);
      const notifications: SocialNotification[] = [
        {
          id: 'notif_friend_caio',
          category: 'friendship',
          title: 'Novo pedido de amizade',
          description: 'Caio Nunes quer adicionar você como amigo.',
          actor: DEMO_USERS[1],
          targetPath: '/comunidade?tab=friends',
          createdAt: nowMinus(34),
          read: false
        },
        {
          id: 'notif_group',
          category: 'group',
          title: 'Nova conversa no grupo',
          description: 'Marina comentou no grupo Clube VIDARIX Sci-Fi.',
          actor: DEMO_USERS[2],
          targetPath: '/comunidade?tab=groups',
          createdAt: nowMinus(72),
          read: false
        },
        ...(media
          ? [{
              id: 'notif_recommendation',
              category: 'recommendation' as const,
              title: 'Ana recomendou um título',
              description: `${media.title || media.name} pode combinar com você.`,
              actor: DEMO_USERS[0],
              media,
              targetPath: '/comunidade?tab=recommendations',
              createdAt: nowMinus(210),
              read: true
            }]
          : [])
      ];
      write(KEYS.notifications, notifications);
    }

    if (!localStorage.getItem(KEYS.groups)) {
      const current = currentUser(profile);
      const groups: CommunityGroup[] = [
        {
          id: 'group_scifi',
          name: 'Clube VIDARIX Sci-Fi',
          description: 'Teorias, indicações e sessões coletivas de ficção científica.',
          privacy: 'public',
          ownerId: DEMO_USERS[0].id,
          memberIds: [current.id, DEMO_USERS[0].id, DEMO_USERS[2].id],
          members: [current, DEMO_USERS[0], DEMO_USERS[2]],
          messages: [
            {
              id: 'group_msg_1',
              author: DEMO_USERS[0],
              text: 'Qual título merece entrar na próxima roleta do grupo?',
              createdAt: nowMinus(180)
            },
            {
              id: 'group_msg_2',
              author: DEMO_USERS[2],
              text: 'Quero algo com mistério e viagem no tempo.',
              createdAt: nowMinus(150)
            }
          ],
          watchlist: mediaPool.slice(0, 3).map((item) => safeMedia(item)!).filter(Boolean),
          createdAt: nowMinus(60 * 24 * 30)
        },
        {
          id: 'group_terror',
          name: 'Terror de Sexta',
          description: 'Sessões semanais, enquetes e comentários sem spoiler.',
          privacy: 'private',
          ownerId: DEMO_USERS[2].id,
          memberIds: [DEMO_USERS[2].id, DEMO_USERS[4].id],
          members: [DEMO_USERS[2], DEMO_USERS[4]],
          messages: [],
          watchlist: mediaPool.slice(3, 6).map((item) => safeMedia(item)!).filter(Boolean),
          createdAt: nowMinus(60 * 24 * 20)
        }
      ];
      write(KEYS.groups, groups);
    }

    if (!localStorage.getItem(KEYS.conversations)) {
      const current = currentUser(profile);
      const conversations: DirectConversation[] = [
        {
          id: `conversation_${DEMO_USERS[0].id}`,
          participant: DEMO_USERS[0],
          messages: [
            { id: 'dm_1', author: DEMO_USERS[0], text: 'Você já viu o último título que te recomendei?', createdAt: nowMinus(95) },
            { id: 'dm_2', author: current, text: 'Ainda não, mas já coloquei na minha lista!', createdAt: nowMinus(82) }
          ],
          updatedAt: nowMinus(82)
        },
        {
          id: `conversation_${DEMO_USERS[2].id}`,
          participant: DEMO_USERS[2],
          messages: [
            { id: 'dm_3', author: DEMO_USERS[2], text: 'Vamos criar uma roleta só com terror brasileiro?', createdAt: nowMinus(230) }
          ],
          updatedAt: nowMinus(230)
        }
      ];
      write(KEYS.conversations, conversations);
    }

    if (!localStorage.getItem(KEYS.recommendations)) {
      const first = safeMedia(mediaPool[0]);
      const second = safeMedia(mediaPool[1]);
      const recommendations: MediaRecommendation[] = [];
      if (first) {
        recommendations.push({
          id: 'recommendation_in_1',
          sender: DEMO_USERS[0],
          recipientId: profile.id,
          recipientType: 'user',
          recipientName: currentUser(profile).displayName,
          media: first,
          message: 'Esse parece muito a sua cara. Depois me conta o que achou!',
          status: 'sent',
          createdAt: nowMinus(210)
        });
      }
      if (second) {
        recommendations.push({
          id: 'recommendation_out_1',
          sender: currentUser(profile),
          recipientId: DEMO_USERS[2].id,
          recipientType: 'user',
          recipientName: DEMO_USERS[2].displayName,
          media: second,
          message: 'Acho que você vai gostar da atmosfera.',
          status: 'viewed',
          createdAt: nowMinus(60 * 24)
        });
      }
      write(KEYS.recommendations, recommendations);
    }

    if (!localStorage.getItem(KEYS.activities)) {
      const activityMedia = safeMedia(mediaPool[0]);
      const activities: SocialActivity[] = [
        ...(activityMedia
          ? [{
              id: 'activity_ana_watched',
              actor: DEMO_USERS[0],
              action: 'watched' as const,
              description: `assistiu ${activityMedia.title || activityMedia.name} e deu nota 9`,
              media: activityMedia,
              createdAt: nowMinus(48)
            }]
          : []),
        {
          id: 'activity_marina_group',
          actor: DEMO_USERS[2],
          action: 'joined_group',
          description: 'entrou no grupo Terror de Sexta',
          createdAt: nowMinus(140)
        }
      ];
      write(KEYS.activities, activities);
    }

    if (!localStorage.getItem(KEYS.discussions)) {
      const firstMedia = safeMedia(mediaPool[0]);
      const seeded: TitleDiscussionEntry[] = firstMedia
        ? [
            {
              id: 'discussion_demo_1',
              mediaKey: `${firstMedia.media_type}:${firstMedia.id}`,
              author: demoUserById('social_ana'),
              text: 'A direção e a trilha sonora funcionaram muito bem juntas. O que vocês acharam do ritmo?',
              kind: 'comment',
              spoiler: false,
              likes: ['social_marina'],
              createdAt: nowMinus(120)
            },
            {
              id: 'discussion_demo_2',
              mediaKey: `${firstMedia.media_type}:${firstMedia.id}`,
              author: demoUserById('social_marina'),
              text: 'Tenho uma teoria sobre a última cena, mas marquei como spoiler para não estragar a experiência.',
              kind: 'theory',
              spoiler: true,
              likes: [],
              createdAt: nowMinus(88)
            },
            {
              id: 'discussion_demo_3',
              mediaKey: `${firstMedia.media_type}:${firstMedia.id}`,
              author: demoUserById('social_caio'),
              text: 'Vale muito a pena assistir com calma e sem olhar o celular.',
              kind: 'review',
              spoiler: false,
              rating: 8,
              likes: ['social_ana'],
              createdAt: nowMinus(52)
            }
          ]
        : [];
      write(KEYS.discussions, seeded);
    }
  }

  static getUsers(): SocialUser[] {
    return read<SocialUser[]>(KEYS.users, DEMO_USERS);
  }

  static getFriends(): Friendship[] {
    return read<Friendship[]>(KEYS.friends, []);
  }

  static getFriendRequests(): FriendRequest[] {
    return read<FriendRequest[]>(KEYS.requests, []);
  }

  static getNotifications(): SocialNotification[] {
    return read<SocialNotification[]>(KEYS.notifications, []).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  static getRecommendations(): MediaRecommendation[] {
    return read<MediaRecommendation[]>(KEYS.recommendations, []).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  static getGroups(): CommunityGroup[] {
    return read<CommunityGroup[]>(KEYS.groups, []);
  }

  static getConversations(): DirectConversation[] {
    return read<DirectConversation[]>(KEYS.conversations, []).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  static getActivities(): SocialActivity[] {
    return read<SocialActivity[]>(KEYS.activities, []).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  static getTitleDiscussion(media: MediaItem): TitleDiscussionEntry[] {
    const key = `${media.media_type}:${media.id}`;
    return read<TitleDiscussionEntry[]>(KEYS.discussions, [])
      .filter((entry) => entry.mediaKey === key)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  static sendFriendRequest(target: SocialUser, profile: UserProfile) {
    const requests = this.getFriendRequests();
    if (requests.some((request) => request.fromUser.id === profile.id && request.toUserId === target.id && request.status === 'pending')) return;
    requests.unshift({
      id: makeId('request'),
      fromUser: currentUser(profile),
      toUserId: target.id,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    write(KEYS.requests, requests);
    this.pushNotification({
      category: 'friendship',
      title: 'Pedido de amizade enviado',
      description: `Seu pedido para ${target.displayName} foi enviado.`,
      actor: target,
      targetPath: '/comunidade?tab=friends'
    });
  }

  static acceptFriendRequest(requestId: string) {
    const requests = this.getFriendRequests();
    const request = requests.find((item) => item.id === requestId);
    if (!request) return;
    request.status = 'accepted';
    write(KEYS.requests, requests);

    const friends = this.getFriends();
    if (!friends.some((friend) => friend.user.id === request.fromUser.id)) {
      friends.unshift({ id: makeId('friend'), user: request.fromUser, createdAt: new Date().toISOString() });
      write(KEYS.friends, friends);
    }
    this.pushNotification({
      category: 'friendship',
      title: 'Amizade confirmada',
      description: `Você e ${request.fromUser.displayName} agora são amigos.`,
      actor: request.fromUser,
      targetPath: '/comunidade?tab=friends'
    });
  }

  static declineFriendRequest(requestId: string) {
    const requests = this.getFriendRequests().map((request) =>
      request.id === requestId ? { ...request, status: 'declined' as const } : request
    );
    write(KEYS.requests, requests);
  }

  static removeFriend(userId: string) {
    write(KEYS.friends, this.getFriends().filter((friend) => friend.user.id !== userId));
  }

  static markNotificationRead(id: string) {
    write(KEYS.notifications, this.getNotifications().map((item) => (item.id === id ? { ...item, read: true } : item)));
  }

  static markAllNotificationsRead() {
    write(KEYS.notifications, this.getNotifications().map((item) => ({ ...item, read: true })));
  }

  static pushNotification(input: Omit<SocialNotification, 'id' | 'createdAt' | 'read'>) {
    const notifications = this.getNotifications();
    notifications.unshift({ ...input, id: makeId('notification'), createdAt: new Date().toISOString(), read: false });
    write(KEYS.notifications, notifications.slice(0, 80));
  }

  static sendRecommendation(
    media: MediaItem,
    recipients: Array<{ id: string; name: string; type: 'user' | 'group' }>,
    message: string,
    profile: UserProfile
  ) {
    const recommendations = this.getRecommendations();
    const sender = currentUser(profile);
    for (const recipient of recipients) {
      recommendations.unshift({
        id: makeId('recommendation'),
        sender,
        recipientId: recipient.id,
        recipientType: recipient.type,
        recipientName: recipient.name,
        media: safeMedia(media)!,
        message: message.trim() || undefined,
        status: 'sent',
        createdAt: new Date().toISOString()
      });
    }
    write(KEYS.recommendations, recommendations.slice(0, 100));
    recipients
      .filter((recipient) => recipient.type === 'group')
      .forEach((recipient) => this.addMediaToGroup(recipient.id, media));

    const activities = this.getActivities();
    activities.unshift({
      id: makeId('activity'),
      actor: sender,
      action: 'recommended',
      description: `recomendou ${media.title || media.name} para ${recipients.map((recipient) => recipient.name).join(', ')}`,
      media: safeMedia(media),
      createdAt: new Date().toISOString()
    });
    write(KEYS.activities, activities.slice(0, 100));
  }

  static updateRecommendationStatus(id: string, status: MediaRecommendation['status']) {
    write(
      KEYS.recommendations,
      this.getRecommendations().map((recommendation) => (recommendation.id === id ? { ...recommendation, status } : recommendation))
    );
  }

  static createGroup(input: { name: string; description: string; privacy: 'public' | 'private' }, profile: UserProfile) {
    const owner = currentUser(profile);
    const groups = this.getGroups();
    groups.unshift({
      id: makeId('group'),
      name: input.name.trim(),
      description: input.description.trim(),
      privacy: input.privacy,
      ownerId: owner.id,
      memberIds: [owner.id],
      members: [owner],
      messages: [],
      watchlist: [],
      createdAt: new Date().toISOString()
    });
    write(KEYS.groups, groups);
    this.pushNotification({
      category: 'group',
      title: 'Grupo criado',
      description: `O grupo ${input.name.trim()} está pronto para receber membros.`,
      targetPath: '/comunidade?tab=groups'
    });
  }

  static joinGroup(groupId: string, profile: UserProfile) {
    const user = currentUser(profile);
    const groups = this.getGroups().map((group) => {
      if (group.id !== groupId || group.memberIds.includes(user.id)) return group;
      return { ...group, memberIds: [...group.memberIds, user.id], members: [...group.members, user] };
    });
    write(KEYS.groups, groups);
  }

  static leaveGroup(groupId: string, profile: UserProfile) {
    const groups = this.getGroups().map((group) =>
      group.id === groupId
        ? {
            ...group,
            memberIds: group.memberIds.filter((id) => id !== profile.id),
            members: group.members.filter((member) => member.id !== profile.id)
          }
        : group
    );
    write(KEYS.groups, groups);
  }

  static sendGroupMessage(groupId: string, text: string, profile: UserProfile, media?: MediaItem) {
    if (!text.trim() && !media) return;
    const author = currentUser(profile);
    const message: CommunityMessage = {
      id: makeId('group_message'),
      author,
      text: text.trim(),
      media: safeMedia(media),
      createdAt: new Date().toISOString()
    };
    const groups = this.getGroups().map((group) =>
      group.id === groupId ? { ...group, messages: [...group.messages, message] } : group
    );
    write(KEYS.groups, groups);
  }

  static addMediaToGroup(groupId: string, media: MediaItem) {
    const groups = this.getGroups().map((group) => {
      if (group.id !== groupId || group.watchlist.some((item) => item.id === media.id && item.media_type === media.media_type)) return group;
      return { ...group, watchlist: [...group.watchlist, safeMedia(media)!] };
    });
    write(KEYS.groups, groups);
  }

  static ensureConversation(friend: SocialUser): string {
    const conversations = this.getConversations();
    const existing = conversations.find((conversation) => conversation.participant.id === friend.id);
    if (existing) return existing.id;
    const conversation: DirectConversation = {
      id: makeId('conversation'),
      participant: friend,
      messages: [],
      updatedAt: new Date().toISOString()
    };
    conversations.unshift(conversation);
    write(KEYS.conversations, conversations);
    return conversation.id;
  }

  static sendDirectMessage(friend: SocialUser, text: string, profile: UserProfile, media?: MediaItem) {
    if (!text.trim() && !media) return;
    const conversations = this.getConversations();
    const author = currentUser(profile);
    const message: CommunityMessage = {
      id: makeId('message'),
      author,
      text: text.trim(),
      media: safeMedia(media),
      createdAt: new Date().toISOString()
    };
    const existing = conversations.find((conversation) => conversation.participant.id === friend.id);
    if (existing) {
      existing.messages.push(message);
      existing.updatedAt = message.createdAt;
    } else {
      conversations.unshift({
        id: makeId('conversation'),
        participant: friend,
        messages: [message],
        updatedAt: message.createdAt
      });
    }
    write(KEYS.conversations, conversations);
  }

  static addTitleDiscussion(
    media: MediaItem,
    input: { text: string; kind: TitleDiscussionEntry['kind']; spoiler?: boolean; rating?: number },
    profile: UserProfile
  ) {
    if (!input.text.trim()) return;
    const entries = read<TitleDiscussionEntry[]>(KEYS.discussions, []);
    const entry: TitleDiscussionEntry = {
      id: makeId('discussion'),
      mediaKey: `${media.media_type}:${media.id}`,
      author: currentUser(profile),
      text: input.text.trim(),
      kind: input.kind,
      spoiler: Boolean(input.spoiler),
      rating: input.rating,
      likes: [],
      createdAt: new Date().toISOString()
    };
    entries.push(entry);
    write(KEYS.discussions, entries);

    const activities = this.getActivities();
    activities.unshift({
      id: makeId('activity'),
      actor: currentUser(profile),
      action: 'commented',
      description: `comentou sobre ${media.title || media.name}`,
      media: safeMedia(media),
      createdAt: entry.createdAt
    });
    write(KEYS.activities, activities.slice(0, 100));
  }

  static toggleDiscussionLike(entryId: string, profile: UserProfile) {
    const entries = read<TitleDiscussionEntry[]>(KEYS.discussions, []).map((entry) => {
      if (entry.id !== entryId) return entry;
      const likes = entry.likes || [];
      return {
        ...entry,
        likes: likes.includes(profile.id) ? likes.filter((id) => id !== profile.id) : [...likes, profile.id]
      };
    });
    write(KEYS.discussions, entries);
  }
}
