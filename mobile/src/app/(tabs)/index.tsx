import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HomeHeader } from '../../components/home/HomeHeader';
import { MonthSelectorBar } from '../../components/home/MonthSelectorBar';
import { WhatsNewModal } from '../../components/WhatsNewModal';
import { ExpenseSummaryWidget } from '../../components/widgets/ExpenseSummaryWidget';
import { PredictiveInsightWidget } from '../../components/widgets/PredictiveInsightWidget';
import { RecentTransactionsWidget } from '../../components/widgets/RecentTransactionsWidget';
import { OverviewWidget } from '../../components/widgets/OverviewWidget';
import { LATEST_RELEASE_VERSION } from '../../constants/changelog';
import { useWidgetStore } from '../../stores/useWidgetStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useTransactionStore } from '../../stores/transactionStore';
import { useUIStore } from '../../stores/useUIStore';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../stores/useThemeStore';
import { getCurrentMonthKey, isSameMonth, MonthKey } from '../../utils/monthFilter';

export default function HomeScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const widgets = useWidgetStore((state) => state.widgets);
  const user = useAuthStore((state) => state.user);
  const allTransactions = useTransactionStore((state) => state.transactions);
  const lastSeenVersion = useUIStore((state) => state.lastSeenVersion);
  const markVersionSeen = useUIStore((state) => state.markVersionSeen);
  const displayName = user?.user_metadata?.full_name || t('common.defaultUserName');

  const [uiHydrated, setUiHydrated] = useState(() => useUIStore.persist.hasHydrated());
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<MonthKey>(() => getCurrentMonthKey());

  useEffect(() => {
    if (useUIStore.persist.hasHydrated()) return;
    return useUIStore.persist.onFinishHydration(() => setUiHydrated(true));
  }, []);

  const showWhatsNew =
    uiHydrated &&
    lastSeenVersion !== LATEST_RELEASE_VERSION &&
    dismissedVersion !== LATEST_RELEASE_VERSION;

  const handleCloseWhatsNew = () => {
    setDismissedVersion(LATEST_RELEASE_VERSION);
    markVersionSeen(LATEST_RELEASE_VERSION);
  };
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

      <WhatsNewModal
        visible={showWhatsNew}
        mode="announcement"
        onClose={handleCloseWhatsNew}
      />
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