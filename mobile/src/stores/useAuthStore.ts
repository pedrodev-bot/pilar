
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

    const fallbackTimer = setTimeout(() => {
      if (!isInitialized) {
        isInitialized = true;
        set(fromSession(null));
      }
    }, 1500);

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      isInitialized = true;
      clearTimeout(fallbackTimer);
      set(fromSession(session));
    });

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!isInitialized) {
          isInitialized = true;
          clearTimeout(fallbackTimer);
          set(fromSession(session));
        }
      })
      .catch(() => {
        if (!isInitialized) {
          isInitialized = true;
          clearTimeout(fallbackTimer);
          set(fromSession(null));
        }
      });

    return () => {
      clearTimeout(fallbackTimer);
      data.subscription.unsubscribe();
    };
  },

  logout: async () => {
    const { error } = await supabase.auth.signOut();

    if (error) throw error;

    set(fromSession(null));
  },
}));
