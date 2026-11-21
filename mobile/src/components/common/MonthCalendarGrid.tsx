import { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../stores/useThemeStore';
import { getCurrentMonthKey, isSameMonth, MonthKey, toMonthId } from '../../utils/monthFilter';

interface MonthCalendarGridProps {
  selectedMonth: MonthKey | null;
  onSelectMonth: (month: MonthKey) => void;
  activeMonths?: MonthKey[];
  disableEmptyMonths?: boolean;
}

export function MonthCalendarGrid({
  selectedMonth,
  onSelectMonth,
  activeMonths,
  disableEmptyMonths = false,
}: MonthCalendarGridProps) {
  const { i18n } = useTranslation();
  const theme = useTheme();
  const current = useMemo(() => getCurrentMonthKey(), []);
  const [displayYear, setDisplayYear] = useState<number>(
    () => selectedMonth?.year ?? current.year
  );

  const activeSet = useMemo(
    () => (activeMonths ? new Set(activeMonths.map(toMonthId)) : null),
    [activeMonths]
  );

  const minYear = useMemo(() => {
    if (!activeMonths || activeMonths.length === 0) return current.year - 5;
    return Math.min(...activeMonths.map((m) => m.year), current.year);
  }, [activeMonths, current.year]);

  const monthNames = useMemo(
    () =>
      Array.from({ length: 12 }, (_, idx) => {
        const raw = new Date(displayYear, idx, 15).toLocaleString(i18n.language, {
          month: 'short',
        });
        const clean = raw.replace('.', '');
        return clean.charAt(0).toUpperCase() + clean.slice(1);
      }),
    [displayYear, i18n.language]
  );

  const canGoPrevYear = displayYear > minYear;
  const canGoNextYear = displayYear < current.year;

  return (
    <View style={[styles.container, { borderColor: theme.cardBorder, backgroundColor: theme.background }]}>
      <View style={styles.yearHeader}>
        <TouchableOpacity
          onPress={() => canGoPrevYear && setDisplayYear((y) => y - 1)}
          disabled={!canGoPrevYear}
          hitSlop={{ top: 10, bottom: 10, left: 12, right: 12 }}
          style={styles.yearArrow}
        >
          <Feather
            name="chevron-left"
            size={18}
            color={canGoPrevYear ? theme.textPrimary : theme.textMuted}
            style={{ opacity: canGoPrevYear ? 1 : 0.35 }}
          />
        </TouchableOpacity>

        <Text style={[styles.yearLabel, { color: theme.textPrimary }]}>{displayYear}</Text>

        <TouchableOpacity
          onPress={() => canGoNextYear && setDisplayYear((y) => y + 1)}
          disabled={!canGoNextYear}
          hitSlop={{ top: 10, bottom: 10, left: 12, right: 12 }}
          style={styles.yearArrow}
        >
          <Feather
            name="chevron-right"
            size={18}
            color={canGoNextYear ? theme.textPrimary : theme.textMuted}
            style={{ opacity: canGoNextYear ? 1 : 0.35 }}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        {monthNames.map((label, monthIdx) => {
          const item: MonthKey = { year: displayYear, month: monthIdx };
          const isFuture =
            displayYear > current.year ||
            (displayYear === current.year && monthIdx > current.month);
          const hasData = activeSet ? activeSet.has(toMonthId(item)) : true;
          const isDisabled = isFuture || (disableEmptyMonths && !hasData);
          const isSelected = selectedMonth !== null && isSameMonth(item, selectedMonth);
          const isCurrent = isSameMonth(item, current);

          return (
            <TouchableOpacity
              key={monthIdx}
              activeOpacity={0.7}
              disabled={isDisabled}
              onPress={() => onSelectMonth(item)}
              style={[
                styles.cell,
                {
                  borderColor: isSelected
                    ? theme.accent
                    : isCurrent
                      ? theme.cardBorder
                      : 'transparent',
                  backgroundColor: isSelected ? theme.accent : theme.card,
                  opacity: isDisabled ? 0.32 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.cellText,
                  { color: isSelected ? '#000000' : theme.textPrimary },
                  isSelected && { fontWeight: '800' },
                ]}
              >
                {label}
              </Text>
              {hasData && !isSelected && (
                <View style={[styles.dot, { backgroundColor: theme.accent }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  yearHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  yearArrow: {
    padding: 4,
  },
  yearLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cell: {
    width: '22.8%',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 13,
    fontWeight: '600',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },
});