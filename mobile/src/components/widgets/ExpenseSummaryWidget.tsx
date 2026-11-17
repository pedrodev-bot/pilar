import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ExpenseSummaryVariant } from '../../types/widgets';
import { useAuthStore } from '../../stores/useAuthStore';
import { useTransactionStore } from '../../stores/transactionStore';
import { useUIStore } from '../../stores/useUIStore';
import { useCurrencyFormatter } from '../../hooks/useCurrencyFormatter';
import { useTranslation, Trans } from 'react-i18next';
import { useTheme } from '../../stores/useThemeStore';

interface Props {
  variant?: ExpenseSummaryVariant;
}

export function ExpenseSummaryWidget({ variant = 'chart_screen_time' }: Props) {
  const theme = useTheme();
  const [selectedBarData, setSelectedBarData] = useState<{ 
    label: string; 
    amount: number; 
    isMonth: boolean; 
    startStr?: string; 
    endStr?: string 
  } | null>(null);
  const [period, setPeriod] = useState<'1S' | '1M'>('1S');
  const currentUserId = useAuthStore((state) => state.user?.id);
  const allTransactions = useTransactionStore((state) => state.transactions);
  const isValuesHidden = useUIStore((state) => state.isValuesHidden);
  const formatCurrency = useCurrencyFormatter();

  const { t } = useTranslation();
  const periodLabels = {
    '1S': t('home.widgets.expenseSummary.periods.oneWeek'),
    '1M': t('home.widgets.expenseSummary.periods.oneMonth'),
  };

  const { chartData, totalSpent, averageValue, maxAmount } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const userExpenses = allTransactions.filter(
      (t) => t.userId === currentUserId && t.type === 'expense'
    );

    let calculatedData: { label: string; amount: number; isMonth: boolean; startStr?: string; endStr?: string }[] = [];
    let activeExpenses: typeof userExpenses = [];
    let calculatedAverage = 0;

    if (period === '1S') {
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 6);

      activeExpenses = userExpenses.filter((t) => {
        const tDate = new Date(t.date);
        tDate.setHours(0, 0, 0, 0);
        return tDate >= startDate && tDate <= today;
      });

      calculatedData = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        const dayStr = String(d.getDate()).padStart(2, '0');

        const amount = activeExpenses
          .filter((t) => {
            const tDate = new Date(t.date);
            return tDate.getDate() === d.getDate() && tDate.getMonth() === d.getMonth();
          })
          .reduce((sum, t) => sum + Number(t.amount || 0), 0);

        return { label: dayStr, amount, isMonth: false };
      });

      const total = activeExpenses.reduce((sum, t) => sum + Number(t.amount || 0), 0);
      calculatedAverage = total / 7;

    } else {
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

      activeExpenses = userExpenses.filter((t) => {
        const tDate = new Date(t.date);
        return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
      });

      const monthRanges = [
        { start: 1, end: 7 },
        { start: 8, end: 14 },
        { start: 15, end: 21 },
        { start: 22, end: 28 }
      ];
      if (lastDayOfMonth >= 29) {
        monthRanges.push({ start: 29, end: lastDayOfMonth });
      }

      calculatedData = monthRanges.map((range) => {
        const startStr = String(range.start).padStart(2, '0');
        const endStr = String(range.end).padStart(2, '0');
        const label = `${startStr}-${endStr}`;
        
        const amount = activeExpenses
          .filter((t) => {
            const d = new Date(t.date).getDate();
            return d >= range.start && d <= range.end;
          })
          .reduce((sum, t) => sum + Number(t.amount || 0), 0);

        return { label, amount, isMonth: true, startStr, endStr };
      });

      const total = activeExpenses.reduce((sum, t) => sum + Number(t.amount || 0), 0);
      
      const currentDay = today.getDate();
      const weeksElapsed = Math.min(Math.ceil(currentDay / 7), monthRanges.length);
      calculatedAverage = total / (weeksElapsed || 1);
    }

    const total = activeExpenses.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const max = Math.max(...calculatedData.map((d) => d.amount), 1);

    return {
      chartData: calculatedData,
      totalSpent: total,
      averageValue: calculatedAverage,
      maxAmount: max,
    };
  }, [allTransactions, currentUserId, period]);

  if (variant === 'compact') {
    return (
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <Text style={[styles.totalValue, { color: theme.textPrimary }]}>
          {formatCurrency(variant === 'compact' ? totalSpent : (selectedBarData ? selectedBarData.amount : totalSpent))}
        </Text>
      </View>
    );
  }

  const chartHeight = 130;
  const trackHeight = 90;
  const averageLineBottom = Math.min(
    (averageValue / maxAmount) * trackHeight + 24,
    chartHeight
  );

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            {selectedBarData
            ? (selectedBarData.isMonth 
                ? t('home.widgets.expenseSummary.spentOnPeriod', { 
                    start: selectedBarData.startStr,
                    end: selectedBarData.endStr
                  })
                : t('home.widgets.expenseSummary.spentOnDay', {
                    day: selectedBarData.label,
                    month: String(new Date().getMonth() + 1).padStart(2, '0'),
                  })
              )
            : t('home.widgets.expenseSummary.totalSpent')}
          </Text>
          <Text style={[styles.totalValue, { color: theme.textPrimary }]}>
            {formatCurrency(selectedBarData ? selectedBarData.amount : totalSpent)}
          </Text>
        </View>

        <View style={[styles.periodSelector, { backgroundColor: theme.background }]}>
          {(['1S', '1M'] as const).map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setPeriod(p)}
              style={[styles.periodBtn, period === p && { backgroundColor: theme.cardBorder }]}
            >
              <Text
                style={[styles.periodText, { color: period === p ? theme.textPrimary : theme.textSecondary }]}
              >
                {periodLabels[p]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Text style={[styles.subtext, { color: theme.income }]}>
        {selectedBarData
        ? t('home.widgets.expenseSummary.tapBarAgain')
        : <Trans 
            i18nKey={
              period === '1S' 
                ? 'home.widgets.expenseSummary.dailyAverage' 
                : 'home.widgets.expenseSummary.weeklyAverage'
            }
            values={{
              amount: formatCurrency(averageValue)
            }}
            components={{
              val: <Text style={{ color: theme.textPrimary }} />
            }}
          />
        }
      </Text>

      <View style={[styles.chartContainer, { height: chartHeight }]}>
        {!isValuesHidden && averageValue > 0 && (
          <View style={[styles.averageLine, { bottom: averageLineBottom, borderColor: theme.warning }]}>
            <Text style={[styles.averageTag, { color: theme.warning, backgroundColor: theme.card }]}>{t('home.widgets.expenseSummary.averageTag')}</Text>
          </View>
        )}

        <View style={styles.barsRow}>
          {chartData.map((item, index) => {
            const isSelected = selectedBarData?.label === item.label;
            const barFillHeight =
              maxAmount > 0 ? (item.amount / maxAmount) * chartHeight : 0;

            return (
              <TouchableOpacity
                key={index}
                activeOpacity={0.7}
                onPress={() => {
                  setSelectedBarData(isSelected ? null : item);
                }}
                style={styles.barColumn}
              >
                <View style={[styles.barTrack, { height: trackHeight, backgroundColor: theme.cardBorder }]}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: isValuesHidden 
                          ? 0 
                          : Math.max(barFillHeight, item.amount > 0 ? 8 : 0),
                        backgroundColor: isSelected ? theme.accent : theme.investment,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.barLabel, { color: isSelected ? theme.textPrimary : theme.textSecondary }, isSelected && { fontWeight: '700' }]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  label: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 26,
    fontWeight: '700',
    marginTop: 4,
  },
  subtext: {
    fontSize: 13,
    marginTop: 2,
    marginBottom: 16,
    fontWeight: '500',
  },
  periodSelector: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 3,
  },
  periodBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  periodText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chartContainer: {
    position: 'relative',
    width: '100%',
    justifyContent: 'flex-end',
  },
  averageLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  averageTag: {
    fontSize: 9,
    fontWeight: '700',
    paddingHorizontal: 4,
    top: -7,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
  },
  barTrack: {
    justifyContent: 'flex-end',
    width: 14,
    borderRadius: 7,
    overflow: 'hidden',
  },
  barFill: {
    borderRadius: 7,
  },
  barLabel: {
    fontSize: 11,
    marginTop: 6,
  },
});