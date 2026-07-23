import React from 'react';
import { Film } from 'lucide-react';

interface FooterProps {
  onNavigate: (path: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-[#07080D] border-t border-white/10 text-[#A7A9B4] text-xs pt-12 pb-24 md:pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-white/5">
          {/* Brand */}
          <div className="space-y-2">
            <div
              onClick={() => onNavigate('/')}
              className="cursor-pointer inline-block"
            >
              <img
                src="/brand/vidarix-logo-horizontal.png"
                alt="VIDARIX"
                className="h-8 w-auto object-contain"
              />
            </div>
            <p className="text-xs text-[#A7A9B4] max-w-sm">
              Sua plataforma brasileira de descoberta de filmes, séries e serviços de streaming.
            </p>
          </div>

          {/* Quick Navigation Links */}
          <div className="flex flex-wrap items-center gap-4 font-semibold text-xs text-[#F7F7FA]">
            <button onClick={() => onNavigate('/')} className="hover:text-[#8B5CF6] transition-colors">
              Início
            </button>
            <button onClick={() => onNavigate('/filmes')} className="hover:text-[#8B5CF6] transition-colors">
              Filmes
            </button>
            <button onClick={() => onNavigate('/series')} className="hover:text-[#8B5CF6] transition-colors">
              Séries
            </button>
            <button onClick={() => onNavigate('/roleta')} className="hover:text-[#8B5CF6] transition-colors">
              Roleta
            </button>
            <button onClick={() => onNavigate('/minha-lista')} className="hover:text-[#8B5CF6] transition-colors">
              Minha Lista
            </button>
            <button onClick={() => onNavigate('/termos')} className="hover:text-[#8B5CF6] transition-colors">
              Termos de Uso
            </button>
            <button onClick={() => onNavigate('/privacidade')} className="hover:text-[#8B5CF6] transition-colors">
              Privacidade
            </button>
          </div>
        </div>

        {/* Legal Disclaimers & TMDB / JustWatch attributions */}
        <div className="space-y-4 leading-relaxed text-[11px] text-[#A7A9B4]/80">
          <p>
            A VIDARIX é uma plataforma independente para ajudar usuários a escolher o que assistir. Não hospedamos,
            reproduzimos, transmitimos ou disponibilizamos nenhum tipo de conteúdo audiovisual protegido por direitos autorais.
          </p>

          <div className="flex flex-wrap items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5 font-medium text-white">
              <Film className="w-3.5 h-3.5 text-[#8B5CF6]" />
              Dados fornecidos por TMDB (The Movie Database)
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 font-medium text-white">
              Dados de streaming em parceria com JustWatch via TMDB
            </span>
          </div>

          <p className="pt-2">
            © {new Date().getFullYear()} VIDARIX. Todos os direitos reservados. Design e desenvolvimento em alta fidelidade.
          </p>
        </div>
      </div>
    </footer>
  );
};
