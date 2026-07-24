import React, { useEffect, useRef, useState } from 'react';
import {
  Bookmark,
  ChevronRight,
  Download,
  Edit3,
  History,
  LogIn,
  LogOut,
  MessageCircle,
  Settings,
  Sparkles,
  Trash2,
  User,
  UserPlus,
  Users
} from 'lucide-react';
import { UserProfile } from '../types';
import { UserAvatar } from './UserAvatar';
import { dataProvider } from '../services/dataProvider';

interface ProfileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  isAuthenticated: boolean;
  onNavigate: (path: string) => void;
  onLogout: () => void | Promise<void>;
}

export const ProfileMenu: React.FC<ProfileMenuProps> = ({
  isOpen,
  onClose,
  userProfile,
  isAuthenticated,
  onNavigate,
  onLogout
}) => {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [canInstallPwa, setCanInstallPwa] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setCanInstallPwa(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) onClose();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
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
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') setCanInstallPwa(false);
    setDeferredPrompt(null);
  };

  const handleNav = (path: string) => {
    onNavigate(path);
    onClose();
  };

  const handleClearLocalData = async () => {
    await dataProvider.clearLocalData();
    window.location.reload();
  };

  const handleSignOut = async () => {
    await onLogout();
    onClose();
  };

  const displayName = isAuthenticated
    ? userProfile.displayName || userProfile.fullName || userProfile.name || 'Cinéfilo'
    : 'Visitante VIDARIX';
  const username = isAuthenticated && userProfile.username
    ? `@${userProfile.username}`
    : 'Entre para sincronizar seus dados';
  const avatarSrc = userProfile.photoURL || userProfile.avatar;

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-orientation="vertical"
      className="absolute right-0 top-12 sm:top-14 w-72 sm:w-80 bg-[#10121A] border border-white/10 rounded-2xl p-3 shadow-2xl z-50 backdrop-blur-2xl animate-in fade-in slide-in-from-top-2 duration-200 text-[#F7F7FA] overflow-hidden"
    >
      <div className="p-3.5 bg-[#151823] rounded-xl border border-white/5 mb-2 flex items-center gap-3">
        <UserAvatar
          src={avatarSrc}
          name={displayName}
          size="md"
          showBorder
          borderColor={isAuthenticated ? 'border-[#8B5CF6]' : 'border-white/15'}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <p className="text-sm font-bold text-white truncate">{displayName}</p>
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border shrink-0 ${
              isAuthenticated
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25'
                : 'bg-white/5 text-[#A7A9B4] border-white/10'
            }`}>
              {isAuthenticated ? 'Sincronizado' : 'Visitante'}
            </span>
          </div>
          <p className="text-xs text-[#A7A9B4] truncate mt-0.5">{username}</p>
        </div>
      </div>

      {!isAuthenticated && (
        <div className="grid grid-cols-2 gap-2 pb-3 border-b border-white/10">
          <button
            type="button"
            onClick={() => handleNav('/entrar')}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-bold text-white hover:bg-white/10 transition"
          >
            <LogIn className="w-4 h-4" />
            Entrar
          </button>
          <button
            type="button"
            onClick={() => handleNav('/criar-conta')}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#7458C7] px-3 py-2.5 text-xs font-bold text-white hover:bg-[#8568d8] transition"
          >
            <UserPlus className="w-4 h-4" />
            Criar conta
          </button>
        </div>
      )}

      <div className="space-y-0.5 py-2">
        <button
          onClick={() => handleNav('/perfil')}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-white hover:bg-white/5 transition-all group"
        >
          <div className="flex items-center gap-2.5">
            <User className="w-4 h-4 text-[#8B5CF6]" />
            <span>Ver perfil</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-[#A7A9B4]" />
        </button>

        <button
          onClick={() => handleNav('/perfil/editar')}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-white hover:bg-white/5 transition-all group"
        >
          <div className="flex items-center gap-2.5">
            <Edit3 className="w-4 h-4 text-[#EC4899]" />
            <span>Editar perfil</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-[#A7A9B4]" />
        </button>

        <button
          onClick={() => handleNav('/comunidade')}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-white hover:bg-white/5 transition-all group"
        >
          <div className="flex items-center gap-2.5">
            <Users className="w-4 h-4 text-violet-400" />
            <span>Amigos e grupos</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-[#A7A9B4]" />
        </button>

        <button
          onClick={() => handleNav('/comunidade?tab=messages')}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-white hover:bg-white/5 transition-all group"
        >
          <div className="flex items-center gap-2.5">
            <MessageCircle className="w-4 h-4 text-pink-400" />
            <span>Conversas</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-[#A7A9B4]" />
        </button>

        <button
          onClick={() => handleNav('/minha-lista')}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-white hover:bg-white/5 transition-all group"
        >
          <div className="flex items-center gap-2.5">
            <Bookmark className="w-4 h-4 text-emerald-400" />
            <span>Minha Lista</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-[#A7A9B4]" />
        </button>

        <button
          onClick={() => handleNav('/perfil')}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-white hover:bg-white/5 transition-all group"
        >
          <div className="flex items-center gap-2.5">
            <History className="w-4 h-4 text-cyan-400" />
            <span>Histórico da roleta</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-[#A7A9B4]" />
        </button>

        <button
          onClick={() => handleNav('/configuracoes')}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-white hover:bg-white/5 transition-all group"
        >
          <div className="flex items-center gap-2.5">
            <Settings className="w-4 h-4 text-[#A7A9B4]" />
            <span>Configurações</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-[#A7A9B4]" />
        </button>

        {canInstallPwa && (
          <button
            onClick={handleInstallPwa}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all mt-1"
          >
            <div className="flex items-center gap-2.5">
              <Download className="w-4 h-4" />
              <span>Instalar VIDARIX App</span>
            </div>
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          </button>
        )}
      </div>

      <div className="mt-1 pt-2 border-t border-white/10 space-y-2">
        {isAuthenticated ? (
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-300 hover:bg-rose-500/10 transition-all border border-rose-500/20"
          >
            <LogOut className="w-4 h-4" />
            Sair da conta
          </button>
        ) : !showClearConfirm ? (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-all border border-rose-500/20"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpar dados locais</span>
          </button>
        ) : (
          <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-center space-y-1.5">
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
