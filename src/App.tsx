import React, { useEffect, useMemo, useState } from 'react';
import { MediaItem, SocialNotification, ToastMessage, UserProfile, UserWatchlistItem } from './types';
import { StorageService } from './services/storageService';
import { SupabaseService } from './services/supabaseService';
import { fetchByProvider, fetchPopular, fetchTopRated, fetchTrending } from './services/tmdbApi';
import { Header } from './components/Header';
import { MobileNavigation } from './components/MobileNavigation';
import { Footer } from './components/Footer';
import { SearchModal } from './components/SearchModal';
import { MovieDetails } from './components/MovieDetails';
import { Toast } from './components/Toast';

import { HomePage } from './pages/HomePage';
import { CatalogPage } from './pages/CatalogPage';
import { RoulettePage } from './pages/RoulettePage';
import { WatchlistPage } from './pages/WatchlistPage';
import { ProfilePage } from './pages/ProfilePage';
import { EditProfilePage } from './pages/EditProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { AuthPage } from './pages/AuthPage';
import { LegalPage } from './pages/LegalPage';
import { CommunityPage } from './pages/CommunityPage';
import { SocialService } from './services/socialService';
import { AuthProvider, useAuth } from './context/AuthContext';

const AUTH_PATHS = ['/entrar', '/criar-conta', '/recuperar-senha', '/redefinir-senha'];

