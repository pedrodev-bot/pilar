import { useMemo, useState } from 'react';
import {
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../stores/useThemeStore';
import {
  formatMonthLabel,
  getAvailableMonthTimeline,
  isSameMonth,
  MonthKey,
  toMonthId,
} from '../../utils/monthFilter';

interface MonthSelectorBarProps {
  selectedMonth: MonthKey;
  onSelectMonth: (month: MonthKey) => void;
  transactionDates: string[];
}

export function MonthSelectorBar({
  selectedMonth,
  onSelectMonth,
  transactionDates,
}: MonthSelectorBarProps) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const { activeMonths, allMonthsInRange } = useMemo(
    () => getAvailableMonthTimeline(transactionDates),
    [transactionDates]
  );

  const currentIndex = useMemo(
    () => activeMonths.findIndex((m) => isSameMonth(m, selectedMonth)),
    [activeMonths, selectedMonth]
  );

  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex >= 0 && currentIndex < activeMonths.length - 1;

  const handlePrev = () => {
    if (canGoPrev) onSelectMonth(activeMonths[currentIndex - 1]);
  };

  const handleNext = () => {
    if (canGoNext) onSelectMonth(activeMonths[currentIndex + 1]);
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_evt, gestureState) =>
          Math.abs(gestureState.dx) > 14 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5,
        onPanResponderRelease: (_evt, gestureState) => {
          if (gestureState.dx > 36 && currentIndex > 0) {
            onSelectMonth(activeMonths[currentIndex - 1]);
          } else if (gestureState.dx < -36 && currentIndex >= 0 && currentIndex < activeMonths.length - 1) {
            onSelectMonth(activeMonths[currentIndex + 1]);
          }
        },
      }),
    [activeMonths, currentIndex, onSelectMonth]
  );

  const currentYear = new Date().getFullYear();
  const label = formatMonthLabel(selectedMonth, i18n.language, currentYear);

  return (
    <>
      <View {...panResponder.panHandlers} style={[styles.bar, { backgroundColor: theme.background }]}>
        <TouchableOpacity
          onPress={handlePrev}
          disabled={!canGoPrev}
          activeOpacity={0.6}
          hitSlop={{ top: 10, bottom: 10, left: 12, right: 12 }}
          style={styles.arrowButton}
        >
          <Feather
            name="chevron-left"
            size={20}
            color={canGoPrev ? theme.textPrimary : theme.textMuted}
            style={{ opacity: canGoPrev ? 1 : 0.35 }}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setIsPickerOpen(true)}
          activeOpacity={0.7}
          style={styles.centerButton}
        >
          <Text style={[styles.monthText, { color: theme.textPrimary }]}>{label}</Text>
          <Feather name="chevron-down" size={14} color={theme.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleNext}
          disabled={!canGoNext}
          activeOpacity={0.6}
          hitSlop={{ top: 10, bottom: 10, left: 12, right: 12 }}
          style={styles.arrowButton}
        >
          <Feather
            name="chevron-right"
            size={20}
            color={canGoNext ? theme.textPrimary : theme.textMuted}
            style={{ opacity: canGoNext ? 1 : 0.35 }}
          />
        </TouchableOpacity>
      </View>

      <Modal
        visible={isPickerOpen}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setIsPickerOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsPickerOpen(false)}>
          <View style={[styles.backdrop, { backgroundColor: theme.modalOverlay }]}>
            <TouchableWithoutFeedback>
              <View style={[styles.sheet, { backgroundColor: theme.card }]}>
                <Text style={[styles.sheetTitle, { color: theme.textPrimary }]}>
                  {t('home.monthSelector.modalTitle')}
                </Text>

                <ScrollView style={styles.sheetList} showsVerticalScrollIndicator={false}>
                  {[...allMonthsInRange].reverse().map((item, index, arr) => {
                    const isSelected = isSameMonth(item, selectedMonth);
                    const isLast = index === arr.length - 1;
                    const isDisabled = !item.hasTransactions;

                    return (
                      <TouchableOpacity
                        key={toMonthId(item)}
                        activeOpacity={isDisabled ? 1 : 0.7}
                        disabled={isDisabled}
                        onPress={() => {
                          onSelectMonth({ year: item.year, month: item.month });
                          setIsPickerOpen(false);
                        }}
                        style={[
                          styles.option,
                          !isLast && { borderBottomWidth: 1, borderBottomColor: theme.cardBorder },
                          isDisabled && { opacity: 0.38 },
                        ]}
                      >
                        <Text
                          style={[
                            styles.optionLabel,
                            { color: isDisabled ? theme.textSecondary : theme.textPrimary },
                          ]}
                        >
                          {formatMonthLabel(item, i18n.language, currentYear)}
                        </Text>

                        {isSelected ? (
                          <Feather name="check" size={20} color={theme.accent} />
                        ) : (
                          isDisabled && (
                            <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>
                              {t('home.monthSelector.emptyMonth')}
                            </Text>
                          )
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  arrowButton: {
    padding: 6,
  },
  centerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  monthText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    maxHeight: '65%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 32,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  sheetList: {
    flexGrow: 0,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyHint: {
    fontSize: 12,
    fontWeight: '500',
  },
});