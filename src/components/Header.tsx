import React, { useEffect, useState } from 'react';
import { Bell, Bookmark, Film, Home, Search, Sparkles, Tv, Users } from 'lucide-react';
import { SocialNotification, UserProfile } from '../types';
import { UserAvatar } from './UserAvatar';
import { ProfileMenu } from './ProfileMenu';
import { NotificationPanel } from './NotificationPanel';

interface HeaderProps {
  currentPath: string;
  userProfile: UserProfile;
  isAuthenticated: boolean;
  onNavigate: (path: string) => void;
  onOpenSearch: () => void;
  onLogout: () => void | Promise<void>;
  notifications?: SocialNotification[];
  onMarkNotificationRead?: (id: string) => void;
  onMarkAllNotificationsRead?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPath,
  userProfile,
  isAuthenticated,
  onNavigate,
  onOpenSearch,
  onLogout,
  notifications = [],
  onMarkNotificationRead = () => {},
  onMarkAllNotificationsRead = () => {}
}) => {
  const [scrolled, setScrolled] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 18);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navItems = [
    { label: 'Início', path: '/', icon: Home },
    { label: 'Filmes', path: '/filmes', icon: Film },
    { label: 'Séries', path: '/series', icon: Tv },
    { label: 'Roleta', path: '/roleta', icon: Sparkles },
    { label: 'Comunidade', path: '/comunidade', icon: Users },
    { label: 'Minha Lista', path: '/minha-lista', icon: Bookmark }
  ];

  const navigate = (path: string) => {
    onNavigate(path);
    setNotificationsOpen(false);
    setProfileMenuOpen(false);
  };

  const unreadNotifications = notifications.filter((notification) => !notification.read).length;

  return (
    <header className={`vidarix-header ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="vidarix-header__inner">
        <button className="vidarix-header__brand" onClick={() => navigate('/')} aria-label="Ir para o início">
          <img src="/brand/vidarix-logo-horizontal.png" alt="VIDARIX" />
        </button>

        <nav className="vidarix-header__nav" aria-label="Navegação principal">
          {navItems.map(({ label, path, icon: Icon }) => {
            const active = path === '/'
              ? currentPath === '/' || currentPath === '/inicio'
              : currentPath.startsWith(path);

            return (
              <button
                key={path}
                className={active ? 'is-active' : ''}
                onClick={() => navigate(path)}
                aria-current={active ? 'page' : undefined}
              >
                <Icon aria-hidden="true" />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        <div className="vidarix-header__actions">
          <button className="vidarix-header__search" onClick={onOpenSearch} aria-label="Pesquisar filmes e séries">
            <span>Buscar títulos, atores, gêneros...</span>
            <Search aria-hidden="true" />
          </button>

          <div className="relative">
            <button
              className="vidarix-header__icon-button social-notification-trigger"
              type="button"
              aria-label="Notificações"
              aria-expanded={notificationsOpen}
              onClick={() => {
                setNotificationsOpen((open) => !open);
                setProfileMenuOpen(false);
              }}
            >
              <Bell aria-hidden="true" />
              {unreadNotifications > 0 && <span>{Math.min(unreadNotifications, 9)}</span>}
            </button>
            <NotificationPanel
              isOpen={notificationsOpen}
              notifications={notifications}
              onClose={() => setNotificationsOpen(false)}
              onMarkRead={onMarkNotificationRead}
              onMarkAllRead={onMarkAllNotificationsRead}
              onNavigate={navigate}
            />
          </div>

          <div className="relative">
            <button
              className="vidarix-header__profile"
              onClick={() => {
                setProfileMenuOpen((open) => !open);
                setNotificationsOpen(false);
              }}
              aria-expanded={profileMenuOpen}
              aria-haspopup="menu"
              aria-label={isAuthenticated ? 'Abrir menu da conta' : 'Entrar ou criar conta'}
            >
              <UserAvatar
                src={userProfile.photoURL || userProfile.avatar}
                name={userProfile.displayName || userProfile.fullName || userProfile.name}
                size="sm"
                showBorder
                borderColor={isAuthenticated ? 'border-[#8B5CF6]' : 'border-white/20'}
              />
            </button>

            <ProfileMenu
              isOpen={profileMenuOpen}
              onClose={() => setProfileMenuOpen(false)}
              userProfile={userProfile}
              isAuthenticated={isAuthenticated}
              onNavigate={navigate}
              onLogout={onLogout}
            />
          </div>
        </div>
      </div>
    </header>
  );
};
