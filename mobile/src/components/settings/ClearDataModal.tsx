import { Modal, View, Text, StyleSheet, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../../stores/useThemeStore';
import { useTransactionStore } from '../../stores/transactionStore';

interface ClearDataModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ClearDataModal({ visible, onClose }: ClearDataModalProps) {
  const { t } = useTranslation();
  const theme = useThemeStore((state) => state.theme);
  const clearAllTransactions = useTransactionStore((state) => state.clearAllTransactions);

  const handleConfirm = () => {
    clearAllTransactions();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.backdrop, { backgroundColor: theme.modalOverlay }]}>
          <TouchableWithoutFeedback>
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <View style={styles.iconCircle}>
                <Feather name="trash-2" size={22} color={theme.expense} />
              </View>

              <Text style={[styles.title, { color: theme.textPrimary }]}>
                {t('settings.sections.data.clear.confirmTitle')}
              </Text>
              <Text style={[styles.description, { color: theme.textSecondary }]}>
                {t('settings.sections.data.clear.confirmMessage')}
              </Text>

              <View style={styles.buttonsRow}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={onClose}
                  style={[styles.cancelButton, { borderColor: theme.cardBorder }]}
                >
                  <Text style={[styles.cancelText, { color: theme.textPrimary }]}>{t('common.cancel')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleConfirm}
                  style={[styles.confirmButton, { backgroundColor: theme.expense }]}
                >
                  <Text style={styles.confirmText}>{t('settings.sections.data.clear.confirmText')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 320, borderRadius: 20, borderWidth: 1, padding: 22, alignItems: 'center' },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  description: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 20 },
  buttonsRow: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelButton: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '600' },
  confirmButton: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  confirmText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
