import { useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Calendar, DateData } from 'react-native-calendars';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../stores/useThemeStore';
import { formatMonthLabel, MonthKey, toMonthId } from '../../utils/monthFilter';

export type TransactionFilterState =
  | { kind: 'all' }
  | { kind: 'today' }
  | { kind: 'last_week' }
  | { kind: 'month'; month: MonthKey }
  | { kind: 'custom'; start: string; end: string };

interface TransactionFilterModalProps {
  visible: boolean;
  onClose: () => void;
  currentFilter: TransactionFilterState;
  onApplyFilter: (filter: TransactionFilterState) => void;
  availableMonths: MonthKey[];
}

export function TransactionFilterModal({
  visible,
  onClose,
  currentFilter,
  onApplyFilter,
  availableMonths,
}: TransactionFilterModalProps) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const currentYear = new Date().getFullYear();

  const [showCustomCalendar, setShowCustomCalendar] = useState(currentFilter.kind === 'custom');
  const [customStart, setCustomStart] = useState(
    currentFilter.kind === 'custom' ? currentFilter.start : ''
  );
  const [customEnd, setCustomEnd] = useState(
    currentFilter.kind === 'custom' ? currentFilter.end : ''
  );

  const handleDayPress = (day: DateData) => {
    if (!customStart || (customStart && customEnd)) {
      setCustomStart(day.dateString);
      setCustomEnd('');
    } else if (day.dateString < customStart) {
      setCustomStart(day.dateString);
    } else {
      setCustomEnd(day.dateString);
      onApplyFilter({ kind: 'custom', start: customStart, end: day.dateString });
      onClose();
    }
  };

  const markedDates = useMemo(() => {
    const marks: Record<string, { startingDay?: boolean; endingDay?: boolean; color: string; textColor: string }> = {};
    if (customStart) {
      marks[customStart] = { startingDay: true, color: theme.accent, textColor: '#000000' };
    }
    if (customEnd) {
      marks[customEnd] = { endingDay: true, color: theme.accent, textColor: '#000000' };
      const cursor = new Date(`${customStart}T12:00:00`);
      cursor.setDate(cursor.getDate() + 1);
      const endObj = new Date(`${customEnd}T12:00:00`);

      while (cursor < endObj) {
        const key = cursor.toISOString().split('T')[0];
        marks[key] = { color: 'rgba(163, 230, 53, 0.2)', textColor: theme.textPrimary };
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    return marks;
  }, [customStart, customEnd, theme.accent, theme.textPrimary]);

  const calendarTheme = {
    calendarBackground: theme.background,
    textSectionTitleColor: theme.textSecondary,
    dayTextColor: theme.textPrimary,
    todayTextColor: theme.accent,
    selectedDayTextColor: '#000000',
    monthTextColor: theme.textPrimary,
    indicatorColor: theme.accent,
    arrowColor: theme.textPrimary,
    selectedDayBackgroundColor: theme.accent,
  };

  const reversedMonths = useMemo(() => [...availableMonths].reverse(), [availableMonths]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.backdrop, { backgroundColor: theme.modalOverlay }]}>
          <TouchableWithoutFeedback>
            <View style={[styles.sheet, { backgroundColor: theme.card }]}>
              <View style={styles.header}>
                <Text style={[styles.title, { color: theme.textPrimary }]}>
                  {t('transactions.filter.modalTitle')}
                </Text>
                {currentFilter.kind !== 'all' && (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      setShowCustomCalendar(false);
                      setCustomStart('');
                      setCustomEnd('');
                      onApplyFilter({ kind: 'all' });
                      onClose();
                    }}
                  >
                    <Text style={[styles.clearText, { color: theme.expense }]}>
                      {t('transactions.filter.clear')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollArea}>
                <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                  {t('transactions.filter.quickPeriods')}
                </Text>

                <View style={styles.chipRow}>
                  {[
                    { id: 'today' as const, label: t('transactions.filter.presets.today') },
                    { id: 'last_week' as const, label: t('transactions.filter.presets.lastWeek') },
                    { id: 'custom' as const, label: t('transactions.filter.presets.custom') },
                  ].map((chip) => {
                    const isActive =
                      chip.id === 'custom'
                        ? showCustomCalendar || currentFilter.kind === 'custom'
                        : currentFilter.kind === chip.id;

                    return (
                      <TouchableOpacity
                        key={chip.id}
                        activeOpacity={0.7}
                        style={[
                          styles.chip,
                          { borderColor: theme.cardBorder },
                          isActive && { backgroundColor: theme.accent, borderColor: theme.accent },
                        ]}
                        onPress={() => {
                          if (chip.id === 'custom') {
                            setShowCustomCalendar((prev) => !prev);
                          } else {
                            setShowCustomCalendar(false);
                            onApplyFilter({ kind: chip.id });
                            onClose();
                          }
                        }}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            { color: isActive ? '#000000' : theme.textSecondary },
                          ]}
                        >
                          {chip.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {showCustomCalendar && (
                  <View style={[styles.calendarWrapper, { borderColor: theme.cardBorder }]}>
                    <Calendar
                      firstDay={0}
                      markedDates={markedDates}
                      markingType="period"
                      onDayPress={handleDayPress}
                      theme={calendarTheme}
                    />
                  </View>
                )}

                <Text style={[styles.sectionLabel, { color: theme.textSecondary, marginTop: 8 }]}>
                  {t('transactions.filter.byMonth')}
                </Text>

                {reversedMonths.map((monthItem, index) => {
                  const isSelected =
                    currentFilter.kind === 'month' &&
                    currentFilter.month.year === monthItem.year &&
                    currentFilter.month.month === monthItem.month;
                  const isLast = index === reversedMonths.length - 1;

                  return (
                    <TouchableOpacity
                      key={toMonthId(monthItem)}
                      activeOpacity={0.7}
                      onPress={() => {
                        onApplyFilter({ kind: 'month', month: monthItem });
                        onClose();
                      }}
                      style={[
                        styles.monthRow,
                        !isLast && { borderBottomWidth: 1, borderBottomColor: theme.cardBorder },
                      ]}
                    >
                      <Text style={[styles.monthText, { color: theme.textPrimary }]}>
                        {formatMonthLabel(monthItem, i18n.language, currentYear)}
                      </Text>
                      {isSelected && <Feather name="check" size={20} color={theme.accent} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    maxHeight: '80%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  clearText: {
    fontSize: 13,
    fontWeight: '600',
  },
  scrollArea: {
    flexGrow: 0,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  calendarWrapper: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
  },
  monthText: {
    fontSize: 16,
    fontWeight: '600',
  },
});