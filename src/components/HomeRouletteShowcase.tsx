import React from 'react';
import {
  Bookmark,
  Clapperboard,
  Drama,
  Eye,
  Ghost,
  Laugh,
  RefreshCcw,
  Rocket,
  Sparkles
} from 'lucide-react';

interface HomeRouletteShowcaseProps {
  onOpenRoulette: () => void;
  onOpenWatchlist: () => void;
}

interface RouletteCategory {
  label: string;
  lines: string[];
  angle: number;
  icon: React.ComponentType<{ className?: string }>;
}

/**
 * Os limites dos setores ficam em 0°, 45°, 90°...
 * Portanto cada conteúdo deve ficar no centro: 22.5°, 67.5°...
 */
const categories: RouletteCategory[] = [
  { label: 'Ação', lines: ['AÇÃO'], angle: 22.5, icon: Rocket },
  { label: 'Drama', lines: ['DRAMA'], angle: 67.5, icon: Drama },
  { label: 'Comédia', lines: ['COMÉDIA'], angle: 112.5, icon: Laugh },
  { label: 'Suspense', lines: ['SUSPENSE'], angle: 157.5, icon: Eye },
  { label: 'Terror', lines: ['TERROR'], angle: 202.5, icon: Ghost },
  { label: 'Animação', lines: ['ANIMAÇÃO'], angle: 247.5, icon: Clapperboard },
  { label: 'Aventura', lines: ['AVENTURA'], angle: 292.5, icon: Sparkles },
  {
    label: 'Ficção científica',
    lines: ['FICÇÃO', 'CIENTÍFICA'],
    angle: 337.5,
    icon: Rocket
  }
];

function getLabelPosition(angle: number, radius = 32.5) {
  const radians = (angle * Math.PI) / 180;

  return {
    left: `${50 + radius * Math.sin(radians)}%`,
    top: `${50 - radius * Math.cos(radians)}%`
  };
}

export const HomeRouletteShowcase: React.FC<HomeRouletteShowcaseProps> = ({
  onOpenRoulette,
  onOpenWatchlist
}) => {
  return (
    <section className="home-roulette" aria-labelledby="home-roulette-title">
      <div className="home-roulette__copy">
        <span className="home-roulette__eyebrow">
          <Sparkles /> Descoberta inteligente
        </span>
        <h2 id="home-roulette-title">O que vamos assistir hoje?</h2>
        <p>Escolha seus filtros ou deixe a sorte encontrar o título certo para sua noite.</p>

        <div className="home-roulette__filters" aria-hidden="true">
          <span><small>Categoria</small>Todos</span>
          <span><small>Plataforma</small>Todas</span>
          <span><small>Tipo</small>Todos</span>
        </div>

        <div className="home-roulette__chips" aria-label="Exemplos de plataformas">
          <span>Netflix</span>
          <span>Prime Video</span>
          <span>Disney+</span>
          <span>Max</span>
          <span>Paramount+</span>
        </div>
      </div>

      <div className="home-roulette__visual" aria-hidden="true">
        <div className="home-roulette__pointer" />

        <div className="home-roulette__wheel">
          {categories.map(({ label, icon: Icon, angle, lines }) => {
            const position = getLabelPosition(angle);

            return (
              <span
                key={label}
                className={`home-roulette__label${lines.length > 1 ? ' is-wide' : ''}`}
                style={position}
              >
                <Icon />
                <b>
                  {lines.map((line) => (
                    <em key={line}>{line}</em>
                  ))}
                </b>
              </span>
            );
          })}

          <div className="home-roulette__hub">
            <img src="/brand/vidarix-symbol.png" alt="" />
          </div>
        </div>
      </div>

      <div className="home-roulette__actions">
        <button className="home-roulette__spin" onClick={onOpenRoulette}>
          <RefreshCcw />
          <span>Girar a roleta</span>
        </button>

        <div className="home-roulette__watchlist">
          <p>Adicione títulos à sua lista para deixar o sorteio ainda melhor.</p>
          <button onClick={onOpenWatchlist}>
            <Bookmark />
            <span>Ir para Minha Lista</span>
          </button>
        </div>
      </div>
    </section>
  );
};
