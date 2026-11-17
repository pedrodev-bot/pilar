import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../stores/useUIStore';
import { formatCurrency, getCurrencySymbol } from '../utils/currency';

export function useCurrencyFormatter() {
  const { i18n } = useTranslation();
  const isValuesHidden = useUIStore((state) => state.isValuesHidden);
  const currencyCode = useUIStore((state) => state.currencyCode);

  return useCallback(
    (value: number) =>
      isValuesHidden
        ? `${getCurrencySymbol(currencyCode, i18n.language)} ••••`
        : formatCurrency(value, currencyCode, i18n.language),
    [isValuesHidden, currencyCode, i18n.language]
  );
}