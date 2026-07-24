import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Check,
  ChevronRight,
  Eye,
  Globe2,
  Heart,
  Lock,
  MessageCircle,
  Plus,
  Search,
  Send,
  Sparkles,
  UserPlus,
  Users,
  X
} from 'lucide-react';
import {
  CommunityGroup,
  CommunityTab,
  DirectConversation,
  FriendRequest,
  Friendship,
  MediaItem,
  MediaRecommendation,
  SocialActivity,
  SocialUser,
  UserProfile
} from '../types';
import { SocialService } from '../services/socialService';
import { UserAvatar } from '../components/UserAvatar';
import { getPosterUrl } from '../services/tmdbApi';

interface CommunityPageProps {
  userProfile: UserProfile;
  mediaPool: MediaItem[];
  onSelectMedia: (item: MediaItem) => void;
  onAddToast?: (title: string, description?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  onAddToWatchlist?: (item: MediaItem) => void;
}

const tabs: Array<{ id: CommunityTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'feed', label: 'Feed', icon: Sparkles },
  { id: 'friends', label: 'Amigos', icon: UserPlus },
  { id: 'groups', label: 'Grupos', icon: Users },
  { id: 'messages', label: 'Conversas', icon: MessageCircle },
  { id: 'recommendations', label: 'Recomendações', icon: Bell }
];

const relativeTime = (date: string) => {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60_000));
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  return `${Math.floor(hours / 24)} d`;
};

const MediaMiniCard: React.FC<{ media: MediaItem; onClick: () => void }> = ({ media, onClick }) => (
  <button type="button" className="social-media-mini" onClick={onClick}>
    <img src={getPosterUrl(media.poster_path, 'w185')} alt={media.title || media.name} />
    <span><strong>{media.title || media.name}</strong><small>{media.media_type === 'tv' ? 'Série' : 'Filme'} · {media.vote_average?.toFixed(1) || '—'}</small></span>
    <ChevronRight />
  </button>
);

export const CommunityPage: React.FC<CommunityPageProps> = ({ userProfile, mediaPool, onSelectMedia, onAddToast, onAddToWatchlist }) => {
  const initialTab = useMemo<CommunityTab>(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab') as CommunityTab | null;
    return tabs.some((item) => item.id === tab) ? (tab as CommunityTab) : 'feed';
  }, []);

  const [activeTab, setActiveTab] = useState<CommunityTab>(initialTab);
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [users, setUsers] = useState<SocialUser[]>([]);
  const [groups, setGroups] = useState<CommunityGroup[]>([]);
  const [conversations, setConversations] = useState<DirectConversation[]>([]);
  const [recommendations, setRecommendations] = useState<MediaRecommendation[]>([]);
  const [activities, setActivities] = useState<SocialActivity[]>([]);
  const [query, setQuery] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupPrivacy, setGroupPrivacy] = useState<'public' | 'private'>('public');
  const [profilePreview, setProfilePreview] = useState<SocialUser | null>(null);

  const refresh = () => {
    setFriends(SocialService.getFriends());
    setRequests(SocialService.getFriendRequests());
    setUsers(SocialService.getUsers());
    setGroups(SocialService.getGroups());
    setConversations(SocialService.getConversations());
    setRecommendations(SocialService.getRecommendations());
    setActivities(SocialService.getActivities());
  };


  const runSocialAction = async (
    action: () => Promise<unknown>,
    success?: { title: string; description?: string }
  ) => {
    try {
      await action();
      refresh();
      if (success) onAddToast?.(success.title, success.description, 'success');
    } catch (error: any) {
      const description = error?.message || 'Confira sua conexão e tente novamente.';
      onAddToast?.('Não foi possível concluir', description, 'error');
      console.error('Erro na Comunidade VIDARIX:', error);
    }
  };

  useEffect(() => {
    void SocialService.initialize(userProfile, mediaPool);
    refresh();
    const handler = () => refresh();
    const navigationHandler = (event: Event) => {
      const detail = (event as CustomEvent<{ path: string; query?: string }>).detail;
      if (detail?.path !== '/comunidade') return;
      const params = new URLSearchParams(detail.query || '');
      const nextTab = params.get('tab') as CommunityTab | null;
      if (nextTab && tabs.some((item) => item.id === nextTab)) setActiveTab(nextTab);
    };
    window.addEventListener('vidarix-social-updated', handler);
    window.addEventListener('vidarix-navigate', navigationHandler);
    return () => {
      window.removeEventListener('vidarix-social-updated', handler);
      window.removeEventListener('vidarix-navigate', navigationHandler);
    };
  }, [userProfile, mediaPool]);

  useEffect(() => {
    if (!selectedGroupId && groups[0]) setSelectedGroupId(groups[0].id);
  }, [groups, selectedGroupId]);

  useEffect(() => {
    if (!selectedConversationId && conversations[0]) setSelectedConversationId(conversations[0].id);
  }, [conversations, selectedConversationId]);

  const friendIds = new Set(friends.map((friend) => friend.user.id));
  const pendingOutgoingIds = new Set(
    requests.filter((request) => request.fromUser.id === userProfile.id && request.status === 'pending').map((request) => request.toUserId)
  );
  const incomingRequests = requests.filter((request) => request.toUserId === userProfile.id && request.status === 'pending');
  const suggestions = users.filter((user) => !friendIds.has(user.id) && user.id !== userProfile.id);
  const selectedGroup = groups.find((group) => group.id === selectedGroupId) || null;
  const selectedConversation = conversations.find((conversation) => conversation.id === selectedConversationId) || null;

  const filteredSuggestions = suggestions.filter((user) => {
    const value = `${user.displayName} ${user.username}`.toLowerCase();
    return !query.trim() || value.includes(query.trim().toLowerCase());
  });

  const handleSendGroupMessage = async () => {
    if (!selectedGroup || !message.trim()) return;
    const text = message;
    setMessage('');
    await runSocialAction(() => SocialService.sendGroupMessage(selectedGroup.id, text, userProfile));
  };

  const handleSendDirectMessage = async () => {
    if (!selectedConversation || !message.trim()) return;
    const text = message;
    setMessage('');
    await runSocialAction(() => SocialService.sendDirectMessage(selectedConversation.participant, text, userProfile));
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return;
    const input = { name: groupName, description: groupDescription, privacy: groupPrivacy };
    await runSocialAction(
      () => SocialService.createGroup(input, userProfile),
      { title: 'Grupo criado', description: 'Seu novo espaço já está disponível na Comunidade.' }
    );
    setGroupName('');
    setGroupDescription('');
    setGroupPrivacy('public');
    setShowCreateGroup(false);
  };

  const setCommunityTab = (tab: CommunityTab) => {
    setActiveTab(tab);
    const url = tab === 'feed' ? '/comunidade' : `/comunidade?tab=${tab}`;
    window.history.replaceState({}, '', url);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderFeed = () => (
    <div className="social-layout-grid">
      <section className="social-feed-column">
        <div className="social-section-heading">
          <div><span className="social-eyebrow"><Sparkles /> Atividade dos amigos</span><h2>Seu feed VIDARIX</h2></div>
        </div>
        {activities.length === 0 ? (
          <div className="social-empty-state"><Sparkles /><strong>Seu feed vai ganhar vida</strong><span>Adicione amigos e participe de grupos para acompanhar novas atividades.</span></div>
        ) : (
          <div className="social-feed-list">
            {activities.map((activity) => (
              <article key={activity.id} className="social-feed-card">
                <UserAvatar src={activity.actor.avatar || ''} name={activity.actor.displayName} size="md" showBorder />
                <div className="min-w-0 flex-1">
                  <header><strong>{activity.actor.displayName}</strong><span>@{activity.actor.username} · {relativeTime(activity.createdAt)}</span></header>
                  <p>{activity.description}</p>
                  {activity.media && <MediaMiniCard media={activity.media} onClick={() => onSelectMedia(activity.media!)} />}
                  <footer><button type="button"><Heart /> Curtir</button><button type="button"><MessageCircle /> Comentar</button></footer>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <aside className="social-side-column">
        <div className="social-side-card">
          <span className="social-eyebrow"><Users /> Sua comunidade</span>
          <div className="social-metrics"><div><strong>{friends.length}</strong><span>amigos</span></div><div><strong>{groups.filter((group) => group.memberIds.includes(userProfile.id)).length}</strong><span>grupos</span></div><div><strong>{recommendations.length}</strong><span>indicações</span></div></div>
        </div>
        <div className="social-side-card">
          <h3>Amigos online</h3>
          {friends.filter((friend) => friend.user.isOnline).map((friend) => (
            <button type="button" key={friend.id} className="social-person-row" onClick={() => setCommunityTab('messages')}>
              <UserAvatar src={friend.user.avatar || ''} name={friend.user.displayName} size="sm" showBorder />
              <span><strong>{friend.user.displayName}</strong><small>@{friend.user.username}</small></span><i />
            </button>
          ))}
        </div>
      </aside>
    </div>
  );

  const renderFriends = () => (
    <div className="social-layout-grid">
      <section className="social-feed-column">
        {incomingRequests.length > 0 && (
          <div className="social-block">
            <div className="social-section-heading"><div><span className="social-eyebrow"><UserPlus /> Pedidos recebidos</span><h2>Querem assistir com você</h2></div><span>{incomingRequests.length}</span></div>
            <div className="social-person-grid">
              {incomingRequests.map((request) => (
                <article key={request.id} className="social-person-card">
                  <UserAvatar src={request.fromUser.avatar || ''} name={request.fromUser.displayName} size="lg" showBorder />
                  <strong>{request.fromUser.displayName}</strong><span>@{request.fromUser.username}</span><p>{request.fromUser.bio}</p>
                  <div className="social-person-card__actions"><button type="button" className="button-primary" onClick={() => void runSocialAction(() => SocialService.acceptFriendRequest(request.id), { title: 'Amizade confirmada' })}><Check /> Aceitar</button><button type="button" className="button-secondary" onClick={() => void runSocialAction(() => SocialService.declineFriendRequest(request.id))}><X /> Recusar</button></div>
                </article>
              ))}
            </div>
          </div>
        )}

        <div className="social-block">
          <div className="social-section-heading"><div><span className="social-eyebrow"><Users /> Seus amigos</span><h2>Conexões confirmadas</h2></div><span>{friends.length}</span></div>
          <div className="social-person-grid">
            {friends.map((friend) => (
              <article key={friend.id} className="social-person-card">
                <div className="relative"><UserAvatar src={friend.user.avatar || ''} name={friend.user.displayName} size="lg" showBorder />{friend.user.isOnline && <i className="social-online-dot" />}</div>
                <strong>{friend.user.displayName}</strong><span>@{friend.user.username}</span><p>{friend.user.bio}</p>
                <small className="social-person-card__meta">{friend.user.watchedCount || 0} títulos assistidos</small>
                <div className="social-person-card__actions">
                  <button
                    type="button"
                    className="button-primary social-person-card__action-button social-person-card__action-button--primary"
                    onClick={() => {
                      setCommunityTab('messages');
                      void runSocialAction(async () => {
                        const conversationId = await SocialService.ensureConversation(friend.user);
                        setSelectedConversationId(conversationId);
                      });
                    }}
                  >
                    <MessageCircle />
                    <span>Conversar</span>
                  </button>
                  <button
                    type="button"
                    className="button-secondary social-person-card__action-button social-person-card__action-button--secondary"
                    onClick={() => setProfilePreview(friend.user)}
                  >
                    <Eye />
                    <span>Ver perfil</span>
                  </button>
                </div>
                <button type="button" className="social-remove-link social-remove-link--friend" onClick={() => void runSocialAction(() => SocialService.removeFriend(friend.user.id), { title: 'Amizade removida' })}>Remover amizade</button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <aside className="social-side-column">
        <div className="social-side-card">
          <h3>Encontrar pessoas</h3>
          <label className="social-search-field"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nome ou usuário" /></label>
          <div className="social-suggestion-list">
            {filteredSuggestions.map((user) => (
              <div key={user.id} className="social-person-row">
                <UserAvatar src={user.avatar || ''} name={user.displayName} size="sm" showBorder />
                <span><strong>{user.displayName}</strong><small>{user.mutualFriends || 0} amigos em comum</small></span>
                <button type="button" disabled={pendingOutgoingIds.has(user.id)} onClick={() => void runSocialAction(() => SocialService.sendFriendRequest(user, userProfile), { title: 'Pedido enviado', description: `Pedido enviado para ${user.displayName}.` })}>{pendingOutgoingIds.has(user.id) ? <Check /> : <Plus />}</button>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );

  const renderGroups = () => (
    <div className="social-chat-layout">
      <aside className="social-chat-sidebar">
        <div className="social-section-heading"><div><span className="social-eyebrow"><Users /> Clubes e salas</span><h2>Grupos</h2></div><button type="button" className="social-icon-action" onClick={() => setShowCreateGroup(true)}><Plus /></button></div>
        <div className="social-chat-list">
          {groups.map((group) => {
            const isMember = group.memberIds.includes(userProfile.id);
            return (
              <button type="button" key={group.id} className={selectedGroupId === group.id ? 'is-active' : ''} onClick={() => setSelectedGroupId(group.id)}>
                <span className="social-group-avatar">{group.privacy === 'private' ? <Lock /> : <Globe2 />}</span>
                <span><strong>{group.name}</strong><small>{group.memberIds.length} membros · {isMember ? 'Você participa' : 'Descobrir'}</small></span>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="social-chat-panel">
        {selectedGroup ? (
          <>
            <header className="social-chat-panel__header">
              <div><span className="social-group-avatar"><Users /></span><div><strong>{selectedGroup.name}</strong><span>{selectedGroup.description}</span></div></div>
              {selectedGroup.memberIds.includes(userProfile.id) ? <button type="button" className="button-secondary" onClick={() => void runSocialAction(() => SocialService.leaveGroup(selectedGroup.id, userProfile), { title: 'Você saiu do grupo' })}>Sair</button> : <button type="button" className="button-primary" onClick={() => void runSocialAction(() => SocialService.joinGroup(selectedGroup.id, userProfile), { title: 'Você entrou no grupo' })}>Participar</button>}
            </header>
            <div className="social-group-watchlist">
              <div><strong>Lista coletiva</strong><span>{selectedGroup.watchlist.length} títulos indicados</span></div>
              <div>{selectedGroup.watchlist.slice(0, 5).map((media) => <button type="button" key={`${media.media_type}-${media.id}`} onClick={() => onSelectMedia(media)}><img src={getPosterUrl(media.poster_path, 'w185')} alt={media.title || media.name} /></button>)}</div>
            </div>
            <div className="social-message-stream">
              {selectedGroup.messages.length === 0 ? <div className="social-empty-state compact"><MessageCircle /><strong>Sem mensagens ainda</strong><span>Comece a conversa deste grupo.</span></div> : selectedGroup.messages.map((item) => <div key={item.id} className={`social-message ${item.author.id === userProfile.id ? 'is-mine' : ''}`}><UserAvatar src={item.author.avatar || ''} name={item.author.displayName} size="sm" showBorder /><div><header><strong>{item.author.displayName}</strong><time>{relativeTime(item.createdAt)}</time></header><p>{item.text}</p></div></div>)}
            </div>
            {selectedGroup.memberIds.includes(userProfile.id) && <div className="social-chat-composer"><input value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && void handleSendGroupMessage()} placeholder="Mensagem para o grupo..." /><button type="button" onClick={() => void handleSendGroupMessage()}><Send /></button></div>}
          </>
        ) : <div className="social-empty-state"><Users /><strong>Escolha um grupo</strong><span>Abra uma sala para acompanhar mensagens e listas coletivas.</span></div>}
      </section>

      {showCreateGroup && (
        <div className="social-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setShowCreateGroup(false)}>
          <section className="social-modal compact-modal"><button type="button" className="social-modal__close" onClick={() => setShowCreateGroup(false)}><X /></button><div className="social-modal__header"><span className="social-eyebrow"><Users /> Novo grupo</span><h2>Criar espaço de cinema</h2><p>Organize conversas, listas e roletas coletivas.</p></div><label className="social-form-field"><span>Nome</span><input value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="Ex.: Terror de Sexta" /></label><label className="social-form-field"><span>Descrição</span><textarea value={groupDescription} onChange={(event) => setGroupDescription(event.target.value)} placeholder="Qual é o objetivo do grupo?" /></label><div className="social-choice-row"><button type="button" className={groupPrivacy === 'public' ? 'is-active' : ''} onClick={() => setGroupPrivacy('public')}><Globe2 /> Público</button><button type="button" className={groupPrivacy === 'private' ? 'is-active' : ''} onClick={() => setGroupPrivacy('private')}><Lock /> Privado</button></div><div className="social-modal__actions"><button type="button" className="button-secondary" onClick={() => setShowCreateGroup(false)}>Cancelar</button><button type="button" className="button-primary" onClick={() => void handleCreateGroup()} disabled={!groupName.trim()}><Plus /> Criar grupo</button></div></section>
        </div>
      )}
    </div>
  );

  const renderMessages = () => (
    <div className="social-chat-layout">
      <aside className="social-chat-sidebar">
        <div className="social-section-heading"><div><span className="social-eyebrow"><MessageCircle /> Privado</span><h2>Conversas</h2></div></div>
        <div className="social-chat-list">{conversations.map((conversation) => <button type="button" key={conversation.id} className={selectedConversationId === conversation.id ? 'is-active' : ''} onClick={() => setSelectedConversationId(conversation.id)}><UserAvatar src={conversation.participant.avatar || ''} name={conversation.participant.displayName} size="sm" showBorder /><span><strong>{conversation.participant.displayName}</strong><small>{conversation.messages.at(-1)?.text || 'Nova conversa'}</small></span>{conversation.participant.isOnline && <i />}</button>)}</div>
      </aside>
      <section className="social-chat-panel">
        {selectedConversation ? <><header className="social-chat-panel__header"><div><UserAvatar src={selectedConversation.participant.avatar || ''} name={selectedConversation.participant.displayName} size="md" showBorder /><div><strong>{selectedConversation.participant.displayName}</strong><span>{selectedConversation.participant.isOnline ? 'Online agora' : `@${selectedConversation.participant.username}`}</span></div></div></header><div className="social-message-stream">{selectedConversation.messages.map((item) => <div key={item.id} className={`social-message ${item.author.id === userProfile.id ? 'is-mine' : ''}`}><UserAvatar src={item.author.avatar || ''} name={item.author.displayName} size="sm" showBorder /><div><header><strong>{item.author.displayName}</strong><time>{relativeTime(item.createdAt)}</time></header><p>{item.text}</p>{item.media && <MediaMiniCard media={item.media} onClick={() => onSelectMedia(item.media!)} />}</div></div>)}</div><div className="social-chat-composer"><input value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && void handleSendDirectMessage()} placeholder="Escreva uma mensagem..." /><button type="button" onClick={() => void handleSendDirectMessage()}><Send /></button></div></> : <div className="social-empty-state"><MessageCircle /><strong>Escolha uma conversa</strong><span>Troque recomendações e planeje a próxima sessão.</span></div>}
      </section>
    </div>
  );

  const renderRecommendations = () => {
    const incoming = recommendations.filter((item) => item.recipientId === userProfile.id);
    const outgoing = recommendations.filter((item) => item.sender.id === userProfile.id);

    return (
      <div className="social-recommendation-columns">
        <section className="social-block">
          <div className="social-section-heading">
            <div><span className="social-eyebrow"><Sparkles /> Para você</span><h2>Recomendações recebidas</h2></div>
            <span>{incoming.length}</span>
          </div>
          <div className="social-recommendation-list">
            {incoming.length === 0 ? (
              <div className="social-empty-state compact">
                <Sparkles />
                <strong>Nenhuma indicação nova</strong>
                <span>As recomendações dos seus amigos aparecerão aqui.</span>
              </div>
            ) : incoming.map((item) => (
              <article key={item.id} className="social-recommendation-card">
                <UserAvatar src={item.sender.avatar || ''} name={item.sender.displayName} size="sm" showBorder />
                <div className="min-w-0 flex-1">
                  <header><strong>{item.sender.displayName}</strong><span>{relativeTime(item.createdAt)}</span></header>
                  {item.message && <blockquote>“{item.message}”</blockquote>}
                  <MediaMiniCard media={item.media} onClick={() => onSelectMedia(item.media)} />
                  <div className="social-recommendation-actions">
                    <button type="button" className="button-primary" onClick={() => {
                      void runSocialAction(() => SocialService.updateRecommendationStatus(item.id, 'saved'));
                      onAddToWatchlist?.(item.media);
                      onAddToast?.('Adicionado à lista', item.media.title || item.media.name, 'success');
                    }}>Adicionar à lista</button>
                    <button type="button" className="button-secondary" onClick={() => void runSocialAction(() => SocialService.updateRecommendationStatus(item.id, 'dismissed'))}>Agora não</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="social-block">
          <div className="social-section-heading">
            <div><span className="social-eyebrow"><Send /> Enviadas</span><h2>Suas recomendações</h2></div>
            <span>{outgoing.length}</span>
          </div>
          <div className="social-recommendation-list">
            {outgoing.length === 0 ? (
              <div className="social-empty-state compact">
                <Send />
                <strong>Nenhuma recomendação enviada</strong>
                <span>Abra um filme ou série e recomende para um amigo ou grupo.</span>
              </div>
            ) : outgoing.map((item) => (
              <article key={item.id} className="social-recommendation-card compact">
                <div className="min-w-0 flex-1">
                  <header><strong>Para {item.recipientName}</strong><span>{item.status}</span></header>
                  <MediaMiniCard media={item.media} onClick={() => onSelectMedia(item.media)} />
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    );
  };

  return (
    <div className={`social-page social-page--${activeTab}`}>
      <section className="social-hero">
        <div><span className="social-eyebrow"><Users /> Rede social de cinema</span><h1>Comunidade VIDARIX</h1><p>Adicione amigos, recomende títulos, participe de grupos e converse sem perder o controle dos spoilers.</p></div>
        <div className="social-hero__avatars">{friends.slice(0, 4).map((friend) => <UserAvatar key={friend.id} src={friend.user.avatar || ''} name={friend.user.displayName} size="md" showBorder />)}<span>+{Math.max(0, users.length - 4)}</span></div>
      </section>

      <nav className="social-tabs" aria-label="Seções da comunidade">{tabs.map(({ id, label, icon: Icon }) => <button type="button" key={id} className={activeTab === id ? 'is-active' : ''} onClick={() => setCommunityTab(id)} aria-current={activeTab === id ? 'page' : undefined}><Icon /> {label}{id === 'friends' && incomingRequests.length > 0 ? <i>{incomingRequests.length}</i> : null}</button>)}</nav>

      <div className="social-page__content">
        {activeTab === 'feed' && renderFeed()}
        {activeTab === 'friends' && renderFriends()}
        {activeTab === 'groups' && renderGroups()}
        {activeTab === 'messages' && renderMessages()}
        {activeTab === 'recommendations' && renderRecommendations()}
      </div>

      {profilePreview && (
        <div className="social-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setProfilePreview(null)}>
          <section className="social-modal social-friend-profile" role="dialog" aria-modal="true">
            <button type="button" className="social-modal__close" onClick={() => setProfilePreview(null)}><X /></button>
            <div className="social-friend-profile__hero">
              <UserAvatar src={profilePreview.avatar || ''} name={profilePreview.displayName} size="xl" showBorder borderColor="border-[#EC4899]" />
              <div><span className="social-eyebrow"><Users /> Perfil de amigo</span><h2>{profilePreview.displayName}</h2><strong>@{profilePreview.username}</strong><p>{profilePreview.bio}</p></div>
            </div>
            <div className="social-metrics"><div><strong>{profilePreview.watchedCount || 0}</strong><span>assistidos</span></div><div><strong>{profilePreview.mutualFriends || 0}</strong><span>em comum</span></div><div><strong>{profilePreview.recentWatched?.length || 0}</strong><span>recentes</span></div></div>
            <div className="social-friend-profile__watched"><h3>Assistidos recentemente</h3><div>{profilePreview.recentWatched?.length ? profilePreview.recentWatched.map((media) => <button type="button" key={`${media.media_type}-${media.id}`} onClick={() => { setProfilePreview(null); onSelectMedia(media); }}><img src={getPosterUrl(media.poster_path, 'w342')} alt={media.title || media.name} /><span>{media.title || media.name}</span></button>) : <div className="social-empty-state compact"><Eye /><strong>Nenhum título público</strong><span>Este usuário ainda não compartilhou sua atividade.</span></div>}</div></div>
            <div className="social-modal__actions"><button type="button" className="button-secondary" onClick={() => setProfilePreview(null)}>Fechar</button><button type="button" className="button-primary" onClick={() => {
              const friend = profilePreview;
              setProfilePreview(null);
              setCommunityTab('messages');
              void runSocialAction(async () => {
                const conversationId = await SocialService.ensureConversation(friend);
                setSelectedConversationId(conversationId);
              });
            }}><MessageCircle /> Conversar</button></div>
          </section>
        </div>
      )}
    </div>
  );
};
