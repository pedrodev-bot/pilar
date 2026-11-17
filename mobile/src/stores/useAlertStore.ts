import { create } from 'zustand';
import type { Ionicons } from '@expo/vector-icons';
import i18n from '../locales/i18n';

export type AlertVariant = 'info' | 'success' | 'warning' | 'error' | 'danger';

export interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

export interface AlertOptions {
  variant?: AlertVariant;
  icon?: keyof typeof Ionicons.glyphMap;
}

export interface AlertConfig {
  title: string;
  message?: string;
  buttons: AlertButton[];
  variant: AlertVariant;
  icon?: AlertOptions['icon'];
}

interface AlertState {
  alert: AlertConfig | null;
  show: (config: AlertConfig) => void;
  hide: () => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  alert: null,
  show: (alert) => set({ alert }),
  hide: () => set({ alert: null }),
}));

export function showAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[],
  options: AlertOptions = {}
) {
  const resolvedButtons = buttons?.length ? buttons : [{ text: i18n.t('common.ok') }];
  const hasDestructive = resolvedButtons.some((button) => button.style === 'destructive');

  useAlertStore.getState().show({
    title,
    message,
    buttons: resolvedButtons,
    variant: options.variant ?? (hasDestructive ? 'danger' : 'info'),
    icon: options.icon,
  });
}
