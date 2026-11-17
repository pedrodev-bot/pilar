import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useTransactionStore } from '../../stores/transactionStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useUIStore } from '../../stores/useUIStore';
import { useCurrencyFormatter } from '../../hooks/useCurrencyFormatter';
import { useTheme } from '../../stores/useThemeStore';
import { useTranslation } from 'react-i18next';

export function OverviewWidget() {
  const theme = useTheme();
  const { t } = useTranslation();
  const isValuesHidden = useUIStore((state) => state.isValuesHidden);
  const formatCurrency = useCurrencyFormatter();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const allTransactions = useTransactionStore((state) => state.transactions);

  const { income, expense, investment, total } = useMemo(() => {
    const userTx = allTransactions.filter(t => t.userId === currentUserId);
    let inc = 0, exp = 0, inv = 0;
    
    userTx.forEach(t => {
      const val = Number(t.amount || 0);
      if (t.type === 'income') inc += val;
      else if (t.type === 'expense') exp += val;
      else if (t.type === 'investment') inv += val;
    });
    
    // O Saldo Geral costuma ser Receitas - Despesas. Investimentos são patrimônio.
    return { income: inc, expense: exp, investment: inv, total: inc - exp };
  }, [allTransactions, currentUserId]);

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      
      <View style={styles.totalHeader}>
        <Text style={[styles.title, { color: theme.textSecondary }]}>{t('home.widgets.overview.totalBalance')}</Text>
        <Text style={[styles.totalValue, { color: theme.textPrimary }]}>
          {formatCurrency(total)}
        </Text>
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
});