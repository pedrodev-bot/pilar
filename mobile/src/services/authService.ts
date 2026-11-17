import { supabase } from './supabase';
import { authFetch } from './api';
import i18n from '../locales/i18n';

export async function loginRequest(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function registerRequest(email: string, password: string, name: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } },
  });
  if (error) throw error;
  return data;
}

export async function deleteAccountRequest() {
  const response = await authFetch('/users/me', { method: 'DELETE' });
  if (!response.ok) throw new Error(i18n.t('auth.errors.deleteFailed'));
}
