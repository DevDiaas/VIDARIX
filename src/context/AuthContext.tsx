import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { UserProfile } from '../types';
import { StorageService, DEFAULT_USER_PROFILE } from '../services/storageService';
import { SupabaseService } from '../services/supabaseService';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile;
  isLoading: boolean;
  isAuthenticated: boolean;
  signUp: (email: string, password: string, fullName: string, username: string, preferences?: Partial<UserProfile>) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<{ error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ error?: string }>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updated: Partial<UserProfile>) => Promise<void>;
  uploadAvatar: (file: Blob | File) => Promise<{ avatarUrl?: string; error?: string }>;
  removeAvatar: () => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile>(StorageService.getProfile());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 1. Initial Auth and Profile Load & Realtime Auth Listener
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    // Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (event === 'SIGNED_IN' && currentSession?.user) {
        setIsLoading(true);
        await loadUserProfile(currentSession.user.id);
        // Sync local guest data if needed
        await SupabaseService.migrateGuestDataToUser(currentSession.user.id);
        setIsLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setProfile(DEFAULT_USER_PROFILE);
        StorageService.saveProfile(DEFAULT_USER_PROFILE);
        setIsLoading(false);
      } else if (currentSession?.user) {
        await loadUserProfile(currentSession.user.id);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Helper to fetch and merge user profile
  const loadUserProfile = async (userId: string) => {
    try {
      const fetched = await SupabaseService.fetchProfile(userId);
      if (fetched) {
        setProfile(fetched);
        StorageService.saveProfile(fetched);
      } else {
        // Fallback: create basic profile structure
        const local = StorageService.getProfile();
        const fallbackProfile: UserProfile = {
          ...local,
          id: userId,
          isAuthenticated: true
        };
        setProfile(fallbackProfile);
        StorageService.saveProfile(fallbackProfile);
      }
    } catch (err) {
      console.error('Error loading profile in AuthContext:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Sign Up with email, password, full name and username
  const signUp = async (email: string, password: string, fullName: string, username: string, preferences: Partial<UserProfile> = {}) => {
    if (!isSupabaseConfigured) {
      // Local fallback mode for offline testing
      const cleanUsername = username.toLowerCase().replace(/[^a-z0-9._]/g, '');
      const newProfile: UserProfile = {
        ...profile,
        id: `guest_${Date.now()}`,
        email,
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

    // Check username availability
    const checkRes = await SupabaseService.checkUsernameAvailability(username);
    if (!checkRes.available) {
      return { error: checkRes.error || 'O nome de usuário já está em uso.' };
    }

    const cleanUsername = username.trim().toLowerCase();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          display_name: fullName.split(' ')[0] || fullName,
          username: cleanUsername,
        }
      }
    });

    if (error) {
      return { error: error.message };
    }

    if (data.user) {
      // Upsert profile directly as backup in case trigger takes a moment
      try {
        await SupabaseService.saveProfile(data.user.id, {
          fullName,
          displayName: fullName.split(' ')[0] || fullName,
          name: fullName,
          username: cleanUsername,
          email,
          ...preferences
        });
        await SupabaseService.migrateGuestDataToUser(data.user.id);
      } catch (err) {
        console.warn('Profile direct save fallback warning:', err);
      }
    }

    return {};
  };

  // Sign In
  const signIn = async (email: string, password: string) => {
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
      email,
      password
    });

    if (error) {
      return { error: error.message };
    }

    return {};
  };

  // Sign In with Google
  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured) {
      return { error: 'Supabase não configurado para login social.' };
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });

    if (error) {
      return { error: error.message };
    }

    return {};
  };

  // Sign Out
  const signOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setProfile(DEFAULT_USER_PROFILE);
    StorageService.saveProfile(DEFAULT_USER_PROFILE);
    setUser(null);
    setSession(null);
  };

  // Reset Password for Email
  const resetPasswordForEmail = async (email: string) => {
    if (!isSupabaseConfigured) {
      return { error: 'Supabase não configurado.' };
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`
    });

    if (error) {
      return { error: error.message };
    }

    return {};
  };

  // Update Password
  const updatePassword = async (newPassword: string) => {
    if (!isSupabaseConfigured) {
      return { error: 'Supabase não configurado.' };
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      return { error: error.message };
    }

    return {};
  };

  // Refresh Profile
  const refreshProfile = async () => {
    if (user) {
      await loadUserProfile(user.id);
    }
  };

  // Update Profile
  const updateProfile = async (updated: Partial<UserProfile>) => {
    const nextProfile = { ...profile, ...updated };
    setProfile(nextProfile);
    StorageService.saveProfile(nextProfile);

    if (user && isSupabaseConfigured) {
      await SupabaseService.saveProfile(user.id, updated);
    }
  };

  // Upload Avatar
  const uploadAvatar = async (file: Blob | File) => {
    if (!user || !isSupabaseConfigured) {
      // Local fallback avatar preview
      const reader = new FileReader();
      return new Promise<{ avatarUrl?: string; error?: string }>((resolve) => {
        reader.onload = (e) => {
          const url = e.target?.result as string;
          updateProfile({ photoURL: url, avatar: url });
          resolve({ avatarUrl: url });
        };
        reader.readAsDataURL(file);
      });
    }

    try {
      const { avatarUrl } = await SupabaseService.uploadAvatar(user.id, file);
      const updatedProfileData = { photoURL: avatarUrl, avatar: avatarUrl };
      setProfile((prev) => ({ ...prev, ...updatedProfileData }));
      StorageService.saveProfile({ ...profile, ...updatedProfileData });
      return { avatarUrl };
    } catch (err: any) {
      return { error: err.message || 'Erro ao enviar o avatar.' };
    }
  };

  // Remove Avatar
  const removeAvatar = async () => {
    if (user && isSupabaseConfigured) {
      await SupabaseService.removeAvatar(user.id);
    }

    const updatedProfileData = { photoURL: null, avatar: '' };
    setProfile((prev) => ({ ...prev, ...updatedProfileData }));
    StorageService.saveProfile({ ...profile, ...updatedProfileData });
    return {};
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        isAuthenticated: profile.isAuthenticated || Boolean(user),
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
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
};