function MainAppContent() {
  const {
    user,
    profile: userProfile,
    updateProfile,
    signOut,
    isAuthenticated,
    isLoading: isAuthLoading
  } = useAuth();

  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname || '/');
  const [selectedMediaDetail, setSelectedMediaDetail] = useState<{ id: number; type: 'movie' | 'tv' } | null>(null);

  const [watchlist, setWatchlist] = useState<UserWatchlistItem[]>(StorageService.getWatchlist());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [socialNotifications, setSocialNotifications] = useState<SocialNotification[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const [trending, setTrending] = useState<MediaItem[]>([]);
  const [popularMovies, setPopularMovies] = useState<MediaItem[]>([]);
  const [popularTv, setPopularTv] = useState<MediaItem[]>([]);
  const [topRated, setTopRated] = useState<MediaItem[]>([]);
  const [netflixMedia, setNetflixMedia] = useState<MediaItem[]>([]);
  const [primeMedia, setPrimeMedia] = useState<MediaItem[]>([]);
  const [disneyMedia, setDisneyMedia] = useState<MediaItem[]>([]);
  const [maxMedia, setMaxMedia] = useState<MediaItem[]>([]);

  const isAuthPath = AUTH_PATHS.includes(currentPath);
  const savedIds = new Set(watchlist.map((item) => item.mediaId));

  useEffect(() => {
    if (user) {
      SupabaseService.fetchWatchlist(user.id).then((items) => {
        setWatchlist(items.length > 0 ? items : StorageService.getWatchlist());
      });
    } else {
      setWatchlist(StorageService.getWatchlist());
    }
  }, [user]);

  useEffect(() => {
    let isMounted = true;

    const loadAllData = async () => {
      const [tr, pm, pt, rated, net, prime, disney, max] = await Promise.all([
        fetchTrending('all'),
        fetchPopular('movie'),
        fetchPopular('tv'),
        fetchTopRated('movie'),
        fetchByProvider(8, 'movie'),
        fetchByProvider(119, 'movie'),
        fetchByProvider(337, 'movie'),
        fetchByProvider(1899, 'movie')
      ]);

      if (!isMounted) return;

      setTrending(tr);
      setPopularMovies(pm);
      setPopularTv(pt);
      setTopRated(rated);
      setNetflixMedia(net);
      setPrimeMedia(prime);
      setDisneyMedia(disney);
      setMaxMedia(max);
    };

    loadAllData();
    return () => {
      isMounted = false;
    };
  }, []);

  const addToast = (
    title: string,
    description?: string,
    type: 'success' | 'info' | 'warning' | 'error' = 'success'
  ) => {
    setToasts((current) => [
      ...current,
      {
        id: `toast_${Date.now()}`,
        title,
        description,
        type
      }
    ]);
  };

  const dismissToast = (id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  };

  const handleNavigate = (path: string) => {
    const [cleanPath, query = ''] = path.split('?');
    const targetUrl = query ? `${cleanPath}?${query}` : cleanPath;

    if (`${window.location.pathname}${window.location.search}` !== targetUrl) {
      window.history.pushState({}, '', targetUrl);
    }

    setCurrentPath(cleanPath || '/');
    window.dispatchEvent(new CustomEvent('vidarix-navigate', { detail: { path: cleanPath, query } }));
    setSelectedMediaDetail(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated && (currentPath === '/entrar' || currentPath === '/criar-conta')) {
      handleNavigate('/inicio');
    }
  }, [currentPath, isAuthenticated, isAuthLoading]);

  const handleSelectMedia = (item: MediaItem) => {
    setSelectedMediaDetail({ id: item.id, type: item.media_type });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleWatchlist = (
    item: MediaItem,
    statusOrEvent: 'watchlist' | 'watched' | React.MouseEvent = 'watchlist',
    userRating?: number,
    userNote?: string
  ) => {
    let targetStatus: 'watchlist' | 'watched' = 'watchlist';

    if (statusOrEvent === 'watched' || statusOrEvent === 'watchlist') {
      targetStatus = statusOrEvent;
    } else if (typeof statusOrEvent !== 'string') {
      statusOrEvent.stopPropagation();
    }

    const isAlreadySaved = StorageService.isSaved(item.id, item.media_type, targetStatus);

    if (isAlreadySaved) {
      const updated = StorageService.removeFromWatchlist(item.id, item.media_type);
      setWatchlist(updated);
      if (user) SupabaseService.removeWatchlistItem(user.id, item.id, item.media_type);
      addToast('Removido da lista', item.title || item.name, 'info');
      return;
    }

    const updated = StorageService.addToWatchlist(item, targetStatus, userRating, userNote);
    setWatchlist(updated);

    if (user) {
      SupabaseService.saveWatchlistItem(user.id, item, targetStatus, userRating, userNote);
    }

    addToast(
      targetStatus === 'watched' ? 'Marcado como assistido' : 'Adicionado a Quero Assistir',
      item.title || item.name,
      'success'
    );
  };

  const handleUpdateProfile = (updated: Partial<UserProfile>) => {
    updateProfile(updated);
  };

  const handleLogout = async () => {
    await signOut();
    addToast('Sessão encerrada', 'Você saiu da sua conta VIDARIX.', 'info');
    handleNavigate('/');
  };

  const allMedia = useMemo(
    () => [...trending, ...popularMovies, ...popularTv],
    [trending, popularMovies, popularTv]
  );

  useEffect(() => {
    SocialService.initialize(userProfile, allMedia);

    const refreshNotifications = () => setSocialNotifications(SocialService.getNotifications());
    const handlePopState = () => setCurrentPath(window.location.pathname || '/');

    refreshNotifications();
    window.addEventListener('vidarix-social-updated', refreshNotifications);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('vidarix-social-updated', refreshNotifications);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [userProfile, allMedia]);

  return (
    <div className="vidarix-app-shell min-h-screen bg-[#07080D] text-[#F7F7FA] flex flex-col font-sans selection:bg-[#8B5CF6]/30">
      {!isAuthPath && (
        <Header
          currentPath={currentPath}
          userProfile={userProfile}
          isAuthenticated={isAuthenticated}
          onNavigate={handleNavigate}
          onOpenSearch={() => setIsSearchOpen(true)}
          onLogout={handleLogout}
          notifications={socialNotifications}
          onMarkNotificationRead={(id) => {
            SocialService.markNotificationRead(id);
            setSocialNotifications(SocialService.getNotifications());
          }}
          onMarkAllNotificationsRead={() => {
            SocialService.markAllNotificationsRead();
            setSocialNotifications(SocialService.getNotifications());
          }}
        />
      )}

      <main className={`${isAuthPath ? 'auth-main-content' : 'vidarix-main-content'} flex-1`}>
        {selectedMediaDetail && !isAuthPath ? (
          <MovieDetails
            mediaId={selectedMediaDetail.id}
            mediaType={selectedMediaDetail.type}
            isSaved={savedIds.has(selectedMediaDetail.id)}
            isWatched={StorageService.isSaved(selectedMediaDetail.id, selectedMediaDetail.type, 'watched')}
            onBack={() => setSelectedMediaDetail(null)}
            onToggleWatchlist={handleToggleWatchlist}
            onSelectMedia={handleSelectMedia}
            userProfile={userProfile}
            onAddToast={addToast}
          />
        ) : (
          <>
            {(currentPath === '/' || currentPath === '/inicio') && (
              <HomePage
                trending={trending}
                popularMovies={popularMovies}
                popularTv={popularTv}
                topRated={topRated}
                netflixMedia={netflixMedia}
                primeMedia={primeMedia}
                disneyMedia={disneyMedia}
                maxMedia={maxMedia}
                savedIds={savedIds}
                onSelectMedia={handleSelectMedia}
                onNavigate={handleNavigate}
                onToggleWatchlist={handleToggleWatchlist}
              />
            )}

            {(currentPath.startsWith('/filmes') ||
              currentPath.startsWith('/series') ||
              currentPath.startsWith('/catalogo')) && (
              <CatalogPage
                initialType={
                  currentPath.startsWith('/series')
                    ? 'tv'
                    : currentPath.startsWith('/filmes')
                      ? 'movie'
                      : 'all'
                }
                savedIds={savedIds}
                onSelectMedia={handleSelectMedia}
                onToggleWatchlist={handleToggleWatchlist}
              />
            )}

            {currentPath === '/roleta' && (
              <RoulettePage
                allMedia={allMedia}
                savedIds={savedIds}
                soundEnabled={userProfile.soundEffects}
                onSelectMedia={handleSelectMedia}
                onToggleWatchlist={handleToggleWatchlist}
              />
            )}

            {currentPath === '/minha-lista' && (
              <WatchlistPage
                watchlist={watchlist}
                onRefreshWatchlist={() => setWatchlist(StorageService.getWatchlist())}
                onSelectMedia={handleSelectMedia}
                onToggleWatchlist={handleToggleWatchlist}
              />
            )}

            {currentPath === '/comunidade' && (
              <CommunityPage
                userProfile={userProfile}
                mediaPool={allMedia}
                onSelectMedia={handleSelectMedia}
                onAddToast={addToast}
                onAddToWatchlist={(item) => handleToggleWatchlist(item, 'watchlist')}
              />
            )}

            {currentPath.startsWith('/perfil') && currentPath !== '/perfil/editar' && (
              <ProfilePage
                userProfile={userProfile}
                onUpdateProfile={handleUpdateProfile}
                onNavigate={handleNavigate}
                onSelectMedia={handleSelectMedia}
                onAddToast={addToast}
              />
            )}

            {currentPath === '/perfil/editar' && (
              <EditProfilePage
                userProfile={userProfile}
                onUpdateProfile={handleUpdateProfile}
                onNavigate={handleNavigate}
              />
            )}

            {currentPath === '/configuracoes' && (
              <SettingsPage
                userProfile={userProfile}
                isAuthenticated={isAuthenticated}
                onUpdateProfile={handleUpdateProfile}
                onNavigate={handleNavigate}
                onLogout={handleLogout}
                onAddToast={addToast}
              />
            )}

            {currentPath === '/entrar' && (
              <AuthPage mode="login" onNavigate={handleNavigate} onAddToast={addToast} />
            )}

            {currentPath === '/criar-conta' && (
              <AuthPage mode="register" onNavigate={handleNavigate} onAddToast={addToast} />
            )}

            {currentPath === '/recuperar-senha' && (
              <AuthPage mode="forgot-password" onNavigate={handleNavigate} onAddToast={addToast} />
            )}

            {currentPath === '/redefinir-senha' && (
              <AuthPage mode="reset-password" onNavigate={handleNavigate} onAddToast={addToast} />
            )}

            {currentPath === '/termos' && <LegalPage type="termos" />}
            {currentPath === '/privacidade' && <LegalPage type="privacidade" />}
            {currentPath === '/sobre' && <LegalPage type="sobre" />}
          </>
        )}
      </main>

      {!isAuthPath && <Footer onNavigate={handleNavigate} />}

      {!isAuthPath && (
        <MobileNavigation currentPath={currentPath} onNavigate={handleNavigate} />
      )}

      {!isAuthPath && (
        <SearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          onSelectMedia={handleSelectMedia}
        />
      )}

      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
