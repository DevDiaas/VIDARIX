import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Camera,
  Check,
  Clapperboard,
  Clock3,
  Film,
  Globe,
  Heart,
  Languages,
  ListVideo,
  Loader2,
  MonitorPlay,
  RotateCcw,
  Save,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trash2,
  Tv,
  User,
  WandSparkles,
  X
} from 'lucide-react';
import { UserProfile } from '../types';
import { streamingProviders, StreamingProvider } from '../data/streamingProviders';
import { StreamingProviderLogo } from '../components/StreamingProviderLogo';
import { TMDB_GENRES } from '../data/genres';
import { ImageCropModal } from '../components/ImageCropModal';
import { UserAvatar } from '../components/UserAvatar';
import { fetchWatchProvidersBR } from '../services/tmdbApi';
import { useAuth } from '../context/AuthContext';
import { SupabaseService } from '../services/supabaseService';

type EditTab = 'profile' | 'streaming' | 'preferences' | 'roulette';

interface EditProfilePageProps {
  userProfile: UserProfile;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  onNavigate: (path: string) => void;
}

interface ProfileSnapshot {
  fullName: string;
  displayName: string;
  username: string;
  bio: string;
  photoURL: string | null;
  birthDate: string;
  country: string;
  language: string;
  mediaPreference: 'all' | 'movie' | 'tv';
  favoriteGenres: number[];
  avoidGenres: number[];
  minimumRating: number;
  maximumRuntime: number | null;
  discoveryPreference: 'popular' | 'surprises' | 'balanced';
  selectedProviders: number[];
  rouletteOnlyMyProviders: boolean;
  rouletteExcludeWatched: boolean;
  rouletteAvoidRecent: boolean;
  rouletteAllowSurprises: boolean;
  soundEffects: boolean;
  animations: boolean;
}

interface SwitchRowProps {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  icon: React.ReactNode;
}

const SwitchRow: React.FC<SwitchRowProps> = ({ title, description, checked, onChange, icon }) => (
  <label className="edit-profile-switch-row">
    <span className="edit-profile-switch-row__icon">{icon}</span>
    <span className="edit-profile-switch-row__copy">
      <strong>{title}</strong>
      <small>{description}</small>
    </span>
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      className="sr-only"
    />
    <span className={`edit-profile-switch ${checked ? 'is-on' : ''}`} aria-hidden="true">
      <span />
    </span>
  </label>
);

const cloneNumbers = (values?: number[]) => [...(values || [])];

export const EditProfilePage: React.FC<EditProfilePageProps> = ({
  userProfile,
  onUpdateProfile,
  onNavigate
}) => {
  const { user, updateProfile, uploadAvatar, removeAvatar } = useAuth();

  const defaults = useMemo<ProfileSnapshot>(() => ({
    fullName: userProfile.fullName || userProfile.name || '',
    displayName: userProfile.displayName || userProfile.name || '',
    username: userProfile.username || 'cinefilo',
    bio: userProfile.bio || '',
    photoURL: userProfile.photoURL || userProfile.avatar || null,
    birthDate: userProfile.birthDate || '',
    country: userProfile.country || 'Brasil',
    language: userProfile.language || 'pt-BR',
    mediaPreference: userProfile.mediaPreference || 'all',
    favoriteGenres: cloneNumbers(userProfile.favoriteGenres?.length ? userProfile.favoriteGenres : [28, 878, 18]),
    avoidGenres: cloneNumbers(userProfile.avoidGenres),
    minimumRating: userProfile.minimumRating ?? 6.5,
    maximumRuntime: userProfile.maximumRuntime ?? null,
    discoveryPreference: userProfile.discoveryPreference || 'balanced',
    selectedProviders: cloneNumbers(userProfile.streamingProviders?.length ? userProfile.streamingProviders : [8, 119, 337, 1899]),
    rouletteOnlyMyProviders: userProfile.roulettePreferences?.onlyMyProviders !== false,
    rouletteExcludeWatched: userProfile.roulettePreferences?.excludeWatched !== false,
    rouletteAvoidRecent: userProfile.roulettePreferences?.avoidRecentResults !== false,
    rouletteAllowSurprises: userProfile.roulettePreferences?.allowSurprises !== false,
    soundEffects: userProfile.soundEffects !== false,
    animations: userProfile.animations !== false
  }), [userProfile]);

  const initialSnapshotRef = useRef<ProfileSnapshot>(defaults);

  const [activeTab, setActiveTab] = useState<EditTab>('profile');
  const [genreSearch, setGenreSearch] = useState('');

  const [fullName, setFullName] = useState(defaults.fullName);
  const [displayName, setDisplayName] = useState(defaults.displayName);
  const [username, setUsername] = useState(defaults.username);
  const [bio, setBio] = useState(defaults.bio);
  const [photoURL, setPhotoURL] = useState<string | null>(defaults.photoURL);
  const [birthDate, setBirthDate] = useState(defaults.birthDate);
  const [country, setCountry] = useState(defaults.country);
  const [language, setLanguage] = useState(defaults.language);

  const [mediaPreference, setMediaPreference] = useState<'all' | 'movie' | 'tv'>(defaults.mediaPreference);
  const [favoriteGenres, setFavoriteGenres] = useState<number[]>(defaults.favoriteGenres);
  const [avoidGenres, setAvoidGenres] = useState<number[]>(defaults.avoidGenres);
  const [minimumRating, setMinimumRating] = useState<number>(defaults.minimumRating);
  const [maximumRuntime, setMaximumRuntime] = useState<number | null>(defaults.maximumRuntime);
  const [discoveryPreference, setDiscoveryPreference] = useState<'popular' | 'surprises' | 'balanced'>(
    defaults.discoveryPreference
  );

  const [selectedProviders, setSelectedProviders] = useState<number[]>(defaults.selectedProviders);
  const [providersList, setProvidersList] = useState<StreamingProvider[]>(streamingProviders);

  const [rouletteOnlyMyProviders, setRouletteOnlyMyProviders] = useState(defaults.rouletteOnlyMyProviders);
  const [rouletteExcludeWatched, setRouletteExcludeWatched] = useState(defaults.rouletteExcludeWatched);
  const [rouletteAvoidRecent, setRouletteAvoidRecent] = useState(defaults.rouletteAvoidRecent);
  const [rouletteAllowSurprises, setRouletteAllowSurprises] = useState(defaults.rouletteAllowSurprises);
  const [soundEffects, setSoundEffects] = useState(defaults.soundEffects);
  const [animations, setAnimations] = useState(defaults.animations);

  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  const [fullNameError, setFullNameError] = useState<string | null>(null);
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchWatchProvidersBR().then((providers) => {
      if (mounted && providers.length) setProvidersList([...providers]);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    if (!username) {
      setUsernameError('O nome de usuário é obrigatório.');
      setUsernameStatus(null);
      return;
    }

    if (username.length < 3 || username.length > 24) {
      setUsernameError('O nome de usuário deve conter entre 3 e 24 caracteres.');
      setUsernameStatus(null);
      return;
    }

    if (!/^[a-zA-Z0-9._]+$/.test(username)) {
      setUsernameError('Use apenas letras, números, ponto e underline.');
      setUsernameStatus(null);
      return;
    }

    setUsernameError(null);
    setUsernameStatus('Verificando disponibilidade...');

    const timer = window.setTimeout(async () => {
      const result = await SupabaseService.checkUsernameAvailability(username, user?.id);
      if (isCancelled) return;

      if (!result.available) {
        setUsernameError(result.error || 'Nome de usuário indisponível.');
        setUsernameStatus(null);
      } else {
        setUsernameError(null);
        setUsernameStatus('Nome de usuário disponível ✓');
      }
    }, 400);

    return () => {
      isCancelled = true;
      window.clearTimeout(timer);
    };
  }, [username, user?.id]);

  useEffect(() => {
    if (fullName.trim().length < 2) {
      setFullNameError('O nome completo deve conter pelo menos 2 caracteres.');
    } else if (fullName.length > 80) {
      setFullNameError('O nome completo deve conter no máximo 80 caracteres.');
    } else {
      setFullNameError(null);
    }
  }, [fullName]);

  useEffect(() => {
    if (displayName.trim().length < 2) {
      setDisplayNameError('O nome de exibição deve conter pelo menos 2 caracteres.');
    } else if (displayName.length > 40) {
      setDisplayNameError('O nome de exibição deve conter no máximo 40 caracteres.');
    } else {
      setDisplayNameError(null);
    }
  }, [displayName]);

  const currentSnapshot = useMemo<ProfileSnapshot>(() => ({
    fullName,
    displayName,
    username,
    bio,
    photoURL,
    birthDate,
    country,
    language,
    mediaPreference,
    favoriteGenres,
    avoidGenres,
    minimumRating,
    maximumRuntime,
    discoveryPreference,
    selectedProviders,
    rouletteOnlyMyProviders,
    rouletteExcludeWatched,
    rouletteAvoidRecent,
    rouletteAllowSurprises,
    soundEffects,
    animations
  }), [
    fullName,
    displayName,
    username,
    bio,
    photoURL,
    birthDate,
    country,
    language,
    mediaPreference,
    favoriteGenres,
    avoidGenres,
    minimumRating,
    maximumRuntime,
    discoveryPreference,
    selectedProviders,
    rouletteOnlyMyProviders,
    rouletteExcludeWatched,
    rouletteAvoidRecent,
    rouletteAllowSurprises,
    soundEffects,
    animations
  ]);

  const isDirty = JSON.stringify(currentSnapshot) !== JSON.stringify(initialSnapshotRef.current);
  const isFormInvalid = Boolean(fullNameError || displayNameError || usernameError);

  const filteredGenres = useMemo(() => {
    const query = genreSearch.trim().toLowerCase();
    if (!query) return TMDB_GENRES;
    return TMDB_GENRES.filter((genre) => genre.name.toLowerCase().includes(query));
  }, [genreSearch]);

  const selectedProviderObjects = providersList.filter((provider) => selectedProviders.includes(provider.id));
  const favoriteGenreNames = TMDB_GENRES.filter((genre) => favoriteGenres.includes(genre.id)).map((genre) => genre.name);

  const toggleGenre = (genreId: number, type: 'favorite' | 'avoid') => {
    if (type === 'favorite') {
      setFavoriteGenres((current) => current.includes(genreId) ? current.filter((id) => id !== genreId) : [...current, genreId]);
      setAvoidGenres((current) => current.filter((id) => id !== genreId));
      return;
    }

    setAvoidGenres((current) => current.includes(genreId) ? current.filter((id) => id !== genreId) : [...current, genreId]);
    setFavoriteGenres((current) => current.filter((id) => id !== genreId));
  };

  const toggleProvider = (providerId: number) => {
    setSelectedProviders((current) => current.includes(providerId)
      ? current.filter((id) => id !== providerId)
      : [...current, providerId]);
  };

  const restoreSnapshot = (snapshot: ProfileSnapshot) => {
    setFullName(snapshot.fullName);
    setDisplayName(snapshot.displayName);
    setUsername(snapshot.username);
    setBio(snapshot.bio);
    setPhotoURL(snapshot.photoURL);
    setBirthDate(snapshot.birthDate);
    setCountry(snapshot.country);
    setLanguage(snapshot.language);
    setMediaPreference(snapshot.mediaPreference);
    setFavoriteGenres([...snapshot.favoriteGenres]);
    setAvoidGenres([...snapshot.avoidGenres]);
    setMinimumRating(snapshot.minimumRating);
    setMaximumRuntime(snapshot.maximumRuntime);
    setDiscoveryPreference(snapshot.discoveryPreference);
    setSelectedProviders([...snapshot.selectedProviders]);
    setRouletteOnlyMyProviders(snapshot.rouletteOnlyMyProviders);
    setRouletteExcludeWatched(snapshot.rouletteExcludeWatched);
    setRouletteAvoidRecent(snapshot.rouletteAvoidRecent);
    setRouletteAllowSurprises(snapshot.rouletteAllowSurprises);
    setSoundEffects(snapshot.soundEffects);
    setAnimations(snapshot.animations);
    setSaveSuccessMessage(null);
  };

  const handleResetPreferences = () => {
    setFavoriteGenres([28, 878, 18]);
    setAvoidGenres([]);
    setMediaPreference('all');
    setMinimumRating(6.5);
    setMaximumRuntime(null);
    setDiscoveryPreference('balanced');
    setSelectedProviders([8, 119, 337, 1899]);
    setRouletteOnlyMyProviders(true);
    setRouletteExcludeWatched(true);
    setRouletteAvoidRecent(true);
    setRouletteAllowSurprises(true);
    setSoundEffects(true);
    setAnimations(true);
  };

  const handleSaveProfile = async () => {
    if (isFormInvalid) return;

    setIsSaving(true);
    setSaveSuccessMessage(null);

    const updatedProfileData: Partial<UserProfile> = {
      fullName: fullName.trim(),
      displayName: displayName.trim(),
      name: displayName.trim() || fullName.trim(),
      username: username.trim().toLowerCase(),
      bio: bio.trim(),
      photoURL,
      avatar: photoURL || userProfile.avatar || '',
      birthDate: birthDate || null,
      country,
      language,
      mediaPreference,
      favoriteGenres,
      avoidGenres,
      minimumRating,
      maximumRuntime,
      discoveryPreference,
      streamingProviders: selectedProviders,
      soundEffects,
      animations,
      roulettePreferences: {
        onlyMyProviders: rouletteOnlyMyProviders,
        excludeWatched: rouletteExcludeWatched,
        avoidRecentResults: rouletteAvoidRecent,
        allowSurprises: rouletteAllowSurprises,
        soundEnabled: soundEffects,
        confettiEnabled: true,
        animationsEnabled: animations
      }
    };

    try {
      await updateProfile(updatedProfileData);
      onUpdateProfile(updatedProfileData);
      initialSnapshotRef.current = currentSnapshot;
      setSaveSuccessMessage('Perfil e preferências atualizados com sucesso.');
      window.setTimeout(() => onNavigate('/perfil'), 900);
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const tabs: Array<{ key: EditTab; label: string; icon: React.ReactNode; description: string }> = [
    { key: 'profile', label: 'Informações', icon: <User />, description: 'Identidade e dados pessoais' },
    { key: 'streaming', label: 'Streamings', icon: <Tv />, description: `${selectedProviders.length} serviços selecionados` },
    { key: 'preferences', label: 'Preferências', icon: <Heart />, description: 'Conteúdo e gêneros' },
    { key: 'roulette', label: 'Regras da roleta', icon: <SlidersHorizontal />, description: 'Comportamento do sorteio' }
  ];

  return (
    <main className="edit-profile-v2">
      <header className="edit-profile-v2__heading">
        <div>
          <span className="edit-profile-v2__eyebrow"><Sparkles /> Personalização</span>
          <h1>Editar perfil e preferências</h1>
          <p>Atualize sua identidade, streamings e regras de recomendação em um painel mais organizado.</p>
        </div>
        <div className="edit-profile-v2__heading-actions">
          <button type="button" className="edit-profile-v2__cancel" onClick={() => onNavigate('/perfil')}>Cancelar</button>
          <button
            type="button"
            className="edit-profile-v2__save"
            onClick={handleSaveProfile}
            disabled={isFormInvalid || isSaving || !isDirty}
          >
            {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
            <span>{isSaving ? 'Salvando...' : 'Salvar alterações'}</span>
          </button>
        </div>
      </header>

      {saveSuccessMessage && (
        <div className="edit-profile-v2__success" role="status">
          <Check />
          <span>{saveSuccessMessage}</span>
        </div>
      )}

      <nav className="edit-profile-tabs" aria-label="Seções de edição do perfil">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={activeTab === tab.key ? 'is-active' : ''}
            onClick={() => setActiveTab(tab.key)}
          >
            <span className="edit-profile-tabs__icon">{tab.icon}</span>
            <span>
              <strong>{tab.label}</strong>
              <small>{tab.description}</small>
            </span>
          </button>
        ))}
      </nav>

      <div className="edit-profile-v2__layout">
        <aside className="edit-profile-preview">
          <div className="edit-profile-preview__cover" />
          <div className="edit-profile-preview__body">
            <UserAvatar
              src={photoURL}
              name={displayName || fullName}
              size="xl"
              showBorder
              borderColor="border-2 border-[#8B5CF6]"
            />
            <div className="edit-profile-preview__identity">
              <span>Prévia do perfil</span>
              <h2>{displayName || 'Seu nome'}</h2>
              <p>@{username || 'usuario'}</p>
            </div>
            <p className="edit-profile-preview__bio">
              {bio || 'Adicione uma bio para contar um pouco sobre seu gosto por filmes e séries.'}
            </p>

            <div className="edit-profile-preview__stats">
              <span><strong>{selectedProviders.length}</strong><small>streamings</small></span>
              <span><strong>{favoriteGenres.length}</strong><small>gêneros</small></span>
              <span><strong>{minimumRating.toFixed(1)}</strong><small>nota mínima</small></span>
            </div>

            <div className="edit-profile-preview__chips">
              {favoriteGenreNames.slice(0, 4).map((genre) => <span key={genre}>{genre}</span>)}
              {favoriteGenreNames.length === 0 && <span>Nenhum gênero favorito</span>}
            </div>

            <button type="button" onClick={() => onNavigate('/perfil')}>Ver meu perfil</button>
          </div>
        </aside>

        <section className="edit-profile-panel">
          {activeTab === 'profile' && (
            <div className="edit-profile-section">
              <div className="edit-profile-section__title">
                <span><User /></span>
                <div><h2>Informações pessoais</h2><p>Dados usados no seu perfil público e nas recomendações.</p></div>
              </div>

              <div className="edit-profile-photo-card">
                <UserAvatar
                  src={photoURL}
                  name={displayName || fullName}
                  size="xl"
                  showBorder
                  borderColor="border-2 border-[#8B5CF6]"
                />
                <div>
                  <strong>Foto de perfil</strong>
                  <p>JPG, PNG ou WebP com até 5 MB. Você poderá recortar antes de salvar.</p>
                  <div>
                    <button type="button" onClick={() => setIsCropModalOpen(true)}><Camera /> Alterar foto</button>
                    {photoURL && <button type="button" className="is-danger" onClick={() => setPhotoURL(null)}><Trash2 /> Remover</button>}
                  </div>
                </div>
              </div>

              <div className="edit-profile-fields">
                <label>
                  <span>Nome completo *</span>
                  <input value={fullName} onChange={(event) => setFullName(event.target.value)} maxLength={80} />
                  {fullNameError && <small className="is-error">{fullNameError}</small>}
                </label>
                <label>
                  <span>Nome de exibição *</span>
                  <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={40} />
                  {displayNameError && <small className="is-error">{displayNameError}</small>}
                </label>
                <label>
                  <span>Nome de usuário *</span>
                  <div className="edit-profile-username"><b>@</b><input value={username} onChange={(event) => setUsername(event.target.value)} maxLength={24} /></div>
                  {usernameError ? <small className="is-error">{usernameError}</small> : usernameStatus && <small className="is-success">{usernameStatus}</small>}
                </label>
                <label>
                  <span><Calendar /> Data de nascimento</span>
                  <input type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} />
                </label>
                <label>
                  <span><Globe /> País</span>
                  <select value={country} onChange={(event) => setCountry(event.target.value)}>
                    <option value="Brasil">Brasil</option>
                    <option value="Portugal">Portugal</option>
                    <option value="Estados Unidos">Estados Unidos</option>
                    <option value="Espanha">Espanha</option>
                    <option value="Outro">Outro</option>
                  </select>
                </label>
                <label>
                  <span><Languages /> Idioma preferido</span>
                  <select value={language} onChange={(event) => setLanguage(event.target.value)}>
                    <option value="pt-BR">Português (Brasil)</option>
                    <option value="en-US">English (US)</option>
                    <option value="es-ES">Español</option>
                  </select>
                </label>
                <label className="edit-profile-fields__bio">
                  <span>Biografia <small>{bio.length}/160</small></span>
                  <textarea
                    value={bio}
                    onChange={(event) => setBio(event.target.value.slice(0, 160))}
                    rows={4}
                    placeholder="Conte sobre seu gosto por cinema, séries e descobertas na roleta..."
                  />
                </label>
              </div>
            </div>
          )}

          {activeTab === 'streaming' && (
            <div className="edit-profile-section">
              <div className="edit-profile-section__title">
                <span><Tv /></span>
                <div><h2>Seus streamings</h2><p>Escolha os serviços usados para filtrar títulos disponíveis no Brasil.</p></div>
                <b>{selectedProviders.length} ativos</b>
              </div>

              <div className="edit-profile-provider-grid">
                {providersList.map((provider) => (
                  <StreamingProviderLogo
                    key={provider.slug}
                    name={provider.name}
                    logoUrl={provider.logoUrl}
                    selected={selectedProviders.includes(provider.id)}
                    initials={provider.initials}
                    onClick={() => toggleProvider(provider.id)}
                    className="edit-profile-provider-card"
                  />
                ))}
              </div>

              <div className="edit-profile-provider-summary">
                <MonitorPlay />
                <div>
                  <strong>Serviços selecionados</strong>
                  <p>{selectedProviderObjects.length ? selectedProviderObjects.map((provider) => provider.name).join(' • ') : 'Nenhum streaming selecionado.'}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="edit-profile-section">
              <div className="edit-profile-section__title">
                <span><Heart /></span>
                <div><h2>Preferências de conteúdo</h2><p>Defina o que você gosta e o que prefere evitar nas recomendações.</p></div>
              </div>

              <div className="edit-profile-media-choice">
                {[
                  { key: 'movie', label: 'Apenas filmes', icon: <Film /> },
                  { key: 'tv', label: 'Apenas séries', icon: <Tv /> },
                  { key: 'all', label: 'Filmes e séries', icon: <Clapperboard /> }
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={mediaPreference === item.key ? 'is-selected' : ''}
                    onClick={() => setMediaPreference(item.key as 'all' | 'movie' | 'tv')}
                  >
                    {item.icon}<span>{item.label}</span>
                  </button>
                ))}
              </div>

              <div className="edit-profile-discovery">
                <h3>Estilo de descoberta</h3>
                <div>
                  {[
                    { key: 'popular', title: 'Mais populares', description: 'Prioriza títulos conhecidos e bem avaliados.', icon: <Star /> },
                    { key: 'balanced', title: 'Equilibrado', description: 'Combina sucessos com descobertas menos óbvias.', icon: <SlidersHorizontal /> },
                    { key: 'surprises', title: 'Quero surpresas', description: 'Amplia a variedade e aceita escolhas inesperadas.', icon: <WandSparkles /> }
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      className={discoveryPreference === item.key ? 'is-selected' : ''}
                      onClick={() => setDiscoveryPreference(item.key as 'popular' | 'balanced' | 'surprises')}
                    >
                      {item.icon}<strong>{item.title}</strong><small>{item.description}</small>
                    </button>
                  ))}
                </div>
              </div>

              <div className="edit-profile-genre-toolbar">
                <div>
                  <h3>Gêneros</h3>
                  <p>Um gênero não pode estar em favoritos e evitar ao mesmo tempo.</p>
                </div>
                <label><Search /><input value={genreSearch} onChange={(event) => setGenreSearch(event.target.value)} placeholder="Buscar gênero" /></label>
              </div>

              <div className="edit-profile-genre-groups">
                <div className="edit-profile-genre-box is-favorite">
                  <header><div><Heart /><strong>Favoritos</strong><span>{favoriteGenres.length} selecionados</span></div><button type="button" onClick={() => setFavoriteGenres([])}>Limpar</button></header>
                  <div>{filteredGenres.map((genre) => {
                    const selected = favoriteGenres.includes(genre.id);
                    return <button key={`fav-${genre.id}`} type="button" className={selected ? 'is-selected' : ''} onClick={() => toggleGenre(genre.id, 'favorite')}>{selected && <Check />}<span>{genre.name}</span></button>;
                  })}</div>
                </div>

                <div className="edit-profile-genre-box is-avoid">
                  <header><div><AlertTriangle /><strong>Evitar</strong><span>{avoidGenres.length} selecionados</span></div><button type="button" onClick={() => setAvoidGenres([])}>Limpar</button></header>
                  <div>{filteredGenres.map((genre) => {
                    const selected = avoidGenres.includes(genre.id);
                    return <button key={`avoid-${genre.id}`} type="button" className={selected ? 'is-selected' : ''} onClick={() => toggleGenre(genre.id, 'avoid')}>{selected && <X />}<span>{genre.name}</span></button>;
                  })}</div>
                </div>
              </div>

              <div className="edit-profile-range-grid">
                <div>
                  <header><span><Star /> Nota mínima</span><strong>{minimumRating.toFixed(1)} ou superior</strong></header>
                  <input type="range" min="0" max="10" step="0.5" value={minimumRating} onChange={(event) => setMinimumRating(Number(event.target.value))} />
                  <footer><span>0</span><span>5</span><span>10</span></footer>
                </div>
                <label>
                  <span><Clock3 /> Duração máxima</span>
                  <select value={maximumRuntime ?? 'none'} onChange={(event) => setMaximumRuntime(event.target.value === 'none' ? null : Number(event.target.value))}>
                    <option value="none">Qualquer duração</option>
                    <option value="90">Até 90 minutos</option>
                    <option value="120">Até 120 minutos</option>
                    <option value="150">Até 150 minutos</option>
                  </select>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'roulette' && (
            <div className="edit-profile-section">
              <div className="edit-profile-section__title">
                <span><SlidersHorizontal /></span>
                <div><h2>Regras da roleta</h2><p>Controle como a VIDARIX prepara e executa os sorteios.</p></div>
                <button type="button" className="edit-profile-reset" onClick={handleResetPreferences}><RotateCcw /> Restaurar padrões</button>
              </div>

              <div className="edit-profile-switch-list">
                <SwitchRow title="Usar apenas meus streamings" description="Mostra títulos disponíveis nos serviços selecionados por você." checked={rouletteOnlyMyProviders} onChange={setRouletteOnlyMyProviders} icon={<Tv />} />
                <SwitchRow title="Evitar títulos já assistidos" description="Remove da roleta filmes e séries marcados como assistidos." checked={rouletteExcludeWatched} onChange={setRouletteExcludeWatched} icon={<Check />} />
                <SwitchRow title="Evitar resultados recentes" description="Reduz a chance de repetir os últimos títulos sorteados." checked={rouletteAvoidRecent} onChange={setRouletteAvoidRecent} icon={<RotateCcw />} />
                <SwitchRow title="Permitir escolhas surpresa" description="Inclui títulos fora das preferências quando isso melhora a variedade." checked={rouletteAllowSurprises} onChange={setRouletteAllowSurprises} icon={<WandSparkles />} />
                <SwitchRow title="Efeitos sonoros" description="Ativa sons discretos durante o giro e ao revelar o resultado." checked={soundEffects} onChange={setSoundEffects} icon={<Sparkles />} />
                <SwitchRow title="Animações da interface" description="Mantém transições, movimentos e efeitos visuais da experiência." checked={animations} onChange={setAnimations} icon={<Clapperboard />} />
              </div>

              <div className="edit-profile-rules-note">
                <ListVideo />
                <div><strong>As alterações afetam os próximos sorteios</strong><p>O histórico existente não será modificado.</p></div>
              </div>
            </div>
          )}
        </section>
      </div>

      {isDirty && (
        <div className="edit-profile-unsaved" role="region" aria-label="Alterações não salvas">
          <div><span /><p><strong>Você possui alterações não salvas</strong><small>Salve para aplicar as novas preferências ao seu perfil.</small></p></div>
          <div>
            <button type="button" onClick={() => restoreSnapshot(initialSnapshotRef.current)}>Descartar</button>
            <button type="button" onClick={handleSaveProfile} disabled={isFormInvalid || isSaving}>{isSaving ? <Loader2 className="animate-spin" /> : <Save />} Salvar alterações</button>
          </div>
        </div>
      )}

      <ImageCropModal
        isOpen={isCropModalOpen}
        onClose={() => setIsCropModalOpen(false)}
        currentImage={photoURL}
        userName={displayName}
        onSavePhoto={async (newPhotoDataUrl) => {
          if (!newPhotoDataUrl) {
            await removeAvatar();
            setPhotoURL(null);
            return;
          }

          setPhotoURL(newPhotoDataUrl);
          try {
            const parts = newPhotoDataUrl.split(',');
            const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/webp';
            const binary = atob(parts[1]);
            const bytes = new Uint8Array(binary.length);
            for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
            const result = await uploadAvatar(new Blob([bytes], { type: mime }));
            if (result.avatarUrl) setPhotoURL(result.avatarUrl);
          } catch (error) {
            console.error('Error uploading avatar:', error);
          }
        }}
      />
    </main>
  );
};
