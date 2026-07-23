import React, { useState } from 'react';
import {
  Settings,
  Shield,
  Eye,
  Lock,
  Volume2,
  VolumeX,
  Sparkles,
  Trash2,
  RotateCcw,
  Smartphone,
  Check,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { UserProfile } from '../types';
import { StorageService } from '../services/storageService';

interface SettingsPageProps {
  userProfile: UserProfile;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  onAddToast?: (title: string, desc?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  userProfile,
  onUpdateProfile,
  onAddToast
}) => {
  const [publicProfile, setPublicProfile] = useState(userProfile.privacy?.publicProfile !== false);
  const [showLists, setShowLists] = useState(userProfile.privacy?.showLists !== false);
  const [showRatings, setShowRatings] = useState(userProfile.privacy?.showRatings !== false);
  const [showStatistics, setShowStatistics] = useState(userProfile.privacy?.showStatistics !== false);

  const [soundEffects, setSoundEffects] = useState(userProfile.soundEffects !== false);
  const [animations, setAnimations] = useState(userProfile.animations !== false);
  const [reducedMotion, setReducedMotion] = useState(userProfile.reducedMotion === true);

  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const handleTogglePrivacy = (key: 'publicProfile' | 'showLists' | 'showRatings' | 'showStatistics', val: boolean) => {
    const updatedPrivacy = {
      publicProfile: key === 'publicProfile' ? val : publicProfile,
      showLists: key === 'showLists' ? val : showLists,
      showRatings: key === 'showRatings' ? val : showRatings,
      showStatistics: key === 'showStatistics' ? val : showStatistics
    };

    if (key === 'publicProfile') setPublicProfile(val);
    if (key === 'showLists') setShowLists(val);
    if (key === 'showRatings') setShowRatings(val);
    if (key === 'showStatistics') setShowStatistics(val);

    onUpdateProfile({ privacy: updatedPrivacy });
    if (onAddToast) {
      onAddToast('Configurações de privacidade salvas', undefined, 'info');
    }
  };

  const handleToggleSound = (val: boolean) => {
    setSoundEffects(val);
    onUpdateProfile({ soundEffects: val });
  };

  const handleToggleAnimations = (val: boolean) => {
    setAnimations(val);
    onUpdateProfile({ animations: val });
  };

  const handleToggleReducedMotion = (val: boolean) => {
    setReducedMotion(val);
    onUpdateProfile({ reducedMotion: val });
  };

  const handleClearHistory = () => {
    StorageService.clearHistory();
    if (onAddToast) {
      onAddToast('Histórico excluído', 'O histórico da roleta foi zerado.', 'info');
    }
  };

  const handleResetAllData = () => {
    localStorage.clear();
    setIsResetConfirmOpen(false);
    if (onAddToast) {
      onAddToast('Dados restaurados', 'Todas as configurações e listas foram restauradas para os padrões.', 'warning');
    }
    setTimeout(() => {
      window.location.reload();
    }, 800);
  };

  return (
    <div className="min-h-screen pt-28 sm:pt-32 pb-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="border-b border-white/10 pb-5">
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
          <Settings className="w-7 h-7 text-[#8B5CF6]" />
          <span>Configurações &amp; Preferências</span>
        </h1>
        <p className="text-xs sm:text-sm text-[#A7A9B4] mt-1">
          Gerencie a privacidade da sua conta, efeitos de som, experiência visual e armazenamento de dados.
        </p>
      </div>

      {/* SECTION 1: Privacidade e Perfil Público */}
      <div className="bg-[#10121A] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-4">
        <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Eye className="w-5 h-5 text-[#8B5CF6]" />
          <span>Privacidade &amp; Exibição do Perfil</span>
        </h2>

        <div className="space-y-3 text-xs">
          <label className="flex items-center justify-between p-4 rounded-2xl bg-[#151823] border border-white/5 cursor-pointer">
            <div>
              <p className="font-bold text-white">Perfil Público</p>
              <p className="text-[#A7A9B4] text-[11px] mt-0.5">
                Permite compartilhar o link do seu perfil com amigos e redes sociais.
              </p>
            </div>
            <input
              type="checkbox"
              checked={publicProfile}
              onChange={(e) => handleTogglePrivacy('publicProfile', e.target.checked)}
              className="w-4 h-4 accent-[#8B5CF6]"
            />
          </label>

          <label className="flex items-center justify-between p-4 rounded-2xl bg-[#151823] border border-white/5 cursor-pointer">
            <div>
              <p className="font-bold text-white">Exibir Minha Lista Publicamente</p>
              <p className="text-[#A7A9B4] text-[11px] mt-0.5">
                Visitantes do seu perfil poderão ver quais filmes você quer assistir e já assistiu.
              </p>
            </div>
            <input
              type="checkbox"
              checked={showLists}
              onChange={(e) => handleTogglePrivacy('showLists', e.target.checked)}
              className="w-4 h-4 accent-[#8B5CF6]"
            />
          </label>

          <label className="flex items-center justify-between p-4 rounded-2xl bg-[#151823] border border-white/5 cursor-pointer">
            <div>
              <p className="font-bold text-white">Exibir Estatísticas de Uso</p>
              <p className="text-[#A7A9B4] text-[11px] mt-0.5">
                Exibe o total de filmes assistidos e sorteios realizados na roleta no seu perfil.
              </p>
            </div>
            <input
              type="checkbox"
              checked={showStatistics}
              onChange={(e) => handleTogglePrivacy('showStatistics', e.target.checked)}
              className="w-4 h-4 accent-[#8B5CF6]"
            />
          </label>
        </div>
      </div>

      {/* SECTION 2: Aparência e Sons */}
      <div className="bg-[#10121A] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-4">
        <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#EC4899]" />
          <span>Aparência, Animações e Áudio</span>
        </h2>

        <div className="space-y-3 text-xs">
          <label className="flex items-center justify-between p-4 rounded-2xl bg-[#151823] border border-white/5 cursor-pointer">
            <div>
              <p className="font-bold text-white">Efeitos Sonoros na Roleta</p>
              <p className="text-[#A7A9B4] text-[11px] mt-0.5">
                Toca efeitos de áudio sintético durante o giro e ao sortear um filme.
              </p>
            </div>
            <input
              type="checkbox"
              checked={soundEffects}
              onChange={(e) => handleToggleSound(e.target.checked)}
              className="w-4 h-4 accent-[#8B5CF6]"
            />
          </label>

          <label className="flex items-center justify-between p-4 rounded-2xl bg-[#151823] border border-white/5 cursor-pointer">
            <div>
              <p className="font-bold text-white">Animações &amp; Confetes na Roleta</p>
              <p className="text-[#A7A9B4] text-[11px] mt-0.5">
                Exibe efeitos visuais de confete e iluminação de holofotes ao revelar um título.
              </p>
            </div>
            <input
              type="checkbox"
              checked={animations}
              onChange={(e) => handleToggleAnimations(e.target.checked)}
              className="w-4 h-4 accent-[#8B5CF6]"
            />
          </label>

          <label className="flex items-center justify-between p-4 rounded-2xl bg-[#151823] border border-white/5 cursor-pointer">
            <div>
              <p className="font-bold text-white">Modo com Movimento Reduzido</p>
              <p className="text-[#A7A9B4] text-[11px] mt-0.5">
                Suaviza ou desativa transições intensas para melhor acessibilidade visual.
              </p>
            </div>
            <input
              type="checkbox"
              checked={reducedMotion}
              onChange={(e) => handleToggleReducedMotion(e.target.checked)}
              className="w-4 h-4 accent-[#8B5CF6]"
            />
          </label>
        </div>
      </div>

      {/* SECTION 3: Perfil Local & Dispositivo */}
      <div className="bg-[#10121A] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-4">
        <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-400" />
          <span>Perfil local &amp; dispositivo</span>
        </h2>

        <div className="p-4 rounded-2xl bg-[#151823] border border-white/5 space-y-3">
          <div className="flex items-center justify-between gap-4 text-xs">
            <span className="text-[#A7A9B4]">Modo de uso:</span>
            <span className="font-bold text-white">Perfil local VIDARIX</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-xs">
            <span className="text-[#A7A9B4]">Dispositivo atual:</span>
            <span className="font-semibold text-white flex items-center gap-1">
              <Smartphone className="w-3.5 h-3.5 text-[#8B5CF6]" />
              Navegador Web / PWA
            </span>
          </div>
          <div className="pt-3 border-t border-white/10">
            <p className="text-xs leading-relaxed text-[#A7A9B4]">
              Suas listas, preferências e histórico permanecem salvos neste dispositivo. Você pode gerenciar ou limpar esses dados na seção abaixo.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 4: Gestão de Dados */}
      <div className="bg-[#10121A] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-4">
        <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-rose-400" />
          <span>Gestão de Dados do Aplicativo</span>
        </h2>

        <div className="space-y-3">
          <button
            onClick={handleClearHistory}
            className="w-full flex items-center justify-between p-4 rounded-2xl bg-[#151823] border border-white/5 hover:border-rose-500/30 text-left transition-all group"
          >
            <div>
              <p className="text-xs font-bold text-white group-hover:text-rose-300">Limpar Histórico da Roleta</p>
              <p className="text-[11px] text-[#A7A9B4]">Apaga os registros dos sorteios realizados anteriormente.</p>
            </div>
            <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
          </button>

          <button
            onClick={() => setIsResetConfirmOpen(true)}
            className="w-full flex items-center justify-between p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-left transition-all group"
          >
            <div>
              <p className="text-xs font-bold text-rose-300">Restaurar Padrões de Fábrica</p>
              <p className="text-[11px] text-rose-200/70">
                Reseta todas as preferências, lista de salvos e histórico local.
              </p>
            </div>
            <RotateCcw className="w-4 h-4 text-rose-400 shrink-0" />
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#10121A] border border-white/10 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-white">Tem certeza que deseja restaurar?</h3>
            </div>
            <p className="text-xs text-[#A7A9B4] leading-relaxed">
              Esta ação apagar todos os dados salvos localmente, incluindo sua foto, biografia, serviços de streaming marcados e lista de filmes.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsResetConfirmOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-white/10 text-white text-xs font-semibold hover:bg-white/15"
              >
                Cancelar
              </button>
              <button
                onClick={handleResetAllData}
                className="px-4 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-500"
              >
                Sim, Restaurar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
