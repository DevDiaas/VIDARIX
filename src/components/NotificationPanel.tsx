import React, { useEffect, useRef } from 'react';
import { Bell, CheckCheck, MessageCircle, Sparkles, UserPlus, Users, X } from 'lucide-react';
import { SocialNotification } from '../types';
import { UserAvatar } from './UserAvatar';

interface NotificationPanelProps {
  isOpen: boolean;
  notifications: SocialNotification[];
  onClose: () => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onNavigate: (path: string) => void;
}

const iconFor = (category: SocialNotification['category']) => {
  if (category === 'friendship') return UserPlus;
  if (category === 'group') return Users;
  if (category === 'message' || category === 'comment') return MessageCircle;
  if (category === 'recommendation') return Sparkles;
  return Bell;
};

const relativeTime = (date: string) => {
  const diff = Math.max(0, Date.now() - new Date(date).getTime());
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return `${days} d`;
};

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  isOpen,
  notifications,
  onClose,
  onMarkRead,
  onMarkAllRead,
  onNavigate
}) => {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointer = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) onClose();
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const unread = notifications.filter((item) => !item.read).length;

  return (
    <div ref={panelRef} className="social-notification-panel" role="dialog" aria-label="Notificações">
      <div className="social-notification-panel__header">
        <div>
          <span className="social-eyebrow"><Bell /> Central social</span>
          <h3>Notificações</h3>
          <p>{unread > 0 ? `${unread} nova${unread > 1 ? 's' : ''}` : 'Tudo em dia'}</p>
        </div>
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <button type="button" onClick={onMarkAllRead} className="social-icon-action" title="Marcar todas como lidas">
              <CheckCheck />
            </button>
          )}
          <button type="button" onClick={onClose} className="social-icon-action" aria-label="Fechar notificações">
            <X />
          </button>
        </div>
      </div>

      <div className="social-notification-panel__list">
        {notifications.length === 0 ? (
          <div className="social-empty-state compact">
            <Bell />
            <strong>Nenhuma notificação</strong>
            <span>Pedidos, recomendações e mensagens aparecerão aqui.</span>
          </div>
        ) : (
          notifications.map((notification) => {
            const Icon = iconFor(notification.category);
            return (
              <button
                type="button"
                key={notification.id}
                className={`social-notification-item ${notification.read ? '' : 'is-unread'}`}
                onClick={() => {
                  onMarkRead(notification.id);
                  if (notification.targetPath) onNavigate(notification.targetPath);
                  onClose();
                }}
              >
                {notification.actor ? (
                  <UserAvatar
                    src={notification.actor.avatar || ''}
                    name={notification.actor.displayName}
                    size="sm"
                    showBorder
                    borderColor="border-[#8B5CF6]"
                  />
                ) : (
                  <span className="social-notification-item__icon"><Icon /></span>
                )}
                <span className="min-w-0 flex-1 text-left">
                  <strong>{notification.title}</strong>
                  <span>{notification.description}</span>
                  <small>{relativeTime(notification.createdAt)}</small>
                </span>
                {!notification.read && <i aria-label="Não lida" />}
              </button>
            );
          })
        )}
      </div>

      <button
        type="button"
        className="social-notification-panel__footer"
        onClick={() => {
          onNavigate('/comunidade');
          onClose();
        }}
      >
        Abrir Comunidade
      </button>
    </div>
  );
};
