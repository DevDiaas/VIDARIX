import React from 'react';
import {
  ArrowRight,
  CheckCircle2,
  MonitorSmartphone,
  PlayCircle,
  Search,
  Sparkles,
  Star,
  Tv,
  Users
} from 'lucide-react';

interface LandingPageProps {
  onNavigate: (path: string) => void;
}

const featureCards = [
  {
    icon: Search,
    title: 'Descoberta inteligente',
    description: 'Encontre filmes e séries por gênero, nota, popularidade e streaming sem perder tempo.'
  },
  {
    icon: Sparkles,
    title: 'Roleta personalizada',
    description: 'Receba uma escolha baseada nos seus gostos, serviços assinados e histórico dentro do app.'
  },
  {
    icon: Tv,
    title: 'Onde assistir',
    description: 'Veja os serviços disponíveis no Brasil e priorize as plataformas que você já utiliza.'
  },
  {
    icon: Users,
    title: 'Comunidade cinéfila',
    description: 'Adicione amigos, envie recomendações, participe de grupos e converse sobre cada título.'
  }
];

const bullets = [
  'Catálogo de filmes, séries, tendências e lançamentos',
  'Perfil com preferências, listas e histórico de descobertas',
  'Amigos, grupos, recomendações e conversas sobre títulos',
  'Experiência responsiva para desktop, notebook, tablet e celular'
];

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  return (
    <div className="vidarix-landing">
      <header className="vidarix-landing__header">
        <button className="vidarix-landing__brand" type="button" onClick={() => onNavigate('/')}>
          <img src="/brand/vidarix-logo-horizontal.png" alt="VIDARIX" />
        </button>

        <nav className="vidarix-landing__nav" aria-label="Seções da landing page">
          <a href="#recursos">Recursos</a>
          <a href="#experiencia">Experiência</a>
          <a href="#beneficios">Benefícios</a>
          <a href="#cta-final">Começar</a>
        </nav>

        <div className="vidarix-landing__header-actions">
          <button type="button" className="vidarix-landing__ghost-button" onClick={() => onNavigate('/entrar')}>
            Entrar
          </button>
          <button type="button" className="vidarix-landing__primary-button" onClick={() => onNavigate('/criar-conta')}>
            Acesse agora
            <ArrowRight aria-hidden="true" />
          </button>
        </div>
      </header>

      <main className="vidarix-landing__content">
        <section className="vidarix-landing__hero" id="topo">
          <div className="vidarix-landing__hero-copy">
            <div className="vidarix-landing__eyebrow">
              <Sparkles aria-hidden="true" />
              <span>Sua próxima descoberta começa aqui</span>
            </div>

            <h1>
              Descubra o que assistir e viva o cinema de um jeito mais <span>VIDARIX.</span>
            </h1>

            <p>
              Filmes, séries, streamings, roleta personalizada e uma comunidade inteira em um único lugar.
              Escolha menos, descubra mais e compartilhe cada experiência com seus amigos.
            </p>

            <div className="vidarix-landing__hero-actions">
              <button type="button" className="vidarix-landing__primary-button" onClick={() => onNavigate('/criar-conta')}>
                Acesse agora
                <ArrowRight aria-hidden="true" />
              </button>
              <a className="vidarix-landing__secondary-link" href="#experiencia">
                <PlayCircle aria-hidden="true" />
                Ver a experiência
              </a>
            </div>

            <div className="vidarix-landing__hero-metrics">
              <div>
                <strong>Catálogo completo</strong>
                <span>Filmes, séries, tendências, notas e serviços em um só lugar.</span>
              </div>
              <div>
                <strong>Roleta inteligente</strong>
                <span>Uma recomendação ajustada aos seus gostos e streamings.</span>
              </div>
              <div>
                <strong>Comunidade</strong>
                <span>Amigos, grupos, recomendações e conversas sobre cada título.</span>
              </div>
            </div>
          </div>

          <div className="vidarix-landing__showcase" id="experiencia">
            <div className="vidarix-browser-mockup">
              <div className="vidarix-browser-mockup__bar">
                <span />
                <span />
                <span />
                <div className="vidarix-browser-mockup__address">vidarix.com/inicio</div>
              </div>

              <div className="vidarix-browser-mockup__screen">
                <div className="vidarix-browser-mockup__topbar">
                  <div className="vidarix-browser-mockup__topbar-brand">
                    <img src="/brand/vidarix-symbol.png" alt="VIDARIX" />
                    <span>VIDARIX</span>
                  </div>
                  <div className="vidarix-browser-mockup__topbar-nav">
                    <span className="is-active">Início</span>
                    <span>Filmes</span>
                    <span>Séries</span>
                    <span>Roleta</span>
                    <span>Comunidade</span>
                  </div>
                  <div className="vidarix-browser-mockup__topbar-search">
                    <Search />
                    <span>Buscar títulos...</span>
                  </div>
                </div>

                <div className="vidarix-browser-mockup__main">
                  <div className="vidarix-browser-mockup__hero-card">
                    <div className="vidarix-browser-mockup__hero-copy-block">
                      <small>FILME EM ALTA</small>
                      <h3>ECLIPSE</h3>
                      <p>Descubra um novo título, veja onde assistir e salve na sua lista em poucos segundos.</p>
                      <div className="vidarix-browser-mockup__hero-buttons">
                        <span>Ver detalhes</span>
                        <span>Onde assistir</span>
                      </div>
                    </div>
                    <div className="vidarix-browser-mockup__roulette-mini">
                      <div className="vidarix-browser-mockup__roulette-core">
                        <Sparkles />
                      </div>
                      <span>Girar a roleta</span>
                    </div>
                  </div>

                  <div className="vidarix-browser-mockup__provider-row">
                    <span>Netflix</span>
                    <span>Prime Video</span>
                    <span>Disney+</span>
                    <span>Max</span>
                    <span>Apple TV+</span>
                  </div>

                  <div className="vidarix-browser-mockup__section-title">
                    <div>
                      <strong>Em destaque</strong>
                      <span>Escolhas populares para você</span>
                    </div>
                    <button type="button">Ver todos</button>
                  </div>

                  <div className="vidarix-browser-mockup__cards-grid">
                    {[1, 2, 3, 4, 5].map((card) => (
                      <article key={card}>
                        <div className={`poster poster--${card}`} />
                        <strong>Título em destaque</strong>
                        <small><Star /> 8.{card}</small>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="vidarix-phone-mockup">
              <div className="vidarix-phone-mockup__notch" />
              <div className="vidarix-phone-mockup__screen">
                <div className="vidarix-phone-mockup__topbar">
                  <img src="/brand/vidarix-symbol.png" alt="VIDARIX" />
                  <span>VIDARIX</span>
                </div>

                <div className="vidarix-phone-mockup__hero-card">
                  <small>SUA DESCOBERTA</small>
                  <strong>Uma recomendação sob medida</strong>
                  <p>Gire a roleta e descubra algo novo em segundos.</p>
                </div>

                <div className="vidarix-phone-mockup__mini-grid">
                  <article>
                    <Sparkles />
                    <span>Roleta</span>
                  </article>
                  <article>
                    <Tv />
                    <span>Streamings</span>
                  </article>
                  <article>
                    <Users />
                    <span>Amigos</span>
                  </article>
                  <article>
                    <Search />
                    <span>Buscar</span>
                  </article>
                </div>

                <div className="vidarix-phone-mockup__bottomnav">
                  <span className="is-active">Início</span>
                  <span>Catálogo</span>
                  <span>Roleta</span>
                  <span>Comunidade</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="vidarix-landing__features" id="recursos">
          <div className="vidarix-landing__section-shell">
            <div className="vidarix-landing__section-heading">
              <span>Recursos principais</span>
              <h2>Tudo o que você precisa para escolher melhor</h2>
              <p>Uma experiência completa para descobrir, organizar e compartilhar o que você gosta de assistir.</p>
            </div>

            <div className="vidarix-landing__feature-grid">
              {featureCards.map(({ icon: Icon, title, description }) => (
                <article key={title} className="vidarix-feature-card">
                  <div className="vidarix-feature-card__icon">
                    <Icon aria-hidden="true" />
                  </div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="vidarix-landing__benefits" id="beneficios">
          <div className="vidarix-landing__benefits-copy">
            <div className="vidarix-landing__section-heading left-aligned">
              <span>Por que usar</span>
              <h2>Uma experiência feita para quem ama filmes e séries</h2>
              <p>A VIDARIX transforma a dúvida do que assistir em uma jornada mais rápida, social e personalizada.</p>
            </div>
            <div className="vidarix-landing__benefit-list">
              {bullets.map((item) => (
                <div key={item} className="vidarix-landing__benefit-item">
                  <CheckCircle2 aria-hidden="true" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="vidarix-landing__benefits-panel">
            <div className="vidarix-landing__panel-header">
              <MonitorSmartphone />
              <div>
                <strong>Desktop e mobile de verdade</strong>
                <span>Uma interface responsiva que acompanha você em qualquer tela.</span>
              </div>
            </div>

            <div className="vidarix-landing__panel-cards">
              <article>
                <strong>Roleta com personalidade</strong>
                <p>Gêneros, serviços, preferências e histórico moldam as suas indicações.</p>
              </article>
              <article>
                <strong>Perfis e amizades</strong>
                <p>Compartilhe listas, recomendações e conversas sobre filmes e séries.</p>
              </article>
              <article>
                <strong>Onboarding guiado</strong>
                <p>O usuário começa ajustando conta, streamings, gêneros e preferências.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="vidarix-landing__final-cta" id="cta-final">
          <div>
            <span>Pronto para começar?</span>
            <h2>Crie sua conta e entre para a experiência VIDARIX agora.</h2>
            <p>Personalize catálogo, roleta e comunidade desde o primeiro acesso.</p>
          </div>

          <div className="vidarix-landing__final-actions">
            <button type="button" className="vidarix-landing__primary-button" onClick={() => onNavigate('/criar-conta')}>
              Acesse agora
              <ArrowRight aria-hidden="true" />
            </button>
            <button type="button" className="vidarix-landing__ghost-button" onClick={() => onNavigate('/entrar')}>
              Já tenho conta
            </button>
          </div>
        </section>
      </main>

      <footer className="vidarix-landing__footer">
        <div className="vidarix-landing__footer-inner">
          <img src="/brand/vidarix-logo-horizontal.png" alt="VIDARIX" />
          <p>Descubra o que assistir hoje.</p>
          <div>
            <button type="button" onClick={() => onNavigate('/termos')}>Termos</button>
            <button type="button" onClick={() => onNavigate('/privacidade')}>Privacidade</button>
            <button type="button" onClick={() => onNavigate('/criar-conta')}>Criar conta</button>
          </div>
        </div>
      </footer>
    </div>
  );
};
