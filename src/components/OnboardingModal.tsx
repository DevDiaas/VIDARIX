import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';
import { UserProfile } from '../types';
import { streamingProviders, StreamingProvider } from '../data/streamingProviders';
import { StreamingProviderLogo } from './StreamingProviderLogo';
import { TMDB_GENRES } from '../data/genres';
import { fetchWatchProvidersBR } from '../services/tmdbApi';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveProfile: (updatedProfile: Partial<UserProfile>) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onSaveProfile
}) => {
  const [step, setStep] = useState(1);
  const [selectedPlatforms, setSelectedPlatforms] = useState<number[]>([8, 119, 337, 1899]);
  const [selectedGenres, setSelectedGenres] = useState<number[]>([28, 878, 18, 35]);
  const [preference, setPreference] = useState<'all' | 'movie' | 'tv'>('all');
  const [providersList, setProvidersList] = useState<StreamingProvider[]>(streamingProviders);

  useEffect(() => {
    let mounted = true;
    fetchWatchProvidersBR().then((providers) => {
      if (mounted) setProvidersList([...providers]);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!isOpen) return null;

  const togglePlatform = (id: number) => {
    setSelectedPlatforms((current) =>
      current.includes(id) ? current.filter((providerId) => providerId !== id) : [...current, id]
    );
  };

  const toggleGenre = (id: number) => {
    setSelectedGenres((current) =>
      current.includes(id) ? current.filter((genreId) => genreId !== id) : [...current, id]
    );
  };

  const finish = () => {
    onSaveProfile({
      streamingProviders: selectedPlatforms,
      favoriteGenres: selectedGenres,
      mediaPreference: preference,
      onboardingCompleted: true
    });
    onClose();
  };

  return (
    <div className="onboarding-backdrop" role="presentation">
      <section className="onboarding-card" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
        <button className="onboarding-skip" onClick={finish}>
          <span>Pular onboarding</span>
          <X />
        </button>

        <header className="onboarding-header">
          <div className="onboarding-brand-mark">
            <img src="/brand/vidarix-symbol.png" alt="Símbolo VIDARIX" />
          </div>
          <h2 id="onboarding-title">Bem-vindo à VIDARIX!</h2>
          <p>Personalize sua experiência para receber descobertas que combinam com você.</p>
        </header>

        <div className="onboarding-progress" aria-label={`Etapa ${step} de 3`}>
          {[1, 2, 3].map((item) => <span key={item} className={step >= item ? 'is-active' : ''} />)}
        </div>

        {step === 1 && (
          <div className="onboarding-step">
            <h3>1. Quais plataformas de streaming você assina?</h3>
            <div className="providers-grid providers-grid--onboarding">
              {providersList.map((provider) => (
                <StreamingProviderLogo
                  key={provider.slug}
                  name={provider.name}
                  logoUrl={provider.logoUrl}
                  selected={selectedPlatforms.includes(provider.id)}
                  initials={provider.initials}
                  onClick={() => togglePlatform(provider.id)}
                />
              ))}
            </div>
            <button className="onboarding-primary" onClick={() => setStep(2)}>
              <span>Próximo passo</span>
              <ArrowRight />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="onboarding-step">
            <h3>2. Quais são seus gêneros favoritos?</h3>
            <div className="onboarding-genres">
              {TMDB_GENRES.slice(0, 18).map((genre) => {
                const selected = selectedGenres.includes(genre.id);
                return (
                  <button
                    key={genre.id}
                    className={selected ? 'is-selected' : ''}
                    onClick={() => toggleGenre(genre.id)}
                  >
                    {selected && <Check />}
                    <span>{genre.name}</span>
                  </button>
                );
              })}
            </div>
            <div className="onboarding-navigation">
              <button className="onboarding-secondary" onClick={() => setStep(1)}>
                <ArrowLeft /> Voltar
              </button>
              <button className="onboarding-primary" onClick={() => setStep(3)}>
                Próximo passo <ArrowRight />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="onboarding-step">
            <h3>3. O que você prefere assistir?</h3>
            <div className="onboarding-preferences">
              {[
                { id: 'all', label: 'Filmes e séries', description: 'Quero variedade' },
                { id: 'movie', label: 'Filmes', description: 'Sessões completas' },
                { id: 'tv', label: 'Séries', description: 'Histórias para maratonar' }
              ].map((item) => (
                <button
                  key={item.id}
                  className={preference === item.id ? 'is-selected' : ''}
                  onClick={() => setPreference(item.id as 'all' | 'movie' | 'tv')}
                >
                  <strong>{item.label}</strong>
                  <span>{item.description}</span>
                </button>
              ))}
            </div>
            <div className="onboarding-navigation">
              <button className="onboarding-secondary" onClick={() => setStep(2)}>
                <ArrowLeft /> Voltar
              </button>
              <button className="onboarding-primary" onClick={finish}>
                Entrar na VIDARIX <ArrowRight />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
