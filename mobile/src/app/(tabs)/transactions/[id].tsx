import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import CurrencyInput from 'react-native-currency-input';
import { useTransactionStore } from '../../../stores/transactionStore';
import { useTheme } from '../../../stores/useThemeStore';
import { showAlert } from '../../../stores/useAlertStore';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../../../stores/useUIStore';
import { formatCurrency, getCurrencySymbol } from '../../../utils/currency';

export default function EditTransactionScreen() {
  const { t, i18n } = useTranslation();
  const isPt = i18n.language.startsWith('pt');
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const currencyCode = useUIStore((state) => state.currencyCode);
  const currencyPrefix = `${getCurrencySymbol(currencyCode, i18n.language)} `;

  const transactions = useTransactionStore((state) => state.transactions);
  const updateTransaction = useTransactionStore((state) => state.updateTransaction);
  const deleteTransaction = useTransactionStore((state) => state.deleteTransaction);

  const currentTransaction = transactions.find((t) => t.id === id);

  const [amount, setAmount] = useState<number | null>(() => currentTransaction?.amount ?? null);
  const [description, setDescription] = useState(() => currentTransaction?.description ?? '');

  if (!currentTransaction) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: theme.textSecondary }}>{t('transactions.edit.notFound')}</Text>
      </View>
    );
  }

  const isExpense = currentTransaction.type === 'expense';
  const isIncome = currentTransaction.type === 'income';
  const themeColor = isExpense ? theme.expense : isIncome ? theme.income : theme.investment;

  const handleUpdate = () => {
    if (!amount || !description.trim()) return;

    if (updateTransaction) {
      updateTransaction(currentTransaction.id, {
        amount,
        description: description.trim(),
      });
    }
    router.back();
  };

  const handleDelete = () => {
    showAlert(
      t('transactions.edit.deleteModal.title'),
      t('transactions.edit.deleteModal.description'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('transactions.edit.deleteModal.confirm'),
          style: 'destructive',
          onPress: () => {
            deleteTransaction(currentTransaction.id);
            router.back();
          },
        },
      ],
      { icon: 'trash-outline' }
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('transactions.edit.title'), 
          headerTintColor: theme.textPrimary,
          headerTitleStyle: { fontWeight: '700' },
          headerStyle: { backgroundColor: theme.background },
          headerShadowVisible: false,
        }}
      />

      <CurrencyInput
        value={amount}
        onChangeValue={setAmount}
        prefix={currencyPrefix}
        delimiter={isPt ? '.' : ','}
        separator={isPt ? ',' : '.'}
        precision={2}
        minValue={0}
        placeholder={formatCurrency(0, currencyCode, i18n.language)}
        placeholderTextColor={theme.textMuted}
        style={[
          styles.input,
          {
            backgroundColor: theme.inputBg,
            borderColor: theme.inputBorder,
            color: theme.textPrimary,
          },
        ]}
        cursorColor={themeColor}
        selectionColor={themeColor}
      />

      <TextInput
        placeholder={t('transactions.edit.descriptionPlaceholder')}
        placeholderTextColor={theme.textMuted}
        value={description}
        onChangeText={setDescription}
        style={[
          styles.input,
          {
            backgroundColor: theme.inputBg,
            borderColor: theme.inputBorder,
            color: theme.textPrimary,
          },
        ]}
        cursorColor={themeColor}
        selectionColor={themeColor}
      />

      <TouchableOpacity
        style={[styles.primaryButton, { backgroundColor: theme.accent }]}
        activeOpacity={0.8}
        onPress={handleUpdate}
      >
        <Text style={styles.primaryButtonText}>{t('transactions.edit.buttons.update')}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.deleteButton, { borderColor: theme.expense }]}
        activeOpacity={0.8}
        onPress={handleDelete}
      >
        <Text style={[styles.deleteButtonText, { color: theme.expense }]}>{t('transactions.edit.buttons.delete')}</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  input: {
    borderWidth: 1,
    padding: 16,
    borderRadius: 14,
    fontSize: 16,
    marginBottom: 14,
  },
  primaryButton: {
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  deleteButton: {
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    marginTop: 12,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});