import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { UserProfile } from '../types';
import { DEFAULT_USER_PROFILE, StorageService } from '../services/storageService';
import { SupabaseService } from '../services/supabaseService';

interface AuthActionResult {
  error?: string;
  requiresEmailConfirmation?: boolean;
}

interface PendingRegistration {
  email: string;
  fullName: string;
  username: string;
  preferences: Partial<UserProfile>;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile;
  isLoading: boolean;
  isAuthenticated: boolean;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    username: string,
    preferences?: Partial<UserProfile>
  ) => Promise<AuthActionResult>;
  signIn: (email: string, password: string) => Promise<AuthActionResult>;
  signInWithGoogle: () => Promise<AuthActionResult>;
  signOut: () => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<AuthActionResult>;
  updatePassword: (newPassword: string) => Promise<AuthActionResult>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updated: Partial<UserProfile>) => Promise<void>;
  uploadAvatar: (file: Blob | File) => Promise<{ avatarUrl?: string; error?: string }>;
  removeAvatar: () => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const PENDING_REGISTRATION_KEY = 'vidarix_pending_registration';

const translateAuthError = (message: string): string => {
  const normalized = message.toLowerCase();

  if (normalized.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (normalized.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar.';
  if (normalized.includes('user already registered')) return 'Já existe uma conta cadastrada com este e-mail.';
  if (normalized.includes('password should be at least')) return 'A senha deve conter pelo menos 6 caracteres.';
  if (normalized.includes('email rate limit exceeded')) return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
  if (normalized.includes('signup is disabled')) return 'O cadastro está temporariamente desativado.';
  if (normalized.includes('network') || normalized.includes('fetch')) return 'Não foi possível conectar ao Supabase. Verifique sua internet.';

  return message;
};

const savePendingRegistration = (pending: PendingRegistration) => {
  try {
    localStorage.setItem(PENDING_REGISTRATION_KEY, JSON.stringify(pending));
  } catch {
    // O cadastro continua funcionando mesmo sem armazenamento local.
  }
};

const getPendingRegistration = (): PendingRegistration | null => {
  try {
    const value = localStorage.getItem(PENDING_REGISTRATION_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

const clearPendingRegistration = () => {
  try {
    localStorage.removeItem(PENDING_REGISTRATION_KEY);
  } catch {
    // Sem ação necessária.
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile>(StorageService.getProfile());
  const [isLoading, setIsLoading] = useState(true);

  const loadUserProfile = async (userId: string, authUser?: User | null) => {
    try {
      const fetched = await SupabaseService.fetchProfile(userId);

      if (fetched) {
        const completeProfile: UserProfile = {
          ...fetched,
          email: authUser?.email || fetched.email || '',
          isAuthenticated: true
        };
        setProfile(completeProfile);
        StorageService.saveProfile(completeProfile);
        return;
      }

      const local = StorageService.getProfile();
      const fallbackProfile: UserProfile = {
        ...local,
        id: userId,
        email: authUser?.email || local.email || '',
        isAuthenticated: true
      };
      setProfile(fallbackProfile);
      StorageService.saveProfile(fallbackProfile);
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyPendingRegistration = async (authUser: User) => {
    const pending = getPendingRegistration();
    if (!pending) return;

    if (authUser.email && pending.email.toLowerCase() !== authUser.email.toLowerCase()) return;

    try {
      await SupabaseService.saveProfile(authUser.id, {
        fullName: pending.fullName,
        displayName: pending.fullName.split(' ')[0] || pending.fullName,
        name: pending.fullName,
        username: pending.username,
        email: pending.email,
        ...pending.preferences,
        onboardingCompleted: true,
        isAuthenticated: true
      });
      clearPendingRegistration();
    } catch (error) {
      console.warn('Não foi possível aplicar todas as preferências pendentes:', error);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    let mounted = true;

    const initialize = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        console.error('Erro ao recuperar sessão:', error);
        setIsLoading(false);
        return;
      }

      const currentSession = data.session;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        await applyPendingRegistration(currentSession.user);
        await loadUserProfile(currentSession.user.id, currentSession.user);
      } else {
        setIsLoading(false);
      }
    };

    initialize();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      window.setTimeout(async () => {
        if (!mounted) return;

        if (event === 'SIGNED_OUT') {
          setProfile(DEFAULT_USER_PROFILE);
          StorageService.saveProfile(DEFAULT_USER_PROFILE);
          setIsLoading(false);
          return;
        }

        if (currentSession?.user) {
          setIsLoading(true);
          await applyPendingRegistration(currentSession.user);
          await SupabaseService.migrateGuestDataToUser(currentSession.user.id);
          await loadUserProfile(currentSession.user.id, currentSession.user);
        }
      }, 0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    username: string,
    preferences: Partial<UserProfile> = {}
  ): Promise<AuthActionResult> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9._]/g, '');

    if (!isSupabaseConfigured) {
      const newProfile: UserProfile = {
        ...profile,
        id: `guest_${Date.now()}`,
        email: cleanEmail,
        fullName,
        displayName: fullName.split(' ')[0] || fullName,
        name: fullName,
        username: cleanUsername,
        isAuthenticated: true,
        ...preferences
      };
      setProfile(newProfile);
      StorageService.saveProfile(newProfile);
      return {};
    }

    savePendingRegistration({
      email: cleanEmail,
      fullName,
      username: cleanUsername,
      preferences
    });

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/inicio`,
        data: {
          full_name: fullName,
          display_name: fullName.split(' ')[0] || fullName,
          username: cleanUsername
        }
      }
    });

    if (error) {
      clearPendingRegistration();
      return { error: translateAuthError(error.message) };
    }

    if (data.user && data.session) {
      try {
        await applyPendingRegistration(data.user);
        await SupabaseService.migrateGuestDataToUser(data.user.id);
        await loadUserProfile(data.user.id, data.user);
      } catch (profileError) {
        console.warn('A conta foi criada, mas o perfil será sincronizado no próximo acesso:', profileError);
      }
    }

    return { requiresEmailConfirmation: Boolean(data.user && !data.session) };
  };

  const signIn = async (email: string, password: string): Promise<AuthActionResult> => {
    if (!isSupabaseConfigured) {
      const nameFromEmail = email.split('@')[0] || 'Cinéfilo VIDARIX';
      const newProfile: UserProfile = {
        ...profile,
        id: `local_${Date.now()}`,
        email,
        fullName: nameFromEmail,
        displayName: nameFromEmail,
        name: nameFromEmail,
        isAuthenticated: true
      };
      setProfile(newProfile);
      StorageService.saveProfile(newProfile);
      return {};
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password
    });

    return error ? { error: translateAuthError(error.message) } : {};
  };

  const signInWithGoogle = async (): Promise<AuthActionResult> => {
    if (!isSupabaseConfigured) {
      return { error: 'Supabase não configurado para login social.' };
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/inicio`
      }
    });

    return error ? { error: translateAuthError(error.message) } : {};
  };

  const signOut = async () => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.signOut();
      if (error) console.error('Erro ao sair da conta:', error);
    }

    setProfile(DEFAULT_USER_PROFILE);
    StorageService.saveProfile(DEFAULT_USER_PROFILE);
    setUser(null);
    setSession(null);
  };

  const resetPasswordForEmail = async (email: string): Promise<AuthActionResult> => {
    if (!isSupabaseConfigured) return { error: 'Supabase não configurado.' };

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/redefinir-senha`
    });

    return error ? { error: translateAuthError(error.message) } : {};
  };

  const updatePassword = async (newPassword: string): Promise<AuthActionResult> => {
    if (!isSupabaseConfigured) return { error: 'Supabase não configurado.' };

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return error ? { error: translateAuthError(error.message) } : {};
  };

  const refreshProfile = async () => {
    if (user) await loadUserProfile(user.id, user);
  };

  const updateProfile = async (updated: Partial<UserProfile>) => {
    const nextProfile = { ...profile, ...updated };
    setProfile(nextProfile);
    StorageService.saveProfile(nextProfile);

    if (user && isSupabaseConfigured) {
      await SupabaseService.saveProfile(user.id, updated);
    }
  };

  const uploadAvatar = async (file: Blob | File) => {
    if (!user || !isSupabaseConfigured) {
      const reader = new FileReader();
      return new Promise<{ avatarUrl?: string; error?: string }>((resolve) => {
        reader.onload = (event) => {
          const url = event.target?.result as string;
          updateProfile({ photoURL: url, avatar: url });
          resolve({ avatarUrl: url });
        };
        reader.onerror = () => resolve({ error: 'Não foi possível ler a imagem.' });
        reader.readAsDataURL(file);
      });
    }

    try {
      const { avatarUrl } = await SupabaseService.uploadAvatar(user.id, file);
      const updatedProfile = { ...profile, photoURL: avatarUrl, avatar: avatarUrl };
      setProfile(updatedProfile);
      StorageService.saveProfile(updatedProfile);
      return { avatarUrl };
    } catch (error: any) {
      return { error: error?.message || 'Erro ao enviar o avatar.' };
    }
  };

  const removeAvatar = async () => {
    if (user && isSupabaseConfigured) await SupabaseService.removeAvatar(user.id);

    const updatedProfile = { ...profile, photoURL: null, avatar: '' };
    setProfile(updatedProfile);
    StorageService.saveProfile(updatedProfile);
    return {};
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        isAuthenticated: isSupabaseConfigured ? Boolean(user) : profile.isAuthenticated === true,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        resetPasswordForEmail,
        updatePassword,
        refreshProfile,
        updateProfile,
        uploadAvatar,
        removeAvatar
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  return context;
};
