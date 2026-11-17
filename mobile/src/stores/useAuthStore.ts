
import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  init: () => () => void;
  logout: () => Promise<void>;
}

const fromSession = (session: Session | null) => ({
  session,
  user: session?.user ?? null,
  isAuthenticated: !!session,
  isLoading: false,
});

export const useAuthStore = create<AuthState>((set) => ({
  ...fromSession(null),
  isLoading: true,

  init: () => {
    let isInitialized = false;

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      isInitialized = true;
      set(fromSession(session));
    });

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!isInitialized) {
          set(fromSession(session));
        }
      })
      .catch((error) => {
        console.error('[Auth] Erro ao recuperar sessão:', error);

        if (!isInitialized) {
          set(fromSession(null));
        }
      });

    return () => data.subscription.unsubscribe();
  },

  logout: async () => {
    const { error } = await supabase.auth.signOut();

    if (error) throw error;

    set(fromSession(null));
  },
}));
