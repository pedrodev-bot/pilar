import { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/useAuthStore';
import { useTransactionStore } from '../../stores/transactionStore';
import { useUIStore } from '../../stores/useUIStore';
import { useCurrencyFormatter } from '../../hooks/useCurrencyFormatter';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../stores/useThemeStore';
import { matchesMonth, MonthKey, toMonthId } from '../../utils/monthFilter';

interface RecentTransactionsWidgetProps {
  selectedMonth: MonthKey;
}

export function RecentTransactionsWidget({ selectedMonth }: RecentTransactionsWidgetProps) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const isValuesHidden = useUIStore((state) => state.isValuesHidden);
  const formatCurrency = useCurrencyFormatter();

  const currentUserId = useAuthStore((state) => state.user?.id);
  const allTransactions = useTransactionStore((state) => state.transactions);

  const userTransactions = useMemo(() => {
    return allTransactions.filter(
      (tx) => tx.userId === currentUserId && matchesMonth(tx.date, selectedMonth)
    );
  }, [allTransactions, currentUserId, selectedMonth]);

  const recentTransactions = useMemo(() => {
    return [...userTransactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3);
  }, [userTransactions]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(i18n.language, { day: '2-digit', month: 'short' });
  };

  const handleSeeAll = () => {
    router.push({
      pathname: '/(tabs)/transactions',
      params: { month: toMonthId(selectedMonth) },
    } as any);
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.textSecondary }]}>{t('home.widgets.recentTransactions.title')}</Text>
        <TouchableOpacity onPress={handleSeeAll}>
          <Text style={[styles.linkText, { color: theme.investment }]}>{t('home.widgets.recentTransactions.seeAll')}</Text>
        </TouchableOpacity>
      </View>

      {recentTransactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>{t('home.widgets.recentTransactions.empty')}</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {recentTransactions.map((item, index) => {
            const isExpense = item.type === 'expense';
            const isLast = index === recentTransactions.length - 1;

            return (
              <View
                key={item.id || index}
                style={[styles.itemRow, !isLast && { borderBottomWidth: 1, borderBottomColor: theme.cardBorder }]}
              >
                <View style={styles.infoCol}>
                  <Text style={[styles.itemTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                    {item.description || t('home.widgets.recentTransactions.fallbackDescription')}
                  </Text>
                  <Text style={[styles.itemDate, { color: theme.textSecondary }]}>
                    {formatDate(item.date)} • {t(`transactionTypes.${item.type}`)}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.itemAmount,
                    { color: isValuesHidden || isExpense ? theme.textPrimary : theme.income },
                  ]}
                >
                  {!isValuesHidden && (isExpense ? '- ' : '+ ')}
                  {formatCurrency(Number(item.amount || 0))}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  linkText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
  },
  list: {
    flexDirection: 'column',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  infoCol: {
    flex: 1,
    marginRight: 12,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  itemDate: {
    fontSize: 12,
    marginTop: 2,
  },
  itemAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
});