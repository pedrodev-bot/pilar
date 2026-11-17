import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../../stores/useUIStore';
import { OptionSheet, SheetOption } from './OptionSheet';
import { getCurrencySymbol } from '../../utils/currency';

const CURRENCY_CODES = ['BRL', 'USD', 'EUR', 'GBP'];

interface CurrencyModalProps {
  visible: boolean;
  onClose: () => void;
}

export function CurrencyModal({ visible, onClose }: CurrencyModalProps) {
  const { t, i18n } = useTranslation();
  const { currencySymbol, setCurrencySymbol } = useUIStore();

  const options: SheetOption[] = useMemo(() => {
    const codes = CURRENCY_CODES.includes(currencySymbol) ? CURRENCY_CODES : [currencySymbol, ...CURRENCY_CODES];
    return codes.map((code) => ({ id: code, label: code, sublabel: getCurrencySymbol(code, i18n.language) }));
  }, [currencySymbol]);

  const handleSelect = (code: string) => {
    setCurrencySymbol(code);
    onClose();
  };

  return (
    <OptionSheet
      visible={visible}
      title={t('settings.sections.preferences.currency.title')}
      options={options}
      selectedId={currencySymbol}
      onSelect={handleSelect}
      onClose={onClose}
    />
  );
}
