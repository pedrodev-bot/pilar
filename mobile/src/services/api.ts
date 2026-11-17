import { Platform } from 'react-native';
import i18n from '../locales/i18n';
import { supabase } from './supabase';

const DEV_API_URL = Platform.select({
  android: 'http://10.0.2.2:8000',
  default: 'http://localhost:8000',
});

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || DEV_API_URL;


export async function authFetch(path: string, init: RequestInit = {}) {
  const { data, error } = await supabase.auth.getSession();

  if (error) throw error;

  const session = data.session;

  if (!session?.access_token) {
    throw new Error(i18n.t('auth.errors.unauthorized'));
  }

  const makeRequest = (accessToken: string) =>
    fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init.headers,
        Authorization: `Bearer ${accessToken}`,
      },
    });

  const response = await makeRequest(session.access_token);

  if (response.status !== 401) {
    return response;
  }

  const { data: refreshedData, error: refreshError } =
    await supabase.auth.refreshSession();

  if (refreshError || !refreshedData.session?.access_token) {
    return response;
  }

  return makeRequest(refreshedData.session.access_token);
}

