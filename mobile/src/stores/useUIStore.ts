import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

interface UIStore {
  isValuesHidden: boolean;
  currencyCode: string;
  isAppLockEnabled: boolean;
  isNotificationEnabled: boolean;
  lastSeenVersion: string | null;
  toggleValuesVisibility: () => void;
  setCurrencyCode: (symbol: string) => void;
  setAppLock: (enabled: boolean) => void;
  setNotification: (enabled: boolean) => void;
  markVersionSeen: (version: string) => void;
}

const REGION_CURRENCY_MAP: Record<string, string> = {
  BR: 'BRL',
  US: 'USD',
  GB: 'GBP',
  PT: 'EUR',
  DE: 'EUR',
  FR: 'EUR',
  ES: 'EUR',
  IT: 'EUR',
};

function detectRegionCurrency(): string {
  const locales = Localization.getLocales();
  // Prefer explicit regionCode over language-derived currencyCode (e.g. en-BR -> BRL).
  const region = locales.find((l) => l.regionCode)?.regionCode?.toUpperCase();
  if (region && REGION_CURRENCY_MAP[region]) {
    return REGION_CURRENCY_MAP[region];
  }

  const timeZone = Localization.getCalendars()[0]?.timeZone ?? '';
  if (timeZone.startsWith('America/Sao_Paulo') || timeZone.startsWith('America/Fortaleza') || timeZone.startsWith('America/Recife') || timeZone.startsWith('America/Manaus') || timeZone.startsWith('America/Bahia') || timeZone.startsWith('America/Belem') || timeZone.startsWith('America/Cuiaba')) {
    return 'BRL';
  }

  return locales[0]?.currencyCode || 'BRL';
}

const systemCurrency = detectRegionCurrency();

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      isValuesHidden: true,
      currencyCode: systemCurrency,
      isAppLockEnabled: false,
      isNotificationEnabled: false,
      lastSeenVersion: null,
      
      toggleValuesVisibility: () => set((state) => ({
        isValuesHidden: !state.isValuesHidden 
      })),
      
      setCurrencyCode: (symbol) => set({ currencyCode: symbol }),
      
      setAppLock: (enabled) => set({ isAppLockEnabled: enabled }),
      setNotification: (enabled) => set({ isNotificationEnabled: enabled }),
      markVersionSeen: (version) => set({ lastSeenVersion: version }),
    }),
    {
      name: '@pilar:ui_settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);