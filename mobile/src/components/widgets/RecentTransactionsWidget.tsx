import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/useAuthStore';
import { useTransactionStore } from '../../stores/transactionStore';
import { useUIStore } from '../../stores/useUIStore';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../../stores/useThemeStore';

export function RecentTransactionsWidget() {
  const theme = useThemeStore((state) => state.theme);
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const isValuesHidden = useUIStore((state) => state.isValuesHidden);
    const { currencySymbol } = useUIStore();

  const currentUserId = useAuthStore((state) => state.user?.id);
  const allTransactions = useTransactionStore((state) => state.transactions);

  const userTransactions = useMemo(() => {
    return allTransactions.filter((t) => t.userId === currentUserId);
  }, [allTransactions, currentUserId]);

  const recentTransactions = useMemo(() => {
    return [...userTransactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3);
  }, [userTransactions]);

  const formatCurrency = (val: number) => {
    if (isValuesHidden) {
      const parts = Intl.NumberFormat(i18n.language, { style: 'currency', currency: currencySymbol }).formatToParts(0);
      const currencyPart = parts.find(p => p.type === 'currency')?.value || 'R$';
      return `${currencyPart} ••••`;
    }
    return val.toLocaleString(i18n.language, { style: 'currency', currency: currencySymbol });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(i18n.language, { day: '2-digit', month: 'short' });
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('home.widgets.recentTransactions.title')}</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/transactions' as any)}>
          <Text style={styles.linkText}>{t('home.widgets.recentTransactions.seeAll')}</Text>
        </TouchableOpacity>
      </View>

      {recentTransactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('home.widgets.recentTransactions.empty')}</Text>
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
                  <Text style={styles.itemDate}>
                    {formatDate(item.date)} • {t(`transactionTypes.${item.type}`)}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.itemAmount,
                    isValuesHidden 
                      ? { color: theme.textPrimary } 
                      : (isExpense ? styles.expenseColor : styles.incomeColor),
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
    backgroundColor: '#1E1E24',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#2A2A32',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  linkText: {
    fontSize: 12,
    color: '#0A84FF',
    fontWeight: '600',
  },
  emptyContainer: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  emptyText: {
    color: '#636366',
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
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A32',
  },
  infoCol: {
    flex: 1,
    marginRight: 12,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  itemDate: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  itemAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  expenseColor: {
    color: '#FFFFFF',
  },
  incomeColor: {
    color: '#34C759',
  },
});