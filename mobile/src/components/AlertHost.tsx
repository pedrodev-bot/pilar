import { useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../stores/useThemeStore';
import { useAlertStore, type AlertButton, type AlertVariant } from '../stores/useAlertStore';

const VARIANT_ICONS: Record<AlertVariant, keyof typeof Ionicons.glyphMap> = {
  info: 'information-circle-outline',
  success: 'checkmark-circle-outline',
  warning: 'alert-circle-outline',
  error: 'close-circle-outline',
  danger: 'warning-outline',
};

export function AlertHost() {
  const theme = useTheme();
  const alert = useAlertStore((state) => state.alert);
  const hide = useAlertStore((state) => state.hide);

  // Mantém o último alerta na tela durante a animação de saída.
  const lastAlert = useRef(alert);
  useEffect(() => {
    if (alert) lastAlert.current = alert;
  }, [alert]);
  const config = alert ?? lastAlert.current;

  if (!config) return null;

  const tones: Record<AlertVariant, { color: string; soft: string }> = {
    info: { color: theme.investment, soft: theme.investmentSoft },
    success: { color: theme.income, soft: theme.incomeSoft },
    warning: { color: theme.warning, soft: theme.warningSoft },
    error: { color: theme.expense, soft: theme.expenseSoft },
    danger: { color: theme.expense, soft: theme.expenseSoft },
  };
  const tone = tones[config.variant];
  const stacked = config.buttons.length > 2;

  const handlePress = (button: AlertButton) => {
    const current = useAlertStore.getState().alert;
    button.onPress?.();
    // Se o onPress abriu outro alerta, não fecha o novo.
    if (useAlertStore.getState().alert === current) hide();
  };

  const handleDismiss = () => {
    const cancel = config.buttons.find((button) => button.style === 'cancel');
    if (cancel) handlePress(cancel);
    else hide();
  };

  const buttonStyle = (button: AlertButton) => {
    if (button.style === 'cancel') return { borderWidth: 1, borderColor: theme.cardBorder };
    if (button.style === 'destructive') return { backgroundColor: theme.expense };
    return { backgroundColor: theme.accent };
  };

  const textColor = (button: AlertButton) => {
    if (button.style === 'cancel') return theme.textPrimary;
    if (button.style === 'destructive') return '#FFFFFF';
    return '#000000';
  };

  return (
    <Modal visible={!!alert} transparent animationType="fade" statusBarTranslucent onRequestClose={handleDismiss}>
      <TouchableWithoutFeedback onPress={handleDismiss}>
        <View style={[styles.backdrop, { backgroundColor: theme.modalOverlay }]}>
          <TouchableWithoutFeedback>
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <View style={[styles.iconCircle, { backgroundColor: tone.soft }]}>
                <Ionicons name={config.icon ?? VARIANT_ICONS[config.variant]} size={24} color={tone.color} />
              </View>

              <Text style={[styles.title, { color: theme.textPrimary }]}>{config.title}</Text>
              {!!config.message && (
                <Text style={[styles.message, { color: theme.textSecondary }]}>{config.message}</Text>
              )}

              <View style={[styles.buttons, stacked && styles.buttonsStacked]}>
                {config.buttons.map((button, index) => (
                  <TouchableOpacity
                    key={`${button.text}-${index}`}
                    activeOpacity={0.8}
                    onPress={() => handlePress(button)}
                    style={[styles.button, !stacked && styles.buttonInline, buttonStyle(button)]}
                  >
                    <Text style={[styles.buttonText, { color: textColor(button) }]}>{button.text}</Text>
                  </TouchableOpacity>
                ))}
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
  card: { width: '100%', maxWidth: 340, borderRadius: 20, borderWidth: 1, padding: 22, alignItems: 'center' },
  iconCircle: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  message: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 20 },
  buttons: { flexDirection: 'row', gap: 12, width: '100%', marginTop: 8 },
  buttonsStacked: { flexDirection: 'column' },
  button: { paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  buttonInline: { flex: 1 },
  buttonText: { fontSize: 14, fontWeight: '700' },
});
