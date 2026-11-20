import { useRef, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, FontAwesome5, Feather } from '@expo/vector-icons';
import { useTheme } from '../../../stores/useThemeStore';
import { useTransactionStore, Transaction } from '../../../stores/transactionStore';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useUIStore } from '../../../stores/useUIStore';
import { useCurrencyFormatter } from '../../../hooks/useCurrencyFormatter';
import { useTranslation } from 'react-i18next';
import {
  formatMonthLabel,
  fromMonthId,
  getAvailableMonthTimeline,
  matchesMonth,
} from '../../../utils/monthFilter';
import {
  TransactionFilterModal,
  TransactionFilterState,
} from '../../../components/transactions/TransactionFilterModal';

export default function TransactionsListScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { month: monthParam } = useLocalSearchParams<{ month?: string }>();
  const theme = useTheme();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const allTransactions = useTransactionStore((state) => state.transactions);

  const isValuesHidden = useUIStore((state) => state.isValuesHidden);
  const formatCurrency = useCurrencyFormatter();

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [lastSyncedParam, setLastSyncedParam] = useState<string | undefined>(undefined);
  const [filter, setFilter] = useState<TransactionFilterState>(() => {
    const parsed = monthParam ? fromMonthId(monthParam) : null;
    return parsed ? { kind: 'month', month: parsed } : { kind: 'all' };
  });

  if (monthParam !== lastSyncedParam) {
    setLastSyncedParam(monthParam);
    const parsed = monthParam ? fromMonthId(monthParam) : null;
    if (parsed) {
      setFilter({ kind: 'month', month: parsed });
    }
  }

  const userTransactions = useMemo(
    () => allTransactions.filter((tx) => tx.userId === currentUserId),
    [allTransactions, currentUserId]
  );

  const { activeMonths } = useMemo(
    () => getAvailableMonthTimeline(userTransactions.map((tx) => tx.date)),
    [userTransactions]
  );

  const transactions = useMemo(() => {
    if (filter.kind === 'all') return userTransactions;

    if (filter.kind === 'month') {
      return userTransactions.filter((tx) => matchesMonth(tx.date, filter.month));
    }

    if (filter.kind === 'today') {
      const now = new Date();
      return userTransactions.filter((tx) => {
        const d = new Date(tx.date);
        return (
          d.getFullYear() === now.getFullYear() &&
          d.getMonth() === now.getMonth() &&
          d.getDate() === now.getDate()
        );
      });
    }

    if (filter.kind === 'last_week') {
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      const start = new Date();
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      return userTransactions.filter((tx) => {
        const time = new Date(tx.date).getTime();
        return time >= start.getTime() && time <= end.getTime();
      });
    }

    const start = new Date(`${filter.start}T00:00:00`).getTime();
    const end = new Date(`${filter.end}T23:59:59.999`).getTime();
    return userTransactions.filter((tx) => {
      const time = new Date(tx.date).getTime();
      return time >= start && time <= end;
    });
  }, [userTransactions, filter]);

  const activeFilterLabel = useMemo(() => {
    if (filter.kind === 'all') return null;
    if (filter.kind === 'today') return t('transactions.filter.presets.today');
    if (filter.kind === 'last_week') return t('transactions.filter.presets.lastWeek');
    if (filter.kind === 'month') {
      return formatMonthLabel(filter.month, i18n.language, new Date().getFullYear());
    }
    const fmt = (iso: string) =>
      new Date(`${iso}T12:00:00`).toLocaleDateString(i18n.language, { day: '2-digit', month: '2-digit' });
    return `${fmt(filter.start)} – ${fmt(filter.end)}`;
  }, [filter, i18n.language, t]);

  const handleClearFilter = () => {
    setFilter({ kind: 'all' });
    if (monthParam) {
      router.setParams({ month: undefined });
    }
  };

  const isNavigating = useRef(false);

  const handlePress = (id: string) => {
    if (isNavigating.current) return;
    isNavigating.current = true;

    router.push({
      pathname: '/transactions/[id]',
      params: { id },
    });

    setTimeout(() => {
      isNavigating.current = false;
    }, 500);
  };

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const type = item.type || 'expense';

    let color = theme.expense;
    let iconElement = <Ionicons name="arrow-down" size={16} color={color} style={styles.icon} />;

    if (type === 'income') {
      color = theme.income;
      iconElement = <Ionicons name="arrow-up" size={16} color={color} style={styles.icon} />;
    } else if (type === 'investment') {
      color = theme.investment;
      iconElement = <FontAwesome5 name="coins" size={14} color={color} style={styles.icon} />;
    }

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => handlePress(item.id)}
        style={[
          styles.card,
          {
            backgroundColor: theme.card,
            borderColor: theme.cardBorder,
          },
        ]}
      >
        <View style={styles.cardInfo}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
            {item.description}
          </Text>
          <Text style={[styles.cardDate, { color: theme.textSecondary }]}>
            {new Date(item.date).toLocaleDateString(i18n.language)}
          </Text>
        </View>

        <View style={styles.amountContainer}>
          <Text style={[styles.cardAmount, { color: isValuesHidden ? theme.textPrimary : color }]}>
            {formatCurrency(item.amount)}
          </Text>
          {iconElement}
        </View>
      </TouchableOpacity>
    );
  };

  const isFiltered = filter.kind !== 'all';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <View style={styles.headerContainer}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
              {t('transactions.list.headerSubtitle')}
            </Text>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
              {t('transactions.list.title')}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setIsFilterModalOpen(true)}
            style={[
              styles.filterButton,
              {
                backgroundColor: isFiltered ? theme.accent : theme.card,
                borderColor: isFiltered ? theme.accent : theme.cardBorder,
              },
            ]}
          >
            <Feather
              name="sliders"
              size={18}
              color={isFiltered ? '#000000' : theme.textPrimary}
            />
          </TouchableOpacity>
        </View>

        {activeFilterLabel && (
          <View style={styles.activeChipRow}>
            <View
              style={[
                styles.activeChip,
                { backgroundColor: theme.card, borderColor: theme.cardBorder },
              ]}
            >
              <Text style={[styles.activeChipText, { color: theme.textPrimary }]}>
                {activeFilterLabel}
              </Text>
              <TouchableOpacity
                onPress={handleClearFilter}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                <Feather name="x" size={14} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={renderTransaction}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              {t('transactions.list.empty')}
            </Text>
          </View>
        }
      />

      <TransactionFilterModal
        visible={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        currentFilter={filter}
        onApplyFilter={(nextFilter) => {
          setFilter(nextFilter);
          if (monthParam && (nextFilter.kind !== 'month' || nextFilter.month !== fromMonthId(monthParam))) {
            router.setParams({ month: undefined });
          }
        }}
        availableMonths={activeMonths}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeChipRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  activeChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    gap: 8,
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardDate: {
    fontSize: 12,
    marginTop: 4,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  icon: {
    marginLeft: 4,
  },
  emptyContainer: {
    paddingTop: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
  },
});