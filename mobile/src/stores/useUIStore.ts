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

const systemCurrency = Localization.getLocales()[0]?.currencyCode || 'BRL';

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