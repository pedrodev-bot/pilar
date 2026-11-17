import { Modal, View, Text, StyleSheet, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../stores/useThemeStore';

export interface SheetOption {
  id: string;
  label: string;
  sublabel?: string;
}

interface OptionSheetProps {
  visible: boolean;
  title: string;
  options: SheetOption[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}

export function OptionSheet({ visible, title, options, selectedId, onSelect, onClose }: OptionSheetProps) {
  const theme = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.backdrop, { backgroundColor: theme.modalOverlay }]}>
          <TouchableWithoutFeedback>
            <View style={[styles.sheet, { backgroundColor: theme.card }]}>
              <Text style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>

              {options.map((option, index) => {
                const isSelected = option.id === selectedId;
                const isLast = index === options.length - 1;

                return (
                  <TouchableOpacity
                    key={option.id}
                    activeOpacity={0.7}
                    onPress={() => onSelect(option.id)}
                    style={[styles.option, !isLast && { borderBottomWidth: 1, borderBottomColor: theme.cardBorder }]}
                  >
                    <View style={styles.optionText}>
                      <Text style={[styles.label, { color: theme.textPrimary }]}>{option.label}</Text>
                      {option.sublabel && (
                        <Text style={[styles.sublabel, { color: theme.textSecondary }]}>{option.sublabel}</Text>
                      )}
                    </View>
                    {isSelected && <Feather name="check" size={20} color={theme.accent} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: { width: '100%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 32 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  option: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  optionText: { flex: 1 },
  label: { fontSize: 16, fontWeight: '600' },
  sublabel: { fontSize: 13, marginTop: 2 },
});