import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

interface UIStore {
  isValuesHidden: boolean;
  currencySymbol: string;
  isAppLockEnabled: boolean;
  isNotificationEnabled: boolean;
  toggleValuesVisibility: () => void;
  setCurrencySymbol: (symbol: string) => void;
  setAppLock: (enabled: boolean) => void;
  setNotification: (enabled: boolean) => void;
}

const systemCurrency = Localization.getLocales()[0]?.currencyCode || 'BRL';

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      isValuesHidden: true, 
      currencySymbol: systemCurrency,
      isAppLockEnabled: false,
      isNotificationEnabled: false,
      
      toggleValuesVisibility: () => set((state) => ({ 
        isValuesHidden: !state.isValuesHidden 
      })),
      
      setCurrencySymbol: (symbol) => set({ currencySymbol: symbol }),
      
      setAppLock: (enabled) => set({ isAppLockEnabled: enabled }),
      setNotification: (enabled) => set({ isNotificationEnabled: enabled }),
    }),
    {
      name: '@core_finance:ui_settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);