import { create } from 'zustand';
import { darkTheme, lightTheme, Theme } from '../constants/theme';

interface ThemeState {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: darkTheme,
  isDark: true,
  toggleTheme: () =>
    set((state) => {
      const nextIsDark = !state.isDark;
      return {
        isDark: nextIsDark,
        theme: (nextIsDark ? darkTheme : lightTheme) as Theme,
      };
    }),
}));