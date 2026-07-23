import React from 'react';
import { ShieldCheck, FileText, Info } from 'lucide-react';

interface LegalPageProps {
  type: 'termos' | 'privacidade' | 'sobre';
}

export const LegalPage: React.FC<LegalPageProps> = ({ type }) => {
  return (
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-6">
      {type === 'termos' && (
        <div className="bg-[#151823] border border-white/10 rounded-3xl p-6 sm:p-10 space-y-6">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-[#8B5CF6]" />
            <h1 className="text-3xl font-black text-white">Termos de Uso — VIDARIX</h1>
          </div>
          <div className="text-xs sm:text-sm text-[#A7A9B4] space-y-4 leading-relaxed">
            <p>
              A VIDARIX é um serviço web e aplicativo de descoberta cinematográfica voltado ao público brasileiro.
            </p>
            <h3 className="text-base font-bold text-white pt-2">1. Natureza do Serviço</h3>
            <p>
              A VIDARIX não hospeda, não armazena, não transmite e não disponibiliza de nenhuma forma arquivos de mídia, vídeos ou transmissões piratas de filmes e séries. Nossa única finalidade é catalogar informações, sinopses, trailers oficiais do YouTube e onde assistir legalmente em serviços de streaming credenciados no Brasil.
            </p>
            <h3 className="text-base font-bold text-white pt-2">2. Dados e Atribuição</h3>
            <p>
              Todas as informações sobre capas, atores, diretores e sinopses são fornecidas pela API do TMDB (The Movie Database). As informações de disponibilidade em serviços de streaming no Brasil são fornecidas em parceria com JustWatch através da API do TMDB.
            </p>
          </div>
        </div>
      )}

      {type === 'privacidade' && (
        <div className="bg-[#151823] border border-white/10 rounded-3xl p-6 sm:p-10 space-y-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-[#EC4899]" />
            <h1 className="text-3xl font-black text-white">Política de Privacidade</h1>
          </div>
          <div className="text-xs sm:text-sm text-[#A7A9B4] space-y-4 leading-relaxed">
            <p>
              Respeitamos a privacidade dos nossos usuários. A VIDARIX opera primariamente com armazenamento local no seu próprio navegador (LocalStorage) em modo visitante.
            </p>
            <p>
              Nenhum dado pessoal sensível é vendido a terceiros. Suas listas e preferências de streaming são mantidas seguras.
            </p>
          </div>
        </div>
      )}

      {type === 'sobre' && (
        <div className="bg-[#151823] border border-white/10 rounded-3xl p-6 sm:p-10 space-y-6">
          <div className="flex items-center gap-3">
            <Info className="w-8 h-8 text-[#8B5CF6]" />
            <h1 className="text-3xl font-black text-white">Sobre a VIDARIX</h1>
          </div>
          <div className="text-xs sm:text-sm text-[#A7A9B4] space-y-4 leading-relaxed">
            <p>
              A VIDARIX nasceu para resolver a eterna dúvida: "O que vamos assistir hoje?". Através de uma roleta cinematográfica inteligente e intuitiva, conectamos cinéfilos aos melhores títulos disponíveis em plataformas como Netflix, Prime Video, Disney+, Max, Globoplay e muitas outras no Brasil.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
