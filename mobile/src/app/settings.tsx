import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, TextInput, useWindowDimensions } from 'react-native';
import { Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Constants from 'expo-constants';

import { useAuthStore } from '../stores/useAuthStore';
import { useThemeStore, useTheme } from '../stores/useThemeStore';
import { useUIStore } from '../stores/useUIStore';
import { useTransactionStore, type Transaction } from '../stores/transactionStore';
import { deleteAccountRequest } from '../services/authService';
import { pickBackupFile } from '../services/importService';
import { enableDailyReminder, disableReminders } from '../services/notificationService';
import { authenticate, canAuthenticate } from '../services/appLockService';
import { parseBackup } from '../utils/importTransactions';
import { getErrorMessage } from '../utils/errors';
import { showAlert } from '../stores/useAlertStore';

import { ExportModal } from '../components/settings/ExportModal';
import { LanguageModal } from '../components/settings/LanguageModal';
import { CurrencyModal } from '../components/settings/CurrencyModal';

interface SettingItem {
  id: string;
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
  action?: () => void;
  rightElement?: React.ReactNode;
  isDanger?: boolean;
}

interface SettingSection {
  title: string;
  items: SettingItem[];
}

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const { width } = useWindowDimensions();
  
  const theme = useTheme();
  const { isDark, toggleTheme } = useThemeStore();
  const { clearAllTransactions, importTransactions } = useTransactionStore();
  const { user, logout } = useAuthStore();
  
  const { 
    isValuesHidden, toggleValuesVisibility, 
    currencyCode,
    isAppLockEnabled, setAppLock,
    isNotificationEnabled, setNotification
  } = useUIStore();

  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);

  const appVersion = Constants.expoConfig?.version || '1.0.0';

  const handleImport = useCallback(async () => {
    try {
      const file = await pickBackupFile();
      if (!file || !user) return;

      const { records } = parseBackup(file.content);
      if (records.length === 0) throw new Error(t('settings.sections.data.import.noValidRecords'));

      const imported: Transaction[] = records.map((r) => ({
        ...r,
        userId: user.id,
        synced: false,
      }));

      showAlert(
        t('settings.sections.data.import.title'),
        t('settings.sections.data.import.confirmMessage', { total: imported.length }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('settings.sections.data.import.merge'),
            onPress: () => {
              importTransactions(imported, false);
              showAlert(t('common.success'), t('settings.sections.data.import.mergedSuccess'), undefined, { variant: 'success' });
            },
          },
          {
            text: t('settings.sections.data.import.replace'),
            style: 'destructive',
            onPress: () => {
              importTransactions(imported, true);
              showAlert(t('common.success'), t('settings.sections.data.import.replacedSuccess'), undefined, { variant: 'success' });
            },
          },
        ],
        { variant: 'warning', icon: 'cloud-upload-outline' }
      );
    } catch (error) {
      showAlert(t('common.error'), getErrorMessage(error, t('settings.sections.data.import.failed')), undefined, { variant: 'error' });
    }
  }, [user, t, importTransactions]);

  const handleClearData = useCallback(() => {
    if (!user?.id) return;
    showAlert(
      t('settings.sections.data.clear.confirmTitle'),
      t('settings.sections.data.clear.confirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.sections.data.clear.confirmText'),
          style: 'destructive',
          onPress: () => clearAllTransactions(user.id),
        },
      ],
      { icon: 'trash-outline' }
    );
  }, [user?.id, t, clearAllTransactions]);

  const handleToggleAppLock = useCallback(async (value: boolean) => {
    if (!(await canAuthenticate())) {
      if (value) {
        showAlert(t('common.attention'), t('settings.sections.security.appLock.noBiometrics'), undefined, { variant: 'warning' });
      } else {
        setAppLock(false);
      }
      return;
    }

    const promptKey = value
      ? 'settings.sections.security.appLock.prompt'
      : 'settings.sections.security.appLock.promptDisable';
    if (await authenticate(promptKey)) setAppLock(value);
  }, [t, setAppLock]);

  const handleToggleNotification = useCallback(async (value: boolean) => {
    if (!value) {
      await disableReminders();
      setNotification(false);
      return;
    }

    const result = await enableDailyReminder();
    if (result === 'enabled') {
      setNotification(true);
    } else {
      const message = result === 'denied'
        ? t('settings.sections.notifications.permissionDenied')
        : t('settings.sections.notifications.unavailable');
      showAlert(t('common.attention'), message, undefined, { variant: 'warning' });
    }
  }, [t, setNotification]);

  const handleLogout = useCallback(() => {
    showAlert(
      t('settings.sections.account.logout.title'),
      t('settings.sections.account.logout.confirmation'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('settings.sections.account.logout.confirmText'), style: 'destructive', onPress: logout },
      ],
      { icon: 'log-out-outline' }
    );
  }, [t, logout]);

  const handleDeleteAccount = useCallback(() => {
    showAlert(
      t('settings.sections.account.delete.confirmTitle'),
      t('settings.sections.account.delete.confirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.sections.account.delete.confirmText'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccountRequest();
              if (user?.id) clearAllTransactions(user.id);
              await logout();
              showAlert(
                t('settings.sections.account.delete.successTitle'),
                t('settings.sections.account.delete.successMessage'),
                undefined,
                { variant: 'success' }
              );
            } catch (error) {
              showAlert(t('common.error'), getErrorMessage(error, t('auth.errors.deleteFailed')), undefined, { variant: 'error' });
            }
          },
        },
      ],
      { icon: 'person-remove-outline' }
    );
  }, [t, user?.id, clearAllTransactions, logout]);

  const settingsSections: SettingSection[] = useMemo(() => [
    {
      title: t('settings.sections.account.title'),
      items: [
        { 
          id: 'profile', 
          icon: 'user', 
          title: user?.user_metadata?.full_name || t('common.defaultUserName'), 
          subtitle: user?.email || '' 
        },
        { 
          id: 'logout', 
          icon: 'log-out', 
          title: t('settings.sections.account.logout.title'), 
          isDanger: true, 
          action: handleLogout 
        },
        { 
          id: 'delete_account', 
          icon: 'user-x', 
          title: t('settings.sections.account.delete.title'),
          subtitle: t('settings.sections.account.delete.subtitle'),
          isDanger: true, 
          action: handleDeleteAccount 
        },
      ]
    },
    {
      title: t('settings.sections.data.title'),
      items: [
        { id: 'export', icon: 'download', title: t('settings.sections.data.export.title'), subtitle: t('settings.sections.data.export.subtitle'), action: () => setShowExportModal(true) },
        { id: 'import', icon: 'upload', title: t('settings.sections.data.import.title'), subtitle: t('settings.sections.data.import.subtitle'), action: handleImport },
        { id: 'clear', icon: 'trash-2', title: t('settings.sections.data.clear.title'), subtitle: t('settings.sections.data.clear.subtitle'), isDanger: true, action: handleClearData },
      ]
    },
    {
      title: t('settings.sections.preferences.title'),
      items: [
        { id: 'theme', icon: isDark ? 'moon' : 'sun', title: t('settings.sections.preferences.theme.title'), rightElement: <Switch value={isDark} onValueChange={toggleTheme} trackColor={{ true: theme.accent }} /> },
        { id: 'lang', icon: 'globe', title: t('settings.sections.preferences.language.title'), subtitle: i18n.language.startsWith('pt') ? 'Português' : 'English', action: () => setShowLanguageModal(true) },
        { id: 'currency', icon: 'dollar-sign', title: t('settings.sections.preferences.currency.title'), subtitle: currencyCode, action: () => setShowCurrencyModal(true) },
        { id: 'hide_values', icon: isValuesHidden ? 'eye-off' : 'eye', title: t('settings.sections.preferences.hideValues.title'), subtitle: t('settings.sections.preferences.hideValues.subtitle'), rightElement: <Switch value={isValuesHidden} onValueChange={toggleValuesVisibility} trackColor={{ true: theme.accent }} /> },
      ]
    },
    {
      title: t('settings.sections.security.title'),
      items: [
        { id: 'lock', icon: 'lock', title: t('settings.sections.security.appLock.title'), subtitle: t('settings.sections.security.appLock.subtitle'), rightElement: <Switch value={isAppLockEnabled} onValueChange={handleToggleAppLock} trackColor={{ true: theme.accent }} /> },
      ]
    },
    {
      title: t('settings.sections.notifications.title'),
      items: [
        { id: 'notif', icon: 'bell', title: t('settings.sections.notifications.reminder.title'), subtitle: t('settings.sections.notifications.reminder.subtitle'), rightElement: <Switch value={isNotificationEnabled} onValueChange={handleToggleNotification} trackColor={{ true: theme.accent }} /> },
      ]
    },
    {
      title: t('settings.sections.about.title'),
      items: [
        { id: 'version', icon: 'info', title: t('settings.sections.about.version.title'), rightElement: <Text style={{ color: theme.textSecondary, fontWeight: '600' }}>v{appVersion}</Text> },
      ]
    }
  ], [
    isDark,
    isValuesHidden,
    isAppLockEnabled,
    isNotificationEnabled,
    currencyCode,
    theme,
    i18n.language,
    t,
    appVersion,
    user?.user_metadata?.full_name,
    user?.email,
    handleLogout,
    handleDeleteAccount,
    handleImport,
    handleClearData,
    toggleTheme,
    toggleValuesVisibility,
    handleToggleAppLock,
    handleToggleNotification,
  ]);

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return settingsSections;
    
    const lowerQuery = searchQuery.toLowerCase();
    return settingsSections.map(section => {
      const filteredItems = section.items.filter(item => 
        item.title.toLowerCase().includes(lowerQuery) || 
        (item.subtitle && item.subtitle.toLowerCase().includes(lowerQuery))
      );
      return { ...section, items: filteredItems };
    }).filter(section => section.items.length > 0);
  }, [searchQuery, settingsSections]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: isSearchActive ? '' : t('options.settings.title'), 
          headerTintColor: theme.textPrimary,
          headerTitleStyle: { fontWeight: '700' },
          headerStyle: { backgroundColor: theme.background },
          headerShadowVisible: false,
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {isSearchActive && (
                <View style={[
                  styles.headerSearchInputWrapper, 
                  { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, width: width - 110 }
                ]}>
                  <TextInput
                    style={[styles.searchInput, { color: theme.textPrimary }]}
                    placeholder={t('settings.search.placeholder')}
                    placeholderTextColor={theme.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoFocus
                  />
                </View>
              )}
              <TouchableOpacity 
                onPress={() => {
                  setIsSearchActive(!isSearchActive);
                  if (isSearchActive) setSearchQuery('');
                }} 
                style={styles.headerButton}
              >
                <Feather name={isSearchActive ? 'x' : 'search'} size={22} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>
          )
        }}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {filteredSections.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={{ color: theme.textSecondary }}>{t('settings.search.empty')}</Text>
          </View>
        ) : (
          filteredSections.map((section, sIndex) => (
            <View key={`section-${sIndex}`}>
              <Text 
                style={[styles.sectionHeader, { color: theme.textSecondary, marginTop: sIndex === 0 ? 0 : 24 }]}
              >
                {section.title}
              </Text>
              <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                {section.items.map((item, iIndex) => {
                  const isLast = iIndex === section.items.length - 1;
                  const textColor = item.isDanger ? theme.expense : theme.textPrimary;
                  const iconBgColor = item.isDanger ? theme.expenseSoft : theme.background;
                  
                  return (
                    <TouchableOpacity 
                      key={item.id}
                      style={[styles.row, !isLast && { borderBottomWidth: 1, borderBottomColor: theme.cardBorder }]}
                      activeOpacity={item.action ? 0.7 : 1}
                      onPress={item.action}
                      disabled={!item.action}
                    >
                      <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
                        <Feather name={item.icon} size={20} color={textColor} />
                      </View>
                      
                      <View style={styles.textContainer}>
                        <Text style={[styles.rowTitle, { color: textColor }]}>{item.title}</Text>
                        {item.subtitle && <Text style={[styles.rowSubtitle, { color: theme.textSecondary }]}>{item.subtitle}</Text>}
                      </View>

                      {item.rightElement ? item.rightElement : (
                        item.action && <Feather name="chevron-right" size={20} color={theme.textSecondary} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      <ExportModal visible={showExportModal} onClose={() => setShowExportModal(false)} />
      <LanguageModal visible={showLanguageModal} onClose={() => setShowLanguageModal(false)} />
      <CurrencyModal visible={showCurrencyModal} onClose={() => setShowCurrencyModal(false)} />
      
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerButton: { padding: 8, paddingRight: 0 },
  headerSearchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 36,
    marginRight: 8,
  },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  content: { padding: 20 },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 4,
  },
  card: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  textContainer: { flex: 1, marginRight: 8 },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  rowSubtitle: { fontSize: 13, marginTop: 2 },
  emptyContainer: { alignItems: 'center', marginTop: 40 },
});