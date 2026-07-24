import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Cloud,
  CloudOff,
  Compass,
  Eye,
  EyeOff,
  Film,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  Tv,
  User,
  Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { streamingProviders, type StreamingProvider } from '../data/streamingProviders';
import { TMDB_GENRES } from '../data/genres';
import { fetchWatchProvidersBR } from '../services/tmdbApi';
import { StreamingProviderLogo } from '../components/StreamingProviderLogo';
import type { UserProfile } from '../types';

interface AuthPageProps {
  mode: 'login' | 'register' | 'forgot-password' | 'reset-password';
  onNavigate: (path: string) => void;
  onAddToast?: (title: string, desc?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

type RegistrationStep = 1 | 2 | 3 | 4;
type MediaPreference = UserProfile['mediaPreference'];
type DiscoveryPreference = NonNullable<UserProfile['discoveryPreference']>;

const MAX_GENRES = 8;
const MIN_GENRES = 3;

const discoveryOptions: Array<{
  id: DiscoveryPreference;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'popular',
    title: 'Mais populares',
    description: 'Prioriza lançamentos, sucessos e títulos em alta.',
    icon: Users
  },
  {
    id: 'balanced',
    title: 'Equilibrado',
    description: 'Mistura popularidade, nota e compatibilidade com seu perfil.',
    icon: Compass
  },
  {
    id: 'surprises',
    title: 'Quero surpresas',
    description: 'Inclui descobertas menos óbvias e títulos fora da sua bolha.',
    icon: Sparkles
  }
];


export const AuthPage: React.FC<AuthPageProps> = ({ mode, onNavigate, onAddToast }) => {
  const {
    signIn,
    signUp,
    signInWithGoogle,
    resetPasswordForEmail,
    updatePassword,
    updateProfile
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [registrationComplete, setRegistrationComplete] = useState(false);

  const [registrationStep, setRegistrationStep] = useState<RegistrationStep>(1);
  const [registrationDirection, setRegistrationDirection] = useState<'forward' | 'back'>('forward');
  const [selectedPlatforms, setSelectedPlatforms] = useState<number[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [mediaPreference, setMediaPreference] = useState<MediaPreference>('all');
  const [discoveryPreference, setDiscoveryPreference] = useState<DiscoveryPreference>('balanced');
  const [publicProfile, setPublicProfile] = useState(true);
  const [providersList, setProvidersList] = useState<StreamingProvider[]>(streamingProviders);

  useEffect(() => {
    if (mode !== 'register') return;
    let mounted = true;

    fetchWatchProvidersBR()
      .then((providers) => {
        if (mounted && providers.length > 0) setProvidersList([...providers]);
      })
      .catch(() => {
        if (mounted) setProvidersList(streamingProviders);
      });

    return () => {
      mounted = false;
    };
  }, [mode]);

  const selectedProviderNames = useMemo(
    () => providersList.filter((provider) => selectedPlatforms.includes(provider.id)).map((provider) => provider.name),
    [providersList, selectedPlatforms]
  );

  const selectedGenreNames = useMemo(
    () => TMDB_GENRES.filter((genre) => selectedGenres.includes(genre.id)).map((genre) => genre.name),
    [selectedGenres]
  );

  const clearMessages = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const validateAccountStep = () => {
    if (!fullName.trim() || !username.trim() || !email.trim() || !password) {
      setErrorMessage('Preencha nome, usuário, e-mail e senha para continuar.');
      return false;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setErrorMessage('Digite um endereço de e-mail válido.');
      return false;
    }
    if (!/^[a-zA-Z0-9._]{3,24}$/.test(username.trim())) {
      setErrorMessage('O usuário deve ter entre 3 e 24 caracteres e usar apenas letras, números, ponto ou underline.');
      return false;
    }
    if (password.length < 6) {
      setErrorMessage('A senha deve conter no mínimo 6 caracteres.');
      return false;
    }
    if (password !== confirmPassword) {
      setErrorMessage('As senhas digitadas não coincidem.');
      return false;
    }
    return true;
  };

  const goToNextRegistrationStep = () => {
    clearMessages();

    if (registrationStep === 1 && !validateAccountStep()) return;
    if (registrationStep === 2 && selectedPlatforms.length === 0) {
      setErrorMessage('Escolha pelo menos um streaming para personalizarmos seu catálogo.');
      return;
    }
    if (registrationStep === 3 && selectedGenres.length < MIN_GENRES) {
      setErrorMessage(`Escolha pelo menos ${MIN_GENRES} gêneros favoritos.`);
      return;
    }

    setRegistrationDirection('forward');
    setRegistrationStep((current) => Math.min(4, current + 1) as RegistrationStep);
  };

  const togglePlatform = (id: number) => {
    clearMessages();
    setSelectedPlatforms((current) =>
      current.includes(id) ? current.filter((providerId) => providerId !== id) : [...current, id]
    );
  };

  const toggleGenre = (id: number) => {
    clearMessages();
    setSelectedGenres((current) => {
      if (current.includes(id)) return current.filter((genreId) => genreId !== id);
      if (current.length >= MAX_GENRES) {
        setErrorMessage(`Você pode escolher até ${MAX_GENRES} gêneros nesta etapa.`);
        return current;
      }
      return [...current, id];
    });
  };

  const finishRegistration = async () => {
    clearMessages();
    setIsLoading(true);

    const preferenceData: Partial<UserProfile> = {
      streamingProviders: selectedPlatforms,
      favoriteGenres: selectedGenres,
      avoidGenres: [],
      mediaPreference,
      discoveryPreference,
      onboardingCompleted: true,
      privacy: {
        publicProfile,
        showLists: true,
        showRatings: true,
        showStatistics: true
      }
    };

    try {
      const result = await signUp(
        email.trim(),
        password,
        fullName.trim(),
        username.trim(),
        preferenceData
      );

      if (result.error) {
        setErrorMessage(result.error);
        setRegistrationDirection('back');
        setRegistrationStep(1);
        return;
      }

      if (result.requiresEmailConfirmation) {
        setRegistrationComplete(true);
        setSuccessMessage(
          'Conta criada! Enviamos um link de confirmação para o seu e-mail. Confirme antes de entrar.'
        );
        return;
      }

      await updateProfile(preferenceData);
      onAddToast?.(
        'Sua VIDARIX está pronta!',
        'Conta criada e recomendações personalizadas ativadas.',
        'success'
      );
      onNavigate('/inicio');
    } catch (error: any) {
      setErrorMessage(error?.message || 'Não foi possível criar a conta. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStandardSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    clearMessages();
    setIsLoading(true);

    try {
      if (mode === 'login') {
        if (!email || !password) {
          setErrorMessage('Preencha o e-mail e a senha.');
          return;
        }

        const result = await signIn(email, password);
        if (result.error) {
          setErrorMessage(result.error);
        } else {
          onAddToast?.('Login realizado!', 'Bem-vindo de volta à VIDARIX.', 'success');
          onNavigate('/inicio');
        }
      }

      if (mode === 'forgot-password') {
        if (!email) {
          setErrorMessage('Informe o e-mail cadastrado.');
          return;
        }
        const result = await resetPasswordForEmail(email);
        if (result.error) setErrorMessage(result.error);
        else setSuccessMessage('Enviamos um link de recuperação para o seu e-mail.');
      }

      if (mode === 'reset-password') {
        if (!password || password.length < 6) {
          setErrorMessage('A nova senha deve ter pelo menos 6 caracteres.');
          return;
        }
        if (password !== confirmPassword) {
          setErrorMessage('As senhas não coincidem.');
          return;
        }
        const result = await updatePassword(password);
        if (result.error) setErrorMessage(result.error);
        else {
          onAddToast?.('Senha redefinida!', 'Acesse sua conta com a nova senha.', 'success');
          onNavigate('/entrar');
        }
      }
    } catch (error: any) {
      setErrorMessage(error?.message || 'Ocorreu um erro. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    clearMessages();
    setIsLoading(true);
    const result = await signInWithGoogle();
    if (result.error) {
      setErrorMessage(result.error);
      setIsLoading(false);
    }
  };

  if (mode === 'register') {
    return (
      <div className="account-onboarding-page">
        <div className="account-onboarding-page__glow account-onboarding-page__glow--one" />
        <div className="account-onboarding-page__glow account-onboarding-page__glow--two" />

        <header className="account-onboarding-topbar">
          <button type="button" className="account-onboarding-brand" onClick={() => onNavigate('/')}>
            <img src="/brand/vidarix-logo-horizontal.png" alt="VIDARIX" />
          </button>
          <div className="account-onboarding-topbar__actions">
            <span className={`account-mode-badge ${isSupabaseConfigured ? 'is-cloud' : 'is-local'}`}>
              {isSupabaseConfigured ? <Cloud /> : <CloudOff />}
              {isSupabaseConfigured ? 'Conta sincronizada' : 'Conta local'}
            </span>
            <button type="button" className="account-login-link" onClick={() => onNavigate('/entrar')}>
              Já tenho conta
            </button>
          </div>
        </header>

        <main className="account-onboarding-layout">
          <aside className="account-onboarding-aside">
            <span className="account-onboarding-eyebrow"><Sparkles /> Sua experiência começa aqui</span>
            <h1>Crie sua conta e personalize a sua VIDARIX.</h1>
            <p>
              Escolha streamings, gêneros e o seu estilo de descoberta. Em poucos passos, catálogo, roleta e comunidade já começam ajustados ao seu perfil.
            </p>

            <div className="account-onboarding-trust">
              <span><ShieldCheck /> Preferências seguras</span>
              <span><Check /> Você altera tudo depois</span>
            </div>


            <div className="account-onboarding-benefits">
              <div><Compass /><span><strong>Descobertas melhores</strong><small>Recomendações alinhadas aos seus gêneros.</small></span></div>
              <div><Tv /><span><strong>Onde assistir</strong><small>Resultados priorizados pelos seus streamings.</small></span></div>
              <div><Users /><span><strong>Comunidade personalizada</strong><small>Amigos e grupos com interesses parecidos.</small></span></div>
            </div>

            <div className="account-onboarding-summary">
              <span>Prévia do seu perfil</span>
              <strong>{fullName.trim() || 'Novo perfil VIDARIX'}</strong>
              <small>@{username.trim() || 'cinefilo.vidarix'}</small>
              <div>
                <b>{selectedPlatforms.length}</b><span>streamings</span>
                <b>{selectedGenres.length}</b><span>gêneros</span>
              </div>
              <div className="account-onboarding-summary__chips">
                <span className="account-onboarding-summary__chip">{mediaPreference === 'movie' ? 'Filmes' : mediaPreference === 'tv' ? 'Séries' : 'Filmes + Séries'}</span>
                <span className="account-onboarding-summary__chip">{discoveryPreference === 'popular' ? 'Mais populares' : discoveryPreference === 'surprises' ? 'Surpresas' : 'Equilibrado'}</span>
                <span className="account-onboarding-summary__chip">{publicProfile ? 'Perfil público' : 'Perfil privado'}</span>
              </div>
              {selectedProviderNames.length > 0 ? <p>{selectedProviderNames.slice(0, 4).join(' • ')}</p> : <p>Suas escolhas aparecem aqui conforme você avança.</p>}
              {selectedGenreNames.length > 0 && <p>{selectedGenreNames.slice(0, 5).join(' • ')}</p>}
            </div>
          </aside>

          <section className="account-onboarding-card" aria-labelledby="account-onboarding-title">
            {errorMessage && <div className="account-message account-message--error">{errorMessage}</div>}
            {successMessage && <div className="account-message account-message--success"><Check /> {successMessage}</div>}

            {registrationComplete ? (
              <div className="account-onboarding-step account-onboarding-step--forward">
                <div className="account-onboarding-step__heading">
                  <span><Mail /> Confirme seu e-mail</span>
                  <h2 id="account-onboarding-title">Sua conta foi criada.</h2>
                  <p>Abra a mensagem enviada para <strong>{email}</strong>, confirme o cadastro e depois entre na VIDARIX.</p>
                </div>
                <div className="account-step-panel">
                  <strong>Suas preferências estão salvas</strong>
                  <p>Streamings, gêneros e personalização serão sincronizados após a confirmação do e-mail.</p>
                </div>
                <button type="button" className="account-primary-button" onClick={() => onNavigate('/entrar')}>
                  Ir para entrar <ArrowRight />
                </button>
              </div>
            ) : registrationStep === 1 && (
              <div className={`account-onboarding-step account-onboarding-step--${registrationDirection}`}>
                <div className="account-onboarding-step__heading">
                  <span><User /> Sua conta</span>
                  <h2 id="account-onboarding-title">Como vamos chamar você?</h2>
                  <p>Essas informações serão usadas no seu perfil e na comunidade.</p>
                </div>

                <div className="account-step-panel">
                  <strong>Seu perfil começa aqui</strong>
                  <p>Escolha um nome e um @ que façam sentido para amigos, grupos e recomendações dentro da comunidade.</p>
                </div>

                <div className="account-form-grid">
                  <label className="account-field account-field--full">
                    <span>Nome completo</span>
                    <div><User /><input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ex.: Alex Silva" autoComplete="name" /></div>
                  </label>
                  <label className="account-field">
                    <span>Nome de usuário</span>
                    <div><b>@</b><input value={username} onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))} placeholder="alex.cine" autoComplete="username" /></div>
                  </label>
                  <label className="account-field">
                    <span>E-mail</span>
                    <div><Mail /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" autoComplete="email" /></div>
                  </label>
                  <label className="account-field">
                    <span>Senha</span>
                    <div><Lock /><input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo de 6 caracteres" autoComplete="new-password" /><button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>{showPassword ? <EyeOff /> : <Eye />}</button></div>
                  </label>
                  <label className="account-field">
                    <span>Confirmar senha</span>
                    <div><ShieldCheck /><input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repita sua senha" autoComplete="new-password" /></div>
                  </label>
                </div>
              </div>
            )}

            {registrationStep === 2 && (
              <div className={`account-onboarding-step account-onboarding-step--${registrationDirection}`}>
                <div className="account-onboarding-step__heading">
                  <span><Tv /> Seus streamings</span>
                  <h2 id="account-onboarding-title">Onde você costuma assistir?</h2>
                  <p>Escolha todos os serviços que você assina ou usa com frequência.</p>
                </div>
                <div className="account-provider-grid">
                  {providersList.map((provider) => (
                    <StreamingProviderLogo
                      key={`${provider.slug}-${provider.id}`}
                      name={provider.name}
                      logoUrl={provider.logoUrl}
                      initials={provider.initials}
                      selected={selectedPlatforms.includes(provider.id)}
                      onClick={() => togglePlatform(provider.id)}
                    />
                  ))}
                </div>
                <div className="account-step-panel">
                  <strong>Seu catálogo fica mais inteligente</strong>
                  <p>Vamos priorizar títulos dos serviços que você realmente usa, inclusive na roleta e nas recomendações.</p>
                </div>
                <div className="account-selection-hint"><Check /> {selectedPlatforms.length} selecionado(s)</div>
              </div>
            )}

            {registrationStep === 3 && (
              <div className={`account-onboarding-step account-onboarding-step--${registrationDirection}`}>
                <div className="account-onboarding-step__heading">
                  <span><Film /> Seus gêneros</span>
                  <h2 id="account-onboarding-title">O que prende sua atenção?</h2>
                  <p>Escolha entre {MIN_GENRES} e {MAX_GENRES} gêneros para começar.</p>
                </div>
                <div className="account-genre-grid">
                  {TMDB_GENRES.slice(0, 20).map((genre) => {
                    const selected = selectedGenres.includes(genre.id);
                    return (
                      <button key={genre.id} type="button" className={selected ? 'is-selected' : ''} onClick={() => toggleGenre(genre.id)}>
                        {selected && <Check />}
                        <span>{genre.name}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="account-step-panel">
                  <strong>Escolha o que mais combina com você</strong>
                  <p>Seus gêneros favoritos alimentam a home, o catálogo, a roleta e as conexões da comunidade.</p>
                </div>
                <div className="account-selection-hint"><Check /> {selectedGenres.length} de {MAX_GENRES} selecionado(s)</div>
              </div>
            )}

            {registrationStep === 4 && (
              <div className={`account-onboarding-step account-onboarding-step--${registrationDirection}`}>
                <div className="account-onboarding-step__heading">
                  <span><Sparkles /> Personalização final</span>
                  <h2 id="account-onboarding-title">Como a VIDARIX deve descobrir por você?</h2>
                  <p>Essas escolhas podem ser alteradas depois em Editar perfil.</p>
                </div>

                <div className="account-preference-section">
                  <h3>Você prefere</h3>
                  <div className="account-media-options">
                    {[
                      { id: 'movie' as const, title: 'Filmes', description: 'Histórias completas', icon: Film },
                      { id: 'tv' as const, title: 'Séries', description: 'Conteúdo para maratonar', icon: Tv },
                      { id: 'all' as const, title: 'Ambos', description: 'Quero variedade', icon: Sparkles }
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <button key={item.id} type="button" className={mediaPreference === item.id ? 'is-selected' : ''} onClick={() => setMediaPreference(item.id)}>
                          <Icon /><strong>{item.title}</strong><span>{item.description}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="account-preference-section">
                  <h3>Estilo de descoberta</h3>
                  <div className="account-discovery-options">
                    {discoveryOptions.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button key={item.id} type="button" className={discoveryPreference === item.id ? 'is-selected' : ''} onClick={() => setDiscoveryPreference(item.id)}>
                          <Icon /><span><strong>{item.title}</strong><small>{item.description}</small></span>{discoveryPreference === item.id && <Check />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label className="account-privacy-option">
                  <span><strong>Perfil público na comunidade</strong><small>Permite que outros cinéfilos encontrem seu perfil, listas e recomendações.</small></span>
                  <input type="checkbox" checked={publicProfile} onChange={(e) => setPublicProfile(e.target.checked)} />
                  <i />
                </label>

                <div className="account-step-panel">
                  <strong>Resumo final</strong>
                  <p>Você está pronto para receber sugestões personalizadas e encontrar pessoas com gostos parecidos.</p>
                </div>
              </div>
            )}

            {!registrationComplete && <footer className="account-onboarding-footer">
              {registrationStep > 1 ? (
                <button type="button" className="account-secondary-button" onClick={() => { clearMessages(); setRegistrationDirection('back'); setRegistrationStep((current) => Math.max(1, current - 1) as RegistrationStep); }}>
                  <ArrowLeft /> Voltar
                </button>
              ) : (
                <button type="button" className="account-secondary-button" onClick={() => onNavigate('/entrar')}>
                  <ArrowLeft /> Entrar
                </button>
              )}

              {registrationStep < 4 ? (
                <button type="button" className="account-primary-button" onClick={goToNextRegistrationStep}>
                  Continuar <ArrowRight />
                </button>
              ) : (
                <button type="button" className="account-primary-button" onClick={finishRegistration} disabled={isLoading}>
                  {isLoading ? <><Loader2 className="is-spinning" /> Criando sua conta...</> : <>Entrar na VIDARIX <ArrowRight /></>}
                </button>
              )}
            </footer>}
          </section>
        </main>
      </div>
    );
  }

  const title = mode === 'login' ? 'Acessar sua conta' : mode === 'forgot-password' ? 'Recuperar sua senha' : 'Definir uma nova senha';
  const description = mode === 'login'
    ? 'Entre para sincronizar sua lista, roleta, amigos e recomendações.'
    : mode === 'forgot-password'
      ? 'Informe o e-mail da conta para receber as instruções.'
      : 'Escolha uma nova senha segura para a sua conta.';

  return (
    <div className="auth-experience-page">
      <div className="auth-experience-page__background" />
      <div className="auth-experience-page__glow auth-experience-page__glow--one" />
      <div className="auth-experience-page__glow auth-experience-page__glow--two" />

      <section className="auth-experience-layout">
        <aside className="auth-experience-aside">
          <button type="button" className="auth-experience-brand" onClick={() => onNavigate('/')}>
            <img src="/brand/vidarix-logo-horizontal.png" alt="VIDARIX" />
          </button>
          <span className="auth-experience-eyebrow"><Sparkles /> Sua próxima descoberta começa aqui</span>
          <h1>{mode === 'login' ? 'Volte para a sua VIDARIX.' : mode === 'forgot-password' ? 'Recupere o acesso à sua experiência.' : 'Proteja sua conta com uma nova senha.'}</h1>
          <p>
            Continue sua lista, recomendações, amizades, grupos e histórico da roleta exatamente de onde parou.
          </p>

          <div className="auth-experience-features">
            <div><Compass /><span><strong>Descobertas personalizadas</strong><small>Catálogo e roleta ajustados ao seu perfil.</small></span></div>
            <div><Users /><span><strong>Comunidade conectada</strong><small>Amigos, grupos e recomendações em um só lugar.</small></span></div>
            <div><ShieldCheck /><span><strong>Preferências protegidas</strong><small>Seus dados continuam sob seu controle.</small></span></div>
          </div>

          <div className="auth-experience-visual" aria-hidden="true">
            <span><img src="/brand/vidarix-symbol.png" alt="" /></span>
            <i className="auth-experience-visual__ring auth-experience-visual__ring--one" />
            <i className="auth-experience-visual__ring auth-experience-visual__ring--two" />
          </div>
        </aside>

        <section className="auth-simple-card auth-simple-card--premium">
          <div className="auth-simple-card__top">
            <span className={`account-mode-badge ${isSupabaseConfigured ? 'is-cloud' : 'is-local'}`}>
              {isSupabaseConfigured ? <Cloud /> : <CloudOff />}
              {isSupabaseConfigured ? 'Sincronização ativa' : 'Modo local ativo'}
            </span>
            {mode === 'login' && (
              <button type="button" className="auth-create-account-link" onClick={() => onNavigate('/criar-conta')}>Criar conta</button>
            )}
          </div>

          <span className="auth-simple-card__eyebrow"><KeyRound /> Acesso VIDARIX</span>
          <h1>{title}</h1>
          <p>{description}</p>

          {errorMessage && <div className="account-message account-message--error">{errorMessage}</div>}
          {successMessage && <div className="account-message account-message--success"><Check /> {successMessage}</div>}

          <form onSubmit={handleStandardSubmit} className="auth-simple-form">
            {(mode === 'login' || mode === 'forgot-password') && (
              <label className="account-field">
                <span>E-mail</span>
                <div><Mail /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" autoComplete="email" /></div>
              </label>
            )}

            {(mode === 'login' || mode === 'reset-password') && (
              <label className="account-field">
                <span>{mode === 'login' ? 'Senha' : 'Nova senha'}</span>
                <div><Lock /><input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Sua senha" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /><button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>{showPassword ? <EyeOff /> : <Eye />}</button></div>
              </label>
            )}

            {mode === 'reset-password' && (
              <label className="account-field">
                <span>Confirmar nova senha</span>
                <div><ShieldCheck /><input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repita sua senha" autoComplete="new-password" /></div>
              </label>
            )}

            <button className="account-primary-button" type="submit" disabled={isLoading}>
              {isLoading ? <><Loader2 className="is-spinning" /> Processando...</> : mode === 'login' ? <><KeyRound /> Entrar</> : mode === 'forgot-password' ? <><Mail /> Enviar instruções</> : <><ShieldCheck /> Atualizar senha</>}
            </button>
          </form>

          {mode === 'login' && (
            <>
              <div className="auth-divider"><span>ou continue com</span></div>
              <button type="button" className="auth-google-button" onClick={handleGoogleAuth} disabled={!isSupabaseConfigured || isLoading}>
                Continuar com Google
              </button>
              <div className="auth-simple-links">
                <button type="button" onClick={() => onNavigate('/recuperar-senha')}>Esqueci minha senha</button>
                <button type="button" onClick={() => onNavigate('/criar-conta')}>Ainda não tenho conta</button>
              </div>
            </>
          )}

          {mode !== 'login' && (
            <button type="button" className="auth-back-link" onClick={() => onNavigate('/entrar')}><ArrowLeft /> Voltar para entrar</button>
          )}
        </section>
      </section>
    </div>
  );};
