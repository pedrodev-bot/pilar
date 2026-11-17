import { useTranslation } from 'react-i18next';
import { OptionSheet, SheetOption } from './OptionSheet';

const LANGUAGES: SheetOption[] = [
  { id: 'pt-BR', label: 'Português' },
  { id: 'en-US', label: 'English' },
];

interface LanguageModalProps {
  visible: boolean;
  onClose: () => void;
}

export function LanguageModal({ visible, onClose }: LanguageModalProps) {
  const { t, i18n } = useTranslation();
  const selectedId = i18n.language.startsWith('pt') ? 'pt-BR' : 'en-US';

  const handleSelect = (languageId: string) => {
    i18n.changeLanguage(languageId);
    onClose();
  };

  return (
    <OptionSheet
      visible={visible}
      title={t('settings.sections.preferences.language.title')}
      options={LANGUAGES}
      selectedId={selectedId}
      onSelect={handleSelect}
      onClose={onClose}
    />
  );
}
