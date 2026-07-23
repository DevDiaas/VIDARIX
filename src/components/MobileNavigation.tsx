import React from 'react';
import { Bookmark, Film, Home, Sparkles, Users } from 'lucide-react';

interface MobileNavigationProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  currentPath,
  onNavigate
}) => {
  const isCatalogActive =
    currentPath.startsWith('/filmes') ||
    currentPath.startsWith('/series') ||
    currentPath.startsWith('/catalogo');

  const isWatchlistActive = currentPath.startsWith('/minha-lista');
  const isRouletteActive = currentPath.startsWith('/roleta');
  const isCommunityActive = currentPath.startsWith('/comunidade');

  return (
    <nav className="vidarix-mobile-navigation" aria-label="Navegação mobile principal">
      <div className="vidarix-mobile-navigation__inner">
        <button
          type="button"
          onClick={() => onNavigate('/')}
          className={(currentPath === '/' || currentPath === '/inicio') ? 'is-active' : ''}
          aria-current={(currentPath === '/' || currentPath === '/inicio') ? 'page' : undefined}
        >
          <Home aria-hidden="true" />
          <span>Início</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('/catalogo')}
          className={isCatalogActive ? 'is-active' : ''}
          aria-current={isCatalogActive ? 'page' : undefined}
        >
          <Film aria-hidden="true" />
          <span>Catálogo</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('/roleta')}
          className={`vidarix-mobile-navigation__roulette ${isRouletteActive ? 'is-active' : ''}`}
          aria-label="Abrir Roleta VIDARIX"
          aria-current={isRouletteActive ? 'page' : undefined}
        >
          <span className="vidarix-mobile-navigation__roulette-icon">
            <Sparkles aria-hidden="true" />
          </span>
          <span>Roleta</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('/minha-lista')}
          className={isWatchlistActive ? 'is-active' : ''}
          aria-current={isWatchlistActive ? 'page' : undefined}
        >
          <Bookmark aria-hidden="true" />
          <span>Minha Lista</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('/comunidade')}
          className={isCommunityActive ? 'is-active' : ''}
          aria-current={isCommunityActive ? 'page' : undefined}
        >
          <Users aria-hidden="true" />
          <span>Comunidade</span>
        </button>
      </div>
    </nav>
  );
};
