import React, { useEffect, useMemo, useState } from 'react';
import { Heart, MessageCircle, Send, ShieldAlert, Sparkles, Star, Users } from 'lucide-react';
import { MediaItem, TitleDiscussionEntry, UserProfile } from '../types';
import { SocialService } from '../services/socialService';
import { UserAvatar } from './UserAvatar';

interface TitleCommunityProps {
  media: MediaItem;
  userProfile: UserProfile;
}

const formatTime = (date: string) =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(date));

export const TitleCommunity: React.FC<TitleCommunityProps> = ({ media, userProfile }) => {
  const [activeTab, setActiveTab] = useState<'comment' | 'chat' | 'theory' | 'review'>('comment');
  const [entries, setEntries] = useState<TitleDiscussionEntry[]>([]);
  const [text, setText] = useState('');
  const [spoiler, setSpoiler] = useState(false);
  const [rating, setRating] = useState(0);
  const [revealed, setRevealed] = useState<string[]>([]);

  const refresh = () => setEntries(SocialService.getTitleDiscussion(media));

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener('vidarix-social-updated', handler);
    return () => window.removeEventListener('vidarix-social-updated', handler);
  }, [media.id, media.media_type]);

  const filtered = useMemo(() => entries.filter((entry) => entry.kind === activeTab), [entries, activeTab]);

  const handleSubmit = () => {
    SocialService.addTitleDiscussion(media, { text, kind: activeTab, spoiler, rating: activeTab === 'review' ? rating : undefined }, userProfile);
    setText('');
    setSpoiler(false);
    setRating(0);
    refresh();
  };

  const tabs = [
    { id: 'comment' as const, label: 'Comentários', icon: MessageCircle },
    { id: 'chat' as const, label: 'Chat do título', icon: Users },
    { id: 'theory' as const, label: 'Teorias', icon: Sparkles },
    { id: 'review' as const, label: 'Avaliações', icon: Star }
  ];

  return (
    <section className="title-community" aria-labelledby="title-community-heading">
      <div className="title-community__header">
        <div>
          <span className="social-eyebrow"><Users /> Comunidade do título</span>
          <h3 id="title-community-heading">Converse sobre {media.title || media.name}</h3>
          <p>Comentários, teorias e avaliações com proteção contra spoilers.</p>
        </div>
        <span className="title-community__count">{entries.length} participação{entries.length === 1 ? '' : 'ões'}</span>
      </div>

      <div className="title-community__tabs" role="tablist">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" className={activeTab === id ? 'is-active' : ''} onClick={() => setActiveTab(id)}>
            <Icon /> {label}
          </button>
        ))}
      </div>

      <div className="title-community__composer">
        {activeTab === 'review' && (
          <div className="title-community__rating">
            <span>Sua nota</span>
            <div>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                <button type="button" key={value} className={value <= rating ? 'is-active' : ''} onClick={() => setRating(value)}>{value}</button>
              ))}
            </div>
          </div>
        )}
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={activeTab === 'chat' ? 'Envie uma mensagem para quem está falando deste título...' : 'Compartilhe sua opinião com respeito...'}
          maxLength={500}
        />
        <div className="title-community__composer-footer">
          <label>
            <input type="checkbox" checked={spoiler} onChange={(event) => setSpoiler(event.target.checked)} />
            <ShieldAlert /> Contém spoiler
          </label>
          <span>{text.length}/500</span>
          <button type="button" className="button-primary" onClick={handleSubmit} disabled={!text.trim() || (activeTab === 'review' && rating === 0)}>
            <Send /> Publicar
          </button>
        </div>
      </div>

      <div className="title-community__entries">
        {filtered.length === 0 ? (
          <div className="social-empty-state compact">
            <MessageCircle />
            <strong>Comece a conversa</strong>
            <span>Seja a primeira pessoa a participar nesta seção.</span>
          </div>
        ) : (
          filtered.map((entry) => {
            const isRevealed = revealed.includes(entry.id) || !entry.spoiler;
            const liked = entry.likes?.includes(userProfile.id);
            return (
              <article key={entry.id} className="title-community-entry">
                <UserAvatar src={entry.author.avatar || ''} name={entry.author.displayName} size="sm" showBorder />
                <div className="min-w-0 flex-1">
                  <header>
                    <div><strong>{entry.author.displayName}</strong><span>@{entry.author.username}</span></div>
                    <time>{formatTime(entry.createdAt)}</time>
                  </header>
                  {entry.rating ? <div className="title-community-entry__rating"><Star /> {entry.rating}/10</div> : null}
                  {entry.spoiler && !isRevealed ? (
                    <button type="button" className="title-community-entry__spoiler" onClick={() => setRevealed((items) => [...items, entry.id])}>
                      <ShieldAlert /> Este conteúdo tem spoiler. Clique para revelar.
                    </button>
                  ) : (
                    <p>{entry.text}</p>
                  )}
                  <footer>
                    <button type="button" className={liked ? 'is-liked' : ''} onClick={() => SocialService.toggleDiscussionLike(entry.id, userProfile)}>
                      <Heart /> {entry.likes?.length || 0}
                    </button>
                  </footer>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
};
