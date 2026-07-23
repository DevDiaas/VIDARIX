import React, { useEffect, useRef, useState } from 'react';
import {
  User,
  Settings,
  Bookmark,
  History,
  Edit3,
  Download,
  Sparkles,
  ChevronRight,
  Trash2,
  Users,
  MessageCircle
} from 'lucide-react';
import { UserProfile } from '../types';
import { UserAvatar } from './UserAvatar';
import { dataProvider } from '../services/dataProvider';

interface ProfileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  onNavigate: (path: string) => void;
}

export const ProfileMenu: React.FC<ProfileMenuProps> = ({
  isOpen,
  onClose,
  userProfile,
  onNavigate
}) => {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [canInstallPwa, setCanInstallPwa] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // PWA install event listener
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstallPwa(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  // Close on outside click or Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setCanInstallPwa(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleNav = (path: string) => {
    onNavigate(path);
    onClose();
  };

  const handleClearLocalData = async () => {
    await dataProvider.clearLocalData();
    window.location.reload();
  };

  const displayName = userProfile.displayName || userProfile.fullName || userProfile.name || 'Cinéfilo';
  const username = userProfile.username ? `@${userProfile.username}` : '@cinefilo';
  const avatarSrc = userProfile.photoURL || userProfile.avatar;

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-orientation="vertical"
      className="absolute right-0 top-12 sm:top-14 w-72 sm:w-80 bg-[#10121A] border border-white/10 rounded-2xl p-3 shadow-2xl z-50 backdrop-blur-2xl animate-in fade-in slide-in-from-top-2 duration-200 text-[#F7F7FA] overflow-hidden"
    >
      {/* Header User Card */}
      <div className="p-3.5 bg-[#151823] rounded-xl border border-white/5 mb-2 flex items-center gap-3">
        <UserAvatar
          src={avatarSrc}
          name={displayName}
          size="md"
          showBorder={true}
          borderColor="border-[#8B5CF6]"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <p className="text-sm font-bold text-white truncate">{displayName}</p>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#8B5CF6]/15 text-[#C4B5FD] border border-[#8B5CF6]/25 shrink-0">
              Perfil local
            </span>
          </div>
          <p className="text-xs text-[#A7A9B4] truncate mt-0.5">{username}</p>
        </div>
      </div>

      {/* Primary Navigation Actions */}
      <div className="space-y-0.5 py-1 border-t border-white/5">
        <button
          onClick={() => handleNav('/perfil')}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-white hover:bg-white/5 transition-all group"
        >
          <div className="flex items-center gap-2.5">
            <User className="w-4 h-4 text-[#8B5CF6] group-hover:scale-110 transition-transform" />
            <span>Ver perfil</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-[#A7A9B4] group-hover:text-white transition-colors" />
        </button>

        <button
          onClick={() => handleNav('/perfil/editar')}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-white hover:bg-white/5 transition-all group"
        >
          <div className="flex items-center gap-2.5">
            <Edit3 className="w-4 h-4 text-[#EC4899] group-hover:scale-110 transition-transform" />
            <span>Editar perfil</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-[#A7A9B4] group-hover:text-white transition-colors" />
        </button>


        <button
          onClick={() => handleNav('/comunidade')}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-white hover:bg-white/5 transition-all group"
        >
          <div className="flex items-center gap-2.5">
            <Users className="w-4 h-4 text-violet-400 group-hover:scale-110 transition-transform" />
            <span>Amigos e grupos</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-[#A7A9B4] group-hover:text-white transition-colors" />
        </button>

        <button
          onClick={() => handleNav('/comunidade?tab=messages')}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-white hover:bg-white/5 transition-all group"
        >
          <div className="flex items-center gap-2.5">
            <MessageCircle className="w-4 h-4 text-pink-400 group-hover:scale-110 transition-transform" />
            <span>Conversas</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-[#A7A9B4] group-hover:text-white transition-colors" />
        </button>

        <button
          onClick={() => handleNav('/minha-lista')}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-white hover:bg-white/5 transition-all group"
        >
          <div className="flex items-center gap-2.5">
            <Bookmark className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span>Minha Lista</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-[#A7A9B4] group-hover:text-white transition-colors" />
        </button>

        <button
          onClick={() => handleNav('/perfil')}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-white hover:bg-white/5 transition-all group"
        >
          <div className="flex items-center gap-2.5">
            <History className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
            <span>Histórico da roleta</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-[#A7A9B4] group-hover:text-white transition-colors" />
        </button>

        <button
          onClick={() => handleNav('/configuracoes')}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-white hover:bg-white/5 transition-all group"
        >
          <div className="flex items-center gap-2.5">
            <Settings className="w-4 h-4 text-[#A7A9B4] group-hover:text-white group-hover:scale-110 transition-transform" />
            <span>Configurações</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-[#A7A9B4] group-hover:text-white transition-colors" />
        </button>

        {canInstallPwa && (
          <button
            onClick={handleInstallPwa}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all mt-1"
          >
            <div className="flex items-center gap-2.5">
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Instalar VIDARIX App</span>
            </div>
            <Sparkles className="w-3.5 h-3.5 animate-pulse text-emerald-300" />
          </button>
        )}
      </div>

      {/* Footer / Local Profile Management */}
      <div className="mt-2 pt-2 border-t border-white/10 space-y-2">
        {!showClearConfirm ? (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-all border border-rose-500/20"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpar perfil local</span>
          </button>
        ) : (
          <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-center space-y-1.5 animate-in fade-in">
            <p className="text-[11px] font-bold text-white">Resetar todos os dados locais?</p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="button-secondary px-3 py-1 rounded-lg text-[11px] font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={handleClearLocalData}
                className="button-primary px-3 py-1 rounded-lg text-[11px] font-bold"
              >
                Confirmar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
