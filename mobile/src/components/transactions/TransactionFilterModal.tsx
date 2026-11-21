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
import { Calendar, DateData } from 'react-native-calendars';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../stores/useThemeStore';
import { isSameMonth, MonthKey } from '../../utils/monthFilter';
import { TransactionType } from '../../utils/importTransactions';
import { MonthCalendarGrid } from '../common/MonthCalendarGrid';

export type PeriodFilter =
  | { kind: 'all' }
  | { kind: 'today' }
  | { kind: 'last_week' }
  | { kind: 'month'; month: MonthKey }
  | { kind: 'custom'; start: string; end: string };

export interface TransactionFilterState {
  period: PeriodFilter;
  types: TransactionType[];
}

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
  const { t } = useTranslation();
  const theme = useTheme();

  const [wasVisible, setWasVisible] = useState(false);
  const [showCustomCalendar, setShowCustomCalendar] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Reset custom calendar visibility to collapsed whenever the modal opens.
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setShowCustomCalendar(false);
      setCustomStart(currentFilter.period.kind === 'custom' ? currentFilter.period.start : '');
      setCustomEnd(currentFilter.period.kind === 'custom' ? currentFilter.period.end : '');
    }
  }

  const handleClose = () => {
    setShowCustomCalendar(false);
    setCustomStart(currentFilter.period.kind === 'custom' ? currentFilter.period.start : '');
    setCustomEnd(currentFilter.period.kind === 'custom' ? currentFilter.period.end : '');
    onClose();
  };

  const handleResetAll = () => {
    setShowCustomCalendar(false);
    setCustomStart('');
    setCustomEnd('');
    onApplyFilter({ period: { kind: 'all' }, types: [] });
    onClose();
  };

  const handleToggleType = (type: TransactionType) => {
    const exists = currentFilter.types.includes(type);
    const nextTypes = exists
      ? currentFilter.types.filter((item) => item !== type)
      : [...currentFilter.types, type];
    onApplyFilter({ ...currentFilter, types: nextTypes });
  };

  const handleDayPress = (day: DateData) => {
    if (!customStart || (customStart && customEnd)) {
      setCustomStart(day.dateString);
      setCustomEnd('');
    } else if (day.dateString < customStart) {
      setCustomStart(day.dateString);
    } else {
      setCustomEnd(day.dateString);
      setShowCustomCalendar(false);
      onApplyFilter({
        ...currentFilter,
        period: { kind: 'custom', start: customStart, end: day.dateString },
      });
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

  const hasAnyFilter =
    currentFilter.period.kind !== 'all' ||
    currentFilter.types.length > 0 ||
    showCustomCalendar ||
    Boolean(customStart);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={[styles.backdrop, { backgroundColor: theme.modalOverlay }]}>
          <TouchableWithoutFeedback>
            <View style={[styles.sheet, { backgroundColor: theme.card }]}>
              <View style={styles.header}>
                <Text style={[styles.title, { color: theme.textPrimary }]}>
                  {t('transactions.filter.modalTitle')}
                </Text>
                {hasAnyFilter && (
                  <TouchableOpacity activeOpacity={0.7} onPress={handleResetAll}>
                    <Text style={[styles.clearText, { color: theme.expense }]}>
                      {t('transactions.filter.clear')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollArea}>
                <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                  {t('transactions.filter.byType')}
                </Text>

                <View style={styles.chipRow}>
                  {(['expense', 'income', 'investment'] as const).map((typeId) => {
                    const isActive = currentFilter.types.includes(typeId);
                    return (
                      <TouchableOpacity
                        key={typeId}
                        activeOpacity={0.7}
                        style={[
                          styles.chip,
                          { borderColor: theme.cardBorder },
                          isActive && { backgroundColor: theme.accent, borderColor: theme.accent },
                        ]}
                        onPress={() => handleToggleType(typeId)}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            { color: isActive ? '#000000' : theme.textSecondary },
                          ]}
                        >
                          {t(`transactionTypes.${typeId}`)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

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
                        ? showCustomCalendar || currentFilter.period.kind === 'custom'
                        : currentFilter.period.kind === chip.id;

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
                            if (currentFilter.period.kind === 'custom' && !showCustomCalendar) {
                              setCustomStart('');
                              setCustomEnd('');
                              onApplyFilter({ ...currentFilter, period: { kind: 'all' } });
                              setShowCustomCalendar(true);
                            } else {
                              setShowCustomCalendar((prev) => !prev);
                            }
                          } else {
                            setShowCustomCalendar(false);
                            setCustomStart('');
                            setCustomEnd('');
                            const nextPeriod =
                              currentFilter.period.kind === chip.id
                                ? ({ kind: 'all' } as const)
                                : ({ kind: chip.id } as const);
                            onApplyFilter({ ...currentFilter, period: nextPeriod });
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

                <Text style={[styles.sectionLabel, { color: theme.textSecondary, marginTop: 4 }]}>
                  {t('transactions.filter.byMonth')}
                </Text>

                <MonthCalendarGrid
                  selectedMonth={
                    currentFilter.period.kind === 'month' ? currentFilter.period.month : null
                  }
                  activeMonths={availableMonths}
                  onSelectMonth={(monthItem) => {
                    setShowCustomCalendar(false);
                    setCustomStart('');
                    setCustomEnd('');
                    const isAlreadySelected =
                      currentFilter.period.kind === 'month' &&
                      isSameMonth(currentFilter.period.month, monthItem);
                    onApplyFilter({
                      ...currentFilter,
                      period: isAlreadySelected ? { kind: 'all' } : { kind: 'month', month: monthItem },
                    });
                    onClose();
                  }}
                />
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
    maxHeight: '82%',
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
});