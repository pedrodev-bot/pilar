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
    supabase.auth
      .getSession()
      .then(({ data }) => set(fromSession(data.session)))
      .catch(() => set(fromSession(null)));

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      set(fromSession(session));
    });
    return () => data.subscription.unsubscribe();
  },

  logout: async () => {
    await supabase.auth.signOut();
    set(fromSession(null));
  },
}));