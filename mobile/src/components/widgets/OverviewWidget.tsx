import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useTransactionStore } from '../../stores/transactionStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useUIStore } from '../../stores/useUIStore';
import { useCurrencyFormatter } from '../../hooks/useCurrencyFormatter';
import { useTheme } from '../../stores/useThemeStore';
import { useTranslation } from 'react-i18next';
import { isBeforeMonth, matchesMonth, MonthKey } from '../../utils/monthFilter';

interface OverviewWidgetProps {
  selectedMonth: MonthKey;
}

export function OverviewWidget({ selectedMonth }: OverviewWidgetProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const isValuesHidden = useUIStore((state) => state.isValuesHidden);
  const formatCurrency = useCurrencyFormatter();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const allTransactions = useTransactionStore((state) => state.transactions);

  const {
    income,
    expense,
    investment,
    totalInvestmentAccumulated,
    previousBalance,
    monthlyNet,
    totalBalance,
  } = useMemo(() => {
    const userTx = allTransactions.filter((tx) => tx.userId === currentUserId);
    let inc = 0;
    let exp = 0;
    let inv = 0;
    let prevBal = 0;
    let prevInv = 0;

    userTx.forEach((tx) => {
      const val = Number(tx.amount || 0);
      if (matchesMonth(tx.date, selectedMonth)) {
        if (tx.type === 'income') inc += val;
        else if (tx.type === 'expense') exp += val;
        else if (tx.type === 'investment') inv += val;
      } else if (isBeforeMonth(tx.date, selectedMonth)) {
        // Carry over prior months' net cash balance (income minus expenses and investments).
        if (tx.type === 'income') prevBal += val;
        else if (tx.type === 'expense') prevBal -= val;
        else if (tx.type === 'investment') {
          prevBal -= val;
          prevInv += val;
        }
      }
    });

    const net = inc - exp - inv;

    return {
      income: inc,
      expense: exp,
      investment: inv,
      totalInvestmentAccumulated: prevInv + inv,
      previousBalance: prevBal,
      monthlyNet: net,
      totalBalance: prevBal + net,
    };
  }, [allTransactions, currentUserId, selectedMonth]);

  const formatSigned = (value: number) => {
    if (isValuesHidden) return formatCurrency(value);
    const prefix = value > 0 ? '+' : '';
    return `${prefix}${formatCurrency(value)}`;
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      <View style={styles.totalHeader}>
        <Text style={[styles.title, { color: theme.textSecondary }]}>
          {t('home.widgets.overview.totalBalance')}
        </Text>
        <Text style={[styles.totalValue, { color: theme.textPrimary }]}>
          {formatCurrency(totalBalance)}
        </Text>

        {previousBalance !== 0 && (
          <View style={[styles.carryOverPill, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
            <Text style={[styles.carryOverText, { color: theme.textSecondary }]}>
              {t('home.widgets.overview.previousBalance', { amount: formatSigned(previousBalance) })}
              {'  •  '}
              {t('home.widgets.overview.monthlyResult', { amount: formatSigned(monthlyNet) })}
            </Text>
          </View>
        )}
      </View>

      <View style={[styles.row, { borderTopColor: theme.cardBorder }]}>
        <View style={styles.col}>
          <Text style={[styles.colTitle, { color: theme.textSecondary }]}>{t('transactionTypes.income')}</Text>
          <View style={styles.valRow}>
            <Ionicons name="arrow-up" size={14} color={theme.income} />
            <Text style={[styles.colVal, { color: isValuesHidden ? theme.textPrimary : theme.income }]} numberOfLines={1} adjustsFontSizeToFit>
              {formatCurrency(income)}
            </Text>
          </View>
        </View>

        <View style={styles.col}>
          <Text style={[styles.colTitle, { color: theme.textSecondary }]}>{t('transactionTypes.expense')}</Text>
          <View style={styles.valRow}>
            <Ionicons name="arrow-down" size={14} color={theme.expense} />
            <Text style={[styles.colVal, { color: isValuesHidden ? theme.textPrimary : theme.expense }]} numberOfLines={1} adjustsFontSizeToFit>
              {formatCurrency(expense)}
            </Text>
          </View>
        </View>

        <View style={styles.col}>
          <Text style={[styles.colTitle, { color: theme.textSecondary }]}>{t('transactionTypes.investment')}</Text>
          <View style={styles.valRow}>
            <FontAwesome5 name="coins" size={11} color={theme.investment} style={{ marginRight: 2 }} />
            <Text style={[styles.colVal, { color: isValuesHidden ? theme.textPrimary : theme.investment }]} numberOfLines={1} adjustsFontSizeToFit>
              {formatCurrency(investment)}
            </Text>
          </View>
          <Text style={[styles.accumulatedSubtext, { color: theme.textSecondary }]} numberOfLines={1}>
            {t('home.widgets.overview.accumulatedInvestment', {
              amount: formatCurrency(totalInvestmentAccumulated),
            })}
          </Text>
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
  totalHeader: {
    marginBottom: 18,
    alignItems: 'center',
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  totalValue: {
    fontSize: 32,
    fontWeight: '700',
  },
  carryOverPill: {
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  carryOverText: {
    fontSize: 11,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 16,
  },
  col: {
    flex: 1,
    alignItems: 'center',
  },
  colTitle: {
    fontSize: 11,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  valRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  colVal: {
    fontSize: 13,
    fontWeight: '700',
  },
  accumulatedSubtext: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 4,
  },
});