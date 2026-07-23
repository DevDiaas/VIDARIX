import React, { useState, useEffect, useMemo } from 'react';
import { MediaItem, SocialNotification, UserProfile, UserWatchlistItem, ToastMessage } from './types';
import { StorageService } from './services/storageService';
import { SupabaseService } from './services/supabaseService';
import { fetchTrending, fetchPopular, fetchTopRated, fetchByProvider } from './services/tmdbApi';
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
import { LegalPage } from './pages/LegalPage';
import { CommunityPage } from './pages/CommunityPage';
import { SocialService } from './services/socialService';
import { AuthProvider, useAuth } from './context/AuthContext';

function MainAppContent() {
  const { user, profile: userProfile, updateProfile } = useAuth();

  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname || '/');
  const [selectedMediaDetail, setSelectedMediaDetail] = useState<{ id: number; type: 'movie' | 'tv' } | null>(null);

  // Watchlist & Toast states
  const [watchlist, setWatchlist] = useState<UserWatchlistItem[]>(StorageService.getWatchlist());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [socialNotifications, setSocialNotifications] = useState<SocialNotification[]>([]);

  // UI Modals
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Content state
  const [trending, setTrending] = useState<MediaItem[]>([]);
  const [popularMovies, setPopularMovies] = useState<MediaItem[]>([]);
  const [popularTv, setPopularTv] = useState<MediaItem[]>([]);
  const [topRated, setTopRated] = useState<MediaItem[]>([]);
  const [netflixMedia, setNetflixMedia] = useState<MediaItem[]>([]);
  const [primeMedia, setPrimeMedia] = useState<MediaItem[]>([]);
  const [disneyMedia, setDisneyMedia] = useState<MediaItem[]>([]);
  const [maxMedia, setMaxMedia] = useState<MediaItem[]>([]);

  // Set of saved media IDs for quick lookup
  const savedIds = new Set(watchlist.map((w) => w.mediaId));

  // Sync watchlist when user logs in or changes
  useEffect(() => {
    if (user) {
      SupabaseService.fetchWatchlist(user.id).then((items) => {
        if (items && items.length > 0) {
          setWatchlist(items);
        }
      });
    } else {
      setWatchlist(StorageService.getWatchlist());
    }
  }, [user]);

  // Initial TMDB Catalog Data Fetching
  useEffect(() => {
    let isMounted = true;
    const loadAllData = async () => {
      const [tr, pm, pt, trated, net, prm, dis, mx] = await Promise.all([
        fetchTrending('all'),
        fetchPopular('movie'),
        fetchPopular('tv'),
        fetchTopRated('movie'),
        fetchByProvider(8, 'movie'), // Netflix
        fetchByProvider(119, 'movie'), // Prime Video
        fetchByProvider(337, 'movie'), // Disney+
        fetchByProvider(1899, 'movie') // Max
      ]);

      if (isMounted) {
        setTrending(tr);
        setPopularMovies(pm);
        setPopularTv(pt);
        setTopRated(trated);
        setNetflixMedia(net);
        setPrimeMedia(prm);
        setDisneyMedia(dis);
        setMaxMedia(mx);
      }
    };

    loadAllData();
    return () => {
      isMounted = false;
    };
  }, []);

  const addToast = (title: string, description?: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    const newToast: ToastMessage = {
      id: `toast_${Date.now()}`,
      title,
      description,
      type
    };
    setToasts((prev) => [...prev, newToast]);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleNavigate = (path: string) => {
    const [cleanPath, query = ''] = path.split('?');
    const targetUrl = query ? `${cleanPath}?${query}` : cleanPath;
    if (`${window.location.pathname}${window.location.search}` !== targetUrl) {
      window.history.pushState({}, '', targetUrl);
    }
    setCurrentPath(cleanPath);
    window.dispatchEvent(new CustomEvent('vidarix-navigate', { detail: { path: cleanPath, query } }));
    setSelectedMediaDetail(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const removedRoutes = ['/entrar', '/criar-conta', '/recuperar-senha', '/redefinir-senha'];
    if (removedRoutes.includes(currentPath)) {
      window.history.replaceState({}, '', '/');
      setCurrentPath('/');
    }
  }, [currentPath]);

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
      if (user) {
        SupabaseService.removeWatchlistItem(user.id, item.id, item.media_type);
      }
      addToast('Removido da lista', item.title || item.name, 'info');
    } else {
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
    }
  };

  const handleUpdateProfile = (updated: Partial<UserProfile>) => {
    updateProfile(updated);
  };

  // Combine media for Roulette candidate defaults
  const allMedia = useMemo(() => [...trending, ...popularMovies, ...popularTv], [trending, popularMovies, popularTv]);

  useEffect(() => {
    SocialService.initialize(userProfile, allMedia);
    const refreshNotifications = () => setSocialNotifications(SocialService.getNotifications());
    refreshNotifications();
    window.addEventListener('vidarix-social-updated', refreshNotifications);
    const handlePopState = () => {
      const nextPath = window.location.pathname || '/';
      const removedRoutes = ['/entrar', '/criar-conta', '/recuperar-senha', '/redefinir-senha'];
      if (removedRoutes.includes(nextPath)) {
        window.history.replaceState({}, '', '/');
        setCurrentPath('/');
        return;
      }
      setCurrentPath(nextPath);
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('vidarix-social-updated', refreshNotifications);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [userProfile, allMedia]);

  return (
    <div className="vidarix-app-shell min-h-screen bg-[#07080D] text-[#F7F7FA] flex flex-col font-sans selection:bg-[#8B5CF6]/30">
      {/* Header */}
      <Header
          currentPath={currentPath}
          userProfile={userProfile}
          onNavigate={handleNavigate}
          onOpenSearch={() => setIsSearchOpen(true)}
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

      {/* Main View Router */}
      <main className="vidarix-main-content flex-1">
        {selectedMediaDetail ? (
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

            {(currentPath.startsWith('/filmes') || currentPath.startsWith('/series') || currentPath.startsWith('/catalogo')) && (
              <CatalogPage
                initialType={currentPath.startsWith('/series') ? 'tv' : currentPath.startsWith('/filmes') ? 'movie' : 'all'}
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
                onUpdateProfile={handleUpdateProfile}
                onAddToast={addToast}
              />
            )}

            {currentPath === '/termos' && <LegalPage type="termos" />}
            {currentPath === '/privacidade' && <LegalPage type="privacidade" />}
            {currentPath === '/sobre' && <LegalPage type="sobre" />}
          </>
        )}
      </main>

      {/* Footer */}
      <Footer onNavigate={handleNavigate} />

      {/* Fixed Mobile Bottom Bar */}
      <MobileNavigation
        currentPath={currentPath}
        onNavigate={handleNavigate}
      />

      {/* Global Search Popup */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectMedia={handleSelectMedia}
      />

      {/* Global Toast Notifications */}
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
