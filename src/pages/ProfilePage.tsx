import React, { useEffect, useMemo, useState } from 'react';
import {
  User,
  Edit3,
  Share2,
  Settings,
  Sparkles,
  Tv,
  Bookmark,
  History,
  Trash2,
  Check,
  ExternalLink,
  Eye,
  Heart,
  Play,
  Clock3,
  ChevronRight,
  CloudOff,
  Star,
  ListChecks,
  Users
} from 'lucide-react';
import { UserProfile, UserWatchlistItem, RouletteSpinHistory, MediaItem } from '../types';
import {
  streamingProviders,
  StreamingProvider,
  getLocalProviderLogoOverride
} from '../data/streamingProviders';
import { TMDB_GENRES } from '../data/genres';
import { StorageService } from '../services/storageService';
import { fetchWatchProvidersBR, getBackdropUrl, getPosterUrl } from '../services/tmdbApi';
import { UserAvatar } from '../components/UserAvatar';
import { useAuth } from '../context/AuthContext';
import { dataProvider } from '../services/dataProvider';

interface ProfilePageProps {
  userProfile: UserProfile;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  onNavigate: (path: string) => void;
  onSelectMedia?: (item: MediaItem) => void;
  onAddToast?: (title: string, desc?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

interface ProfileProviderTileProps {
  provider: StreamingProvider;
  onClick: () => void;
}

const ProfileProviderTile: React.FC<ProfileProviderTileProps> = ({ provider, onClick }) => {
  const [logoError, setLogoError] = useState(false);
  const logo = getLocalProviderLogoOverride(provider.name) || provider.logoUrl || provider.logoPath;

  useEffect(() => {
    setLogoError(false);
  }, [logo]);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group min-w-0 rounded-2xl border border-white/10 bg-[#0B0D15] p-3 text-left transition-all hover:-translate-y-1 hover:border-[#8B5CF6]/60 hover:bg-[#10131E] hover:shadow-[0_14px_30px_rgba(0,0,0,.32)]"
      title={`Ver títulos disponíveis no ${provider.name}`}
    >
      <div className="flex h-14 items-center justify-center overflow-hidden rounded-xl border border-white/[0.06] bg-[#070910] px-3">
        {logo && !logoError ? (
          <img
            src={logo}
            alt={`Logo do ${provider.name}`}
            className="h-9 max-w-full object-contain transition-transform group-hover:scale-105"
            onError={() => setLogoError(true)}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#F43F5E] via-[#EC4899] to-[#7C3AED] text-xs font-black text-white">
            {provider.initials}
          </span>
        )}
      </div>
      <span className="mt-2.5 block min-h-8 text-center text-xs font-extrabold leading-4 text-white">
        {provider.name}
      </span>
    </button>
  );
};

export const ProfilePage: React.FC<ProfilePageProps> = ({
  userProfile,
  onNavigate,
  onSelectMedia,
  onAddToast
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'watchlist' | 'history'>('overview');
  const [spinHistory, setSpinHistory] = useState<RouletteSpinHistory[]>(StorageService.getRouletteHistory());
  const [watchlist, setWatchlist] = useState<UserWatchlistItem[]>(StorageService.getWatchlist());
  const [providersList, setProvidersList] = useState<StreamingProvider[]>(streamingProviders);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    let mounted = true;

    fetchWatchProvidersBR()
      .then((providers) => {
        if (mounted) setProvidersList([...providers]);
      })
      .catch(() => {
        if (mounted) setProvidersList([...streamingProviders]);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    Promise.all([dataProvider.getWatchlist(), dataProvider.getRouletteHistory()])
      .then(([items, history]) => {
        if (!isMounted) return;
        setWatchlist(items);
        setSpinHistory(history);
      })
      .catch(() => {
        if (!isMounted) return;
        setWatchlist(StorageService.getWatchlist());
        setSpinHistory(StorageService.getRouletteHistory());
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  const displayName = userProfile.displayName || userProfile.fullName || userProfile.name || 'Cinéfilo VIDARIX';
  const username = userProfile.username ? `@${userProfile.username}` : '@cinefilo';
  const bio = userProfile.bio || 'Apaixonado por cinema, séries e descobertas surpreendentes na roleta VIDARIX.';
  const avatarSrc = userProfile.photoURL || userProfile.avatar;

  const watchedItems = useMemo(() => watchlist.filter((item) => item.status === 'watched'), [watchlist]);
  const queuedItems = useMemo(() => watchlist.filter((item) => item.status === 'watchlist'), [watchlist]);
  const favoriteItems = useMemo(() => watchlist.filter((item) => item.status === 'favorites'), [watchlist]);

  const watchedCount = watchedItems.length;
  const watchlistCount = queuedItems.length;
  const activeProvidersCount = userProfile.streamingProviders.length;
  const totalSpinsCount = spinHistory.length;

  const userProviders = useMemo(
    () => providersList.filter((provider) => userProfile.streamingProviders.includes(provider.id)),
    [providersList, userProfile.streamingProviders]
  );

  const favoriteGenres = useMemo(
    () => TMDB_GENRES.filter((genre) => userProfile.favoriteGenres.includes(genre.id)),
    [userProfile.favoriteGenres]
  );

  const latestSpin = useMemo(() => {
    return [...spinHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  }, [spinHistory]);

  const latestWatchlistItems = useMemo(() => {
    return [...watchlist]
      .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
      .slice(0, 4);
  }, [watchlist]);

  const recentActivity = useMemo(() => {
    const watchlistActivity = watchlist.map((item) => ({
      id: `watchlist-${item.id}`,
      date: item.addedAt,
      media: item.item,
      label:
        item.status === 'watched'
          ? 'Marcou como assistido'
          : item.status === 'favorites'
            ? 'Adicionou aos favoritos'
            : 'Adicionou à lista'
    }));

    const spinActivity = spinHistory.map((entry) => ({
      id: `spin-${entry.id}`,
      date: entry.date,
      media: entry.resultMedia,
      label: 'Sorteou na roleta'
    }));

    return [...watchlistActivity, ...spinActivity]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [watchlist, spinHistory]);

  const completionItems = useMemo(
    () => [
      { label: 'Foto de perfil', complete: Boolean(avatarSrc) },
      { label: 'Nome de usuário', complete: Boolean(userProfile.username) },
      { label: 'Biografia', complete: Boolean(userProfile.bio?.trim()) },
      { label: 'Streamings', complete: userProfile.streamingProviders.length > 0 },
      { label: 'Gêneros favoritos', complete: userProfile.favoriteGenres.length > 0 }
    ],
    [avatarSrc, userProfile.bio, userProfile.favoriteGenres.length, userProfile.streamingProviders.length, userProfile.username]
  );

  const completionPercentage = Math.round(
    (completionItems.filter((item) => item.complete).length / completionItems.length) * 100
  );

  const coverBackdrop = latestSpin?.resultMedia.backdrop_path
    ? getBackdropUrl(latestSpin.resultMedia.backdrop_path, 'w1280')
    : null;

  const handleShareProfile = async () => {
    const url = `${window.location.origin}/perfil`;

    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      onAddToast?.('Link copiado!', 'O link do seu perfil foi copiado para a área de transferência.', 'success');
      window.setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      onAddToast?.('Não foi possível copiar', 'Copie o endereço diretamente da barra do navegador.', 'warning');
    }
  };

  const handleClearHistory = () => {
    StorageService.clearHistory();
    setSpinHistory([]);
    onAddToast?.('Histórico limpo', 'O histórico da roleta foi limpo com sucesso.', 'info');
  };

  const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl space-y-7 px-4 pb-20 pt-24 sm:px-6 sm:pt-28 lg:px-8">
      <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#0D0F17] shadow-[0_30px_80px_rgba(0,0,0,.42)]">
        <div
          className="relative h-[clamp(180px,22vw,250px)] overflow-hidden bg-gradient-to-r from-[#07080D] via-[#1A0F2E] to-[#2D0B25]"
          style={
            coverBackdrop
              ? {
                  backgroundImage: `linear-gradient(90deg, rgba(7,8,13,.94) 0%, rgba(7,8,13,.58) 48%, rgba(7,8,13,.82) 100%), url(${coverBackdrop})`,
                  backgroundPosition: 'center',
                  backgroundSize: 'cover'
                }
              : undefined
          }
        >
          {!coverBackdrop && (
            <>
              <div className="absolute inset-0 opacity-25 bg-[radial-gradient(#EC4899_1px,transparent_1px)] [background-size:17px_17px]" />
              <div className="absolute -right-16 -top-28 h-96 w-96 rounded-full bg-[#EC4899]/20 blur-3xl" />
              <div className="absolute -bottom-36 left-0 h-80 w-80 rounded-full bg-[#7C3AED]/20 blur-3xl" />
            </>
          )}

          <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
            <span className="flex items-center gap-1.5 rounded-full border border-white/15 bg-black/35 px-3 py-1 text-[11px] font-extrabold text-white/80 backdrop-blur-md">
              <CloudOff className="h-3.5 w-3.5" /> Perfil local
            </span>
          </div>
        </div>

        <div className="relative -mt-14 flex flex-col gap-6 px-5 pb-6 sm:-mt-16 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-end sm:text-left">
            <UserAvatar
              src={avatarSrc}
              name={displayName}
              size="2xl"
              showBorder
              borderColor="border-4 border-[#0D0F17] ring-4 ring-[#8B5CF6]/45 shadow-2xl"
              className="shrink-0"
            />

            <div className="min-w-0 pb-1">
              <h1 className="truncate text-3xl font-black tracking-tight text-white sm:text-4xl">{displayName}</h1>
              <p className="mt-1 text-sm font-bold text-[#9B72F4]">{username}</p>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#A7A9B4]">{bio}</p>
              <p className="mt-2 flex items-center justify-center gap-1.5 text-xs font-medium text-white/45 sm:justify-start">
                <CloudOff className="h-3.5 w-3.5" /> Dados salvos neste dispositivo
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5 lg:justify-end">
            <button
              type="button"
              onClick={() => onNavigate('/perfil/editar')}
              className="flex min-h-11 items-center gap-2 rounded-xl border border-[#9B72F4]/50 bg-[#7458C7] px-4 text-xs font-extrabold text-white shadow-[0_10px_24px_rgba(0,0,0,.28)] transition hover:-translate-y-0.5 hover:bg-[#8167CF]"
            >
              <Edit3 className="h-4 w-4" /> Editar perfil
            </button>

            <button
              type="button"
              onClick={() => onNavigate('/comunidade')}
              className="flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-[#151823] px-4 text-xs font-extrabold text-white transition hover:border-[#8B5CF6]/50 hover:bg-[#1A1D29]"
            >
              <Users className="h-4 w-4 text-[#8B5CF6]" /> Comunidade
            </button>

            {userProfile.privacy?.publicProfile && (
              <button
                type="button"
                onClick={handleShareProfile}
                className="flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-[#151823] px-4 text-xs font-extrabold text-white transition hover:border-white/25 hover:bg-[#1A1D29]"
              >
                {copiedLink ? <Check className="h-4 w-4 text-emerald-400" /> : <Share2 className="h-4 w-4 text-[#EC4899]" />}
                {copiedLink ? 'Copiado!' : 'Compartilhar'}
              </button>
            )}

            <button
              type="button"
              onClick={() => onNavigate('/configuracoes')}
              className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-[#151823] text-[#A7A9B4] transition hover:border-white/25 hover:text-white"
              aria-label="Abrir configurações"
            >
              <Settings className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 divide-x divide-y divide-white/[0.06] border-t border-white/10 bg-[#121520] sm:grid-cols-4 sm:divide-y-0">
          <button
            type="button"
            onClick={() => setActiveTab('watchlist')}
            className="group flex items-center justify-center gap-3 p-4 text-left transition hover:bg-white/[0.035]"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.05] text-white"><Eye className="h-4 w-4" /></span>
            <span><b className="block text-xl font-black text-white">{watchedCount}</b><small className="text-[10px] font-bold uppercase tracking-wider text-[#A7A9B4]">Assistidos</small></span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('watchlist')}
            className="group flex items-center justify-center gap-3 p-4 text-left transition hover:bg-white/[0.035]"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#8B5CF6]/15 text-[#A98AF4]"><Bookmark className="h-4 w-4" /></span>
            <span><b className="block text-xl font-black text-[#A98AF4]">{watchlistCount}</b><small className="text-[10px] font-bold uppercase tracking-wider text-[#A7A9B4]">Quero assistir</small></span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className="group flex items-center justify-center gap-3 p-4 text-left transition hover:bg-white/[0.035]"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#EC4899]/15 text-[#F06BB0]"><Sparkles className="h-4 w-4" /></span>
            <span><b className="block text-xl font-black text-[#F06BB0]">{totalSpinsCount}</b><small className="text-[10px] font-bold uppercase tracking-wider text-[#A7A9B4]">Sorteios</small></span>
          </button>
          <button
            type="button"
            onClick={() => document.getElementById('profile-streamings')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
            className="group flex items-center justify-center gap-3 p-4 text-left transition hover:bg-white/[0.035]"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/15 text-emerald-400"><Tv className="h-4 w-4" /></span>
            <span><b className="block text-xl font-black text-emerald-400">{activeProvidersCount}</b><small className="text-[10px] font-bold uppercase tracking-wider text-[#A7A9B4]">Streamings</small></span>
          </button>
        </div>
      </section>

      <nav className="flex items-center gap-2 overflow-x-auto border-b border-white/10 pb-3 no-scrollbar" aria-label="Seções do perfil">
        {[
          { id: 'overview' as const, label: 'Visão geral', icon: User },
          { id: 'watchlist' as const, label: `Minhas listas (${watchlist.length})`, icon: Bookmark },
          { id: 'history' as const, label: `Histórico da roleta (${spinHistory.length})`, icon: History }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-extrabold transition ${
              activeTab === id
                ? 'bg-[#7458C7] text-white shadow-[0_8px_22px_rgba(0,0,0,.28)]'
                : 'bg-[#151823] text-[#A7A9B4] hover:bg-[#1A1D29] hover:text-white'
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </nav>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,.65fr)]">
          <div className="space-y-6">
            <section id="profile-streamings" className="rounded-3xl border border-white/10 bg-[#10121A] p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-white">
                    <Tv className="h-4 w-4 text-[#8B5CF6]" /> Seus streamings
                  </h2>
                  <p className="mt-1 text-xs text-[#A7A9B4]">{activeProvidersCount} serviço(s) ativo(s) no seu perfil.</p>
                </div>
                <button type="button" onClick={() => onNavigate('/perfil/editar')} className="text-xs font-bold text-[#9B72F4] hover:underline">Gerenciar</button>
              </div>

              {userProviders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
                  <Tv className="mx-auto h-8 w-8 text-white/20" />
                  <p className="mt-3 text-sm font-bold text-white">Nenhum streaming selecionado</p>
                  <button type="button" onClick={() => onNavigate('/perfil/editar')} className="mt-3 rounded-xl bg-[#7458C7] px-4 py-2 text-xs font-bold text-white">Selecionar streamings</button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                  {userProviders.map((provider) => (
                    <ProfileProviderTile
                      key={provider.slug}
                      provider={provider}
                      onClick={() => onNavigate(`/filmes?provider=${provider.id}`)}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-white/10 bg-[#10121A] p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-white">
                    <Clock3 className="h-4 w-4 text-[#EC4899]" /> Atividade recente
                  </h2>
                  <p className="mt-1 text-xs text-[#A7A9B4]">Seus últimos movimentos dentro da VIDARIX.</p>
                </div>
              </div>

              {recentActivity.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-[#A7A9B4]">Sua atividade recente aparecerá aqui.</div>
              ) : (
                <div className="divide-y divide-white/[0.06]">
                  {recentActivity.map((activity) => (
                    <button
                      key={activity.id}
                      type="button"
                      onClick={() => onSelectMedia?.(activity.media)}
                      className="flex w-full items-center gap-3 py-3 text-left transition first:pt-0 last:pb-0 hover:opacity-80"
                    >
                      <img
                        src={getPosterUrl(activity.media.poster_path, 'w154')}
                        alt=""
                        className="h-14 w-10 shrink-0 rounded-lg object-cover"
                        loading="lazy"
                      />
                      <span className="min-w-0 flex-1">
                        <b className="block truncate text-sm text-white">{activity.media.title || activity.media.name}</b>
                        <small className="mt-0.5 block text-xs text-[#A7A9B4]">{activity.label} • {formatDate(activity.date)}</small>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-white/30" />
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-white/10 bg-[#10121A] p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-white">
                    <ListChecks className="h-4 w-4 text-emerald-400" /> Adicionados recentemente
                  </h2>
                  <p className="mt-1 text-xs text-[#A7A9B4]">Acesso rápido aos últimos títulos das suas listas.</p>
                </div>
                <button type="button" onClick={() => setActiveTab('watchlist')} className="text-xs font-bold text-[#9B72F4] hover:underline">Ver listas</button>
              </div>

              {latestWatchlistItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-[#A7A9B4]">Adicione títulos para preencher esta seção.</div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {latestWatchlistItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectMedia?.(item.item)}
                      className="group overflow-hidden rounded-2xl border border-white/10 bg-[#0A0C13] text-left transition hover:-translate-y-1 hover:border-[#8B5CF6]/50"
                    >
                      <div className="relative aspect-[2/3] overflow-hidden">
                        <img src={getPosterUrl(item.item.poster_path)} alt={item.item.title || item.item.name} className="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" />
                        <span className="absolute right-2 top-2 rounded-full border border-white/10 bg-black/65 px-2 py-1 text-[9px] font-black uppercase text-white backdrop-blur-md">
                          {item.status === 'watched' ? 'Assistido' : item.status === 'favorites' ? 'Favorito' : 'Na lista'}
                        </span>
                      </div>
                      <div className="p-3">
                        <b className="block truncate text-xs text-white">{item.item.title || item.item.name}</b>
                        <span className="mt-1 flex items-center gap-1 text-[10px] text-[#A7A9B4]"><Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {item.item.vote_average?.toFixed(1) || 'N/A'}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-white/10 bg-[#10121A] p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider text-white">Perfil completo</h2>
                  <p className="mt-1 text-xs text-[#A7A9B4]">Personalize seus sorteios e recomendações.</p>
                </div>
                <span className="text-2xl font-black text-[#9B72F4]">{completionPercentage}%</span>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full bg-gradient-to-r from-[#7458C7] to-[#EC4899] transition-all" style={{ width: `${completionPercentage}%` }} />
              </div>

              <div className="mt-4 space-y-2">
                {completionItems.map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-xl bg-white/[0.025] px-3 py-2.5 text-xs">
                    <span className={item.complete ? 'text-white' : 'text-[#A7A9B4]'}>{item.label}</span>
                    <span className={`grid h-5 w-5 place-items-center rounded-full ${item.complete ? 'bg-emerald-500/15 text-emerald-400' : 'border border-white/15 text-white/25'}`}>
                      {item.complete && <Check className="h-3 w-3" />}
                    </span>
                  </div>
                ))}
              </div>

              {completionPercentage < 100 && (
                <button type="button" onClick={() => onNavigate('/perfil/editar')} className="mt-4 w-full rounded-xl border border-[#8B5CF6]/35 bg-[#8B5CF6]/10 py-2.5 text-xs font-extrabold text-[#B69DF3] transition hover:bg-[#8B5CF6]/18">Completar perfil</button>
              )}
            </section>

            <section className="rounded-3xl border border-white/10 bg-[#10121A] p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-white">
                  <Sparkles className="h-4 w-4 text-[#EC4899]" /> Gêneros favoritos
                </h2>
                <button type="button" onClick={() => onNavigate('/perfil/editar')} className="text-xs font-bold text-[#9B72F4] hover:underline">Editar</button>
              </div>

              {favoriteGenres.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-white/10 p-5 text-center text-xs text-[#A7A9B4]">Nenhum gênero selecionado.</p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    {favoriteGenres.map((genre) => (
                      <span key={genre.id} className="rounded-full border border-[#8B5CF6]/25 bg-[#8B5CF6]/10 px-3 py-1.5 text-xs font-bold text-white">{genre.name}</span>
                    ))}
                  </div>
                  <div className="mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#A7A9B4]">Destaque do seu perfil</p>
                    <p className="mt-1 text-sm font-extrabold text-white">Você curte mais {favoriteGenres[0].name}</p>
                  </div>
                </>
              )}
            </section>

            <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#10121A]">
              <div className="p-5 sm:p-6">
                <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-white">
                  <History className="h-4 w-4 text-[#8B5CF6]" /> Último sorteio
                </h2>
              </div>

              {latestSpin ? (
                <button type="button" onClick={() => onSelectMedia?.(latestSpin.resultMedia)} className="group block w-full text-left">
                  <div className="relative aspect-[16/9] overflow-hidden bg-[#080A10]">
                    <img src={getBackdropUrl(latestSpin.resultMedia.backdrop_path)} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#10121A] via-transparent to-transparent" />
                    <span className="absolute left-4 top-4 grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-black/50 text-white backdrop-blur-md"><Play className="h-4 w-4 fill-current" /></span>
                  </div>
                  <div className="p-5 pt-2">
                    <b className="block text-base text-white">{latestSpin.resultMedia.title || latestSpin.resultMedia.name}</b>
                    <p className="mt-1 text-xs text-[#A7A9B4]">Sorteado em {new Date(latestSpin.date).toLocaleDateString('pt-BR')} • {latestSpin.mode}</p>
                  </div>
                </button>
              ) : (
                <div className="px-5 pb-5 text-center">
                  <Sparkles className="mx-auto h-8 w-8 text-white/20" />
                  <p className="mt-3 text-xs text-[#A7A9B4]">Seu último sorteio aparecerá aqui.</p>
                  <button type="button" onClick={() => onNavigate('/roleta')} className="mt-4 rounded-xl bg-[#7458C7] px-4 py-2.5 text-xs font-extrabold text-white">Girar a roleta</button>
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-white/10 bg-[#10121A] p-5 sm:p-6">
              <h2 className="text-sm font-black uppercase tracking-wider text-white">Preferências rápidas</h2>
              <div className="mt-4 space-y-2 text-xs">
                <div className="flex items-center justify-between rounded-xl bg-white/[0.025] px-3 py-3"><span className="text-[#A7A9B4]">Somente meus streamings</span><b className="text-emerald-400">{userProfile.roulettePreferences?.onlyMyProviders !== false ? 'Ativado' : 'Desativado'}</b></div>
                <div className="flex items-center justify-between rounded-xl bg-white/[0.025] px-3 py-3"><span className="text-[#A7A9B4]">Evitar assistidos</span><b className="text-emerald-400">{userProfile.roulettePreferences?.excludeWatched !== false ? 'Ativado' : 'Desativado'}</b></div>
                <div className="flex items-center justify-between rounded-xl bg-white/[0.025] px-3 py-3"><span className="text-[#A7A9B4]">Efeitos sonoros</span><b className="text-emerald-400">{userProfile.soundEffects !== false ? 'Ativado' : 'Desativado'}</b></div>
              </div>
            </section>
          </aside>
        </div>
      )}

      {activeTab === 'watchlist' && (
        <section className="space-y-6 rounded-3xl border border-white/10 bg-[#10121A] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-base font-black text-white"><Bookmark className="h-5 w-5 text-[#8B5CF6]" /> Sua seleção pessoal</h2>
              <p className="mt-1 text-xs text-[#A7A9B4]">{watchedItems.length} assistido(s), {queuedItems.length} para assistir e {favoriteItems.length} favorito(s).</p>
            </div>
            <button type="button" onClick={() => onNavigate('/minha-lista')} className="flex items-center gap-1 text-xs font-bold text-[#9B72F4] hover:underline">Ver em tela cheia <ExternalLink className="h-3.5 w-3.5" /></button>
          </div>

          {watchlist.length === 0 ? (
            <div className="py-12 text-center">
              <Bookmark className="mx-auto h-10 w-10 text-white/20" />
              <p className="mt-3 text-sm font-bold text-white">Sua lista está vazia</p>
              <p className="mt-1 text-xs text-[#A7A9B4]">Adicione filmes e séries clicando no ícone de lista dos cards.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {watchlist.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectMedia?.(item.item)}
                  className="group overflow-hidden rounded-2xl border border-white/[0.06] bg-[#151823] text-left transition hover:-translate-y-1 hover:border-[#8B5CF6]/60"
                >
                  <div className="relative aspect-[2/3] overflow-hidden bg-black/40">
                    <img src={getPosterUrl(item.item.poster_path)} alt={item.item.title || item.item.name} className="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" />
                    <span className="absolute right-2 top-2 rounded-full border border-white/10 bg-black/70 px-2 py-1 text-[9px] font-black uppercase text-white backdrop-blur-md">
                      {item.status === 'watched' ? 'Assistido' : item.status === 'favorites' ? 'Favorito' : 'Na lista'}
                    </span>
                  </div>
                  <div className="p-3">
                    <b className="block truncate text-xs text-white">{item.item.title || item.item.name}</b>
                    <span className="mt-1 flex items-center gap-1 text-[10px] text-[#A7A9B4]"><Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {item.item.vote_average?.toFixed(1) || 'N/A'}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === 'history' && (
        <section className="space-y-6 rounded-3xl border border-white/10 bg-[#10121A] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-base font-black text-white"><History className="h-5 w-5 text-[#8B5CF6]" /> Histórico de sorteios</h2>
              <p className="mt-1 text-xs text-[#A7A9B4]">Revise os títulos escolhidos pela roleta.</p>
            </div>
            {spinHistory.length > 0 && (
              <button type="button" onClick={handleClearHistory} className="flex items-center gap-1 text-xs font-bold text-rose-400 hover:underline"><Trash2 className="h-3.5 w-3.5" /> Limpar histórico</button>
            )}
          </div>

          {spinHistory.length === 0 ? (
            <div className="py-12 text-center">
              <Sparkles className="mx-auto h-10 w-10 text-white/20" />
              <p className="mt-3 text-sm font-bold text-white">Nenhum sorteio registrado</p>
              <button type="button" onClick={() => onNavigate('/roleta')} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#7458C7] px-5 py-2.5 text-xs font-extrabold text-white"><Sparkles className="h-4 w-4" /> Girar a roleta</button>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {[...spinHistory]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => onSelectMedia?.(entry.resultMedia)}
                    className="group flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-[#151823] p-3 text-left transition hover:border-white/20"
                  >
                    <img src={getPosterUrl(entry.resultMedia.poster_path, 'w154')} alt="" className="h-20 w-14 shrink-0 rounded-xl object-cover" loading="lazy" />
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-sm text-white transition group-hover:text-[#A98AF4]">{entry.resultMedia.title || entry.resultMedia.name}</b>
                      <small className="mt-1 block text-xs text-[#A7A9B4]">{new Date(entry.date).toLocaleDateString('pt-BR')} • {entry.mode}</small>
                      <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-1 text-[10px] font-bold text-amber-300"><Star className="h-3 w-3 fill-current" /> {entry.resultMedia.vote_average?.toFixed(1) || 'N/A'}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-white/25" />
                  </button>
                ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
};
