import React, { useEffect, useState } from 'react';
import { Tv } from 'lucide-react';
import { MediaItem } from '../types';
import { Hero } from '../components/Hero';
import { MediaCarousel } from '../components/MediaCarousel';
import { HomeRouletteShowcase } from '../components/HomeRouletteShowcase';
import { streamingProviders, StreamingProvider } from '../data/streamingProviders';
import { StreamingProviderLogo } from '../components/StreamingProviderLogo';
import { fetchWatchProvidersBR } from '../services/tmdbApi';

interface HomePageProps {
  trending: MediaItem[];
  popularMovies: MediaItem[];
  popularTv: MediaItem[];
  topRated: MediaItem[];
  netflixMedia: MediaItem[];
  primeMedia: MediaItem[];
  disneyMedia: MediaItem[];
  maxMedia: MediaItem[];
  savedIds: Set<number>;
  onSelectMedia: (item: MediaItem) => void;
  onNavigate: (path: string) => void;
  onToggleWatchlist: (item: MediaItem, e: React.MouseEvent) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  trending,
  popularMovies,
  popularTv,
  topRated,
  netflixMedia,
  primeMedia,
  maxMedia,
  savedIds,
  onSelectMedia,
  onNavigate,
  onToggleWatchlist
}) => {
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

  return (
    <div className="vidarix-home">
      <div className="vidarix-home__frame">
        <Hero
          featuredItems={trending.slice(0, 5)}
          savedIds={savedIds}
          onSelectMedia={onSelectMedia}
          onOpenRoulette={() => onNavigate('/roleta')}
          onToggleWatchlist={onToggleWatchlist}
        />

        <HomeRouletteShowcase
          onOpenRoulette={() => onNavigate('/roleta')}
          onOpenWatchlist={() => onNavigate('/minha-lista')}
        />
      </div>

      <div className="vidarix-home__catalog">
        <MediaCarousel
          title="Em destaque"
          subtitle="Seleções populares para começar sua próxima sessão"
          items={trending}
          savedIds={savedIds}
          onSelectMedia={onSelectMedia}
          onToggleWatchlist={onToggleWatchlist}
          onSeeAll={() => onNavigate('/filmes?sort=popularity.desc')}
        />

        <MediaCarousel
          title="Séries populares"
          subtitle="Histórias para maratonar"
          items={popularTv}
          savedIds={savedIds}
          onSelectMedia={onSelectMedia}
          onToggleWatchlist={onToggleWatchlist}
          onSeeAll={() => onNavigate('/series')}
        />

        <section className="streaming-discovery">
          <div className="streaming-discovery__heading">
            <span><Tv /> Disponível no Brasil</span>
            <h2>Encontre títulos pela sua plataforma</h2>
            <p>Escolha um serviço para explorar filmes e séries disponíveis por assinatura.</p>
          </div>
          <div className="providers-grid providers-grid--catalog">
            {providersList.map((provider) => (
              <StreamingProviderLogo
                key={provider.slug}
                name={provider.name}
                logoUrl={provider.logoUrl}
                initials={provider.initials}
                onClick={() => onNavigate(`/filmes?provider=${provider.id}`)}
              />
            ))}
          </div>
        </section>

        <MediaCarousel
          title="Filmes populares"
          subtitle="Sucessos que estão conquistando o público"
          items={popularMovies}
          savedIds={savedIds}
          onSelectMedia={onSelectMedia}
          onToggleWatchlist={onToggleWatchlist}
          onSeeAll={() => onNavigate('/filmes')}
        />

        <MediaCarousel
          title="Mais bem avaliados"
          subtitle="Os favoritos do público e da crítica"
          items={topRated}
          savedIds={savedIds}
          onSelectMedia={onSelectMedia}
          onToggleWatchlist={onToggleWatchlist}
          onSeeAll={() => onNavigate('/filmes?sort=vote_average.desc')}
        />

        <MediaCarousel
          title="Na Netflix"
          items={netflixMedia}
          savedIds={savedIds}
          onSelectMedia={onSelectMedia}
          onToggleWatchlist={onToggleWatchlist}
          onSeeAll={() => onNavigate('/filmes?provider=8')}
        />

        <MediaCarousel
          title="No Prime Video"
          items={primeMedia}
          savedIds={savedIds}
          onSelectMedia={onSelectMedia}
          onToggleWatchlist={onToggleWatchlist}
          onSeeAll={() => onNavigate('/filmes?provider=119')}
        />

        <MediaCarousel
          title="Na Max"
          items={maxMedia}
          savedIds={savedIds}
          onSelectMedia={onSelectMedia}
          onToggleWatchlist={onToggleWatchlist}
          onSeeAll={() => onNavigate('/filmes?provider=1899')}
        />
      </div>
    </div>
  );
};
