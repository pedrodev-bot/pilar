import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
if (Platform.OS !== 'web') {
  require('react-native-url-polyfill/auto');
}
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error('Defina EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY no .env');
}

const isWeb = Platform.OS === 'web';
const hasBrowserStorage =
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const storageAdapter = isWeb
  ? {
      getItem: (key: string) =>
        Promise.resolve(hasBrowserStorage ? window.localStorage.getItem(key) : null),
      setItem: (key: string, value: string) => {
        if (hasBrowserStorage) window.localStorage.setItem(key, value);
        return Promise.resolve();
      },
      removeItem: (key: string) => {
        if (hasBrowserStorage) window.localStorage.removeItem(key);
        return Promise.resolve();
      },
    }
  : {
      getItem: (key: string) => SecureStore.getItemAsync(key),
      setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
      removeItem: (key: string) => SecureStore.deleteItemAsync(key),
    };

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: storageAdapter,
    autoRefreshToken: isWeb ? hasBrowserStorage : true,
    persistSession: isWeb ? hasBrowserStorage : true,
    detectSessionInUrl: false,
  },
});