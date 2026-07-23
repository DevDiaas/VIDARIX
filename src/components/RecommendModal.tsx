import React, { useMemo, useState } from 'react';
import { Check, Search, Send, Sparkles, Users, X } from 'lucide-react';
import { CommunityGroup, Friendship, MediaItem, UserProfile } from '../types';
import { SocialService } from '../services/socialService';
import { UserAvatar } from './UserAvatar';
import { getPosterUrl } from '../services/tmdbApi';

interface RecommendModalProps {
  isOpen: boolean;
  media: MediaItem;
  userProfile: UserProfile;
  onClose: () => void;
  onSent?: (count: number) => void;
}

export const RecommendModal: React.FC<RecommendModalProps> = ({ isOpen, media, userProfile, onClose, onSent }) => {
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  const friends = useMemo<Friendship[]>(() => SocialService.getFriends(), [isOpen]);
  const groups = useMemo<CommunityGroup[]>(() => SocialService.getGroups().filter((group) => group.memberIds.includes(userProfile.id)), [isOpen, userProfile.id]);

  if (!isOpen) return null;

  const normalized = query.trim().toLowerCase();
  const friendOptions = friends.filter((friend) => !normalized || `${friend.user.displayName} ${friend.user.username}`.toLowerCase().includes(normalized));
  const groupOptions = groups.filter((group) => !normalized || group.name.toLowerCase().includes(normalized));

  const toggle = (key: string) => {
    setSelected((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));
  };

  const handleSend = () => {
    const recipients = selected
      .map((key) => {
        const [type, id] = key.split(':');
        if (type === 'user') {
          const friend = friends.find((item) => item.user.id === id);
          return friend ? { id, name: friend.user.displayName, type: 'user' as const } : null;
        }
        const group = groups.find((item) => item.id === id);
        return group ? { id, name: group.name, type: 'group' as const } : null;
      })
      .filter(Boolean) as Array<{ id: string; name: string; type: 'user' | 'group' }>;

    if (recipients.length === 0) return;
    SocialService.sendRecommendation(media, recipients, message, userProfile);
    onSent?.(recipients.length);
    setSelected([]);
    setMessage('');
    setQuery('');
    onClose();
  };

  return (
    <div className="social-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="social-modal social-recommend-modal" role="dialog" aria-modal="true" aria-labelledby="recommend-title">
        <button type="button" className="social-modal__close" onClick={onClose} aria-label="Fechar"><X /></button>

        <div className="social-modal__header">
          <span className="social-eyebrow"><Sparkles /> Recomendação VIDARIX</span>
          <h2 id="recommend-title">Recomendar para amigos</h2>
          <p>Envie este título para pessoas ou grupos da sua comunidade.</p>
        </div>

        <div className="social-recommend-media">
          <img src={getPosterUrl(media.poster_path, 'w185')} alt={media.title || media.name} />
          <div>
            <strong>{media.title || media.name}</strong>
            <span>{media.media_type === 'tv' ? 'Série' : 'Filme'} · Nota {media.vote_average?.toFixed(1) || '—'}</span>
          </div>
        </div>

        <label className="social-search-field">
          <Search />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar amigo ou grupo..." />
        </label>

        <div className="social-recipient-list">
          {friendOptions.length > 0 && <h4>Amigos</h4>}
          {friendOptions.map((friend) => {
            const key = `user:${friend.user.id}`;
            const active = selected.includes(key);
            return (
              <button type="button" key={key} onClick={() => toggle(key)} className={`social-recipient ${active ? 'is-selected' : ''}`}>
                <UserAvatar src={friend.user.avatar || ''} name={friend.user.displayName} size="sm" showBorder />
                <span><strong>{friend.user.displayName}</strong><small>@{friend.user.username}</small></span>
                <i>{active ? <Check /> : null}</i>
              </button>
            );
          })}

          {groupOptions.length > 0 && <h4>Grupos</h4>}
          {groupOptions.map((group) => {
            const key = `group:${group.id}`;
            const active = selected.includes(key);
            return (
              <button type="button" key={key} onClick={() => toggle(key)} className={`social-recipient ${active ? 'is-selected' : ''}`}>
                <span className="social-recipient__group"><Users /></span>
                <span><strong>{group.name}</strong><small>{group.memberIds.length} membros</small></span>
                <i>{active ? <Check /> : null}</i>
              </button>
            );
          })}
        </div>

        <label className="social-message-field">
          <span>Mensagem opcional</span>
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={220} placeholder="Por que essa pessoa deveria assistir?" />
          <small>{message.length}/220</small>
        </label>

        <div className="social-modal__actions">
          <button type="button" className="button-secondary" onClick={onClose}>Cancelar</button>
          <button type="button" className="button-primary" disabled={selected.length === 0} onClick={handleSend}>
            <Send /> Enviar para {selected.length || 0}
          </button>
        </div>
      </section>
    </div>
  );
};
