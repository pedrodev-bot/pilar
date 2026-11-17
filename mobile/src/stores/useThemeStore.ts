import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkTheme, lightTheme, Theme } from '../constants/theme';

interface ThemeState {
  isDark: boolean;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      isDark: true,
      toggleTheme: () => set((state) => ({ isDark: !state.isDark })),
    }),
    {
      name: '@pilar:theme',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export const useTheme = () =>
  useThemeStore((state) => (state.isDark ? darkTheme : lightTheme) as Theme);
