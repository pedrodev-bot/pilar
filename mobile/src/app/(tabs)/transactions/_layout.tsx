import { Stack } from 'expo-router';
import { useTheme } from '../../../stores/useThemeStore';
import { useTranslation } from 'react-i18next';


export default function TransactionsLayout() {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerStyle: {
          backgroundColor: theme.card,
        },
        headerTintColor: theme.textPrimary,
        headerTitleStyle: {
          fontWeight: '700',
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: t('transactions.list.title'),
        }}
      />
    </Stack>
  );
}