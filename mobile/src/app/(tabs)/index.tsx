import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HomeHeader } from '../../components/home/HomeHeader';
import { MonthSelectorBar } from '../../components/home/MonthSelectorBar';
import { ExpenseSummaryWidget } from '../../components/widgets/ExpenseSummaryWidget';
import { PredictiveInsightWidget } from '../../components/widgets/PredictiveInsightWidget';
import { RecentTransactionsWidget } from '../../components/widgets/RecentTransactionsWidget';
import { OverviewWidget } from '../../components/widgets/OverviewWidget';
import { useWidgetStore } from '../../stores/useWidgetStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useTransactionStore } from '../../stores/transactionStore';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../stores/useThemeStore';
import { getCurrentMonthKey, isSameMonth, MonthKey } from '../../utils/monthFilter';

export default function HomeScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const widgets = useWidgetStore((state) => state.widgets);
  const user = useAuthStore((state) => state.user);
  const allTransactions = useTransactionStore((state) => state.transactions);
  const displayName = user?.user_metadata?.full_name || t('common.defaultUserName');

  const [selectedMonth, setSelectedMonth] = useState<MonthKey>(() => getCurrentMonthKey());
  const isCurrentMonth = isSameMonth(selectedMonth, getCurrentMonthKey());

  const userTransactionDates = useMemo(
    () => allTransactions.filter((tx) => tx.userId === user?.id).map((tx) => tx.date),
    [allTransactions, user?.id]
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <HomeHeader userName={displayName} />
      <MonthSelectorBar
        selectedMonth={selectedMonth}
        onSelectMonth={setSelectedMonth}
        transactionDates={userTransactionDates}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {widgets
          .filter((w) => w.visible)
          .map((widget) => {
            switch (widget.id) {
              case 'overview':
                return <OverviewWidget key={widget.id} selectedMonth={selectedMonth} />;
              case 'expense_summary':
                return (
                  <ExpenseSummaryWidget
                    key={widget.id}
                    variant={widget.variant}
                    selectedMonth={selectedMonth}
                  />
                );
              case 'predictive_insight':
                return isCurrentMonth ? <PredictiveInsightWidget key={widget.id} /> : null;
              case 'recent_transactions':
                return <RecentTransactionsWidget key={widget.id} selectedMonth={selectedMonth} />;
              default:
                return null;
            }
          })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
});