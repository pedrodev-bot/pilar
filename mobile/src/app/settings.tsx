import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, TextInput, useWindowDimensions, Alert } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/useAuthStore';
import { deleteAccountRequest } from '../services/authService';
import { parseBackup } from '../utils/importTransactions';

import * as LocalAuthentication from 'expo-local-authentication';
let Notifications: typeof import('expo-notifications') | null = null;
try {
  Notifications = require('expo-notifications');
  Notifications?.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch {
  
}
import Constants from 'expo-constants';

import { useThemeStore } from '../stores/useThemeStore';
import { useUIStore } from '../stores/useUIStore';
import { useTransactionStore } from '../stores/transactionStore';

import { ExportModal } from '../components/settings/ExportModal';
import { pickBackupFile } from '../services/importService';
import { Transaction } from '../stores/transactionStore';

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
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { width } = useWindowDimensions();
  
  const { theme, isDark, toggleTheme } = useThemeStore();
  const { exportData, clearAllTransactions, importTransactions } = useTransactionStore();
  const { user, logout } = useAuthStore();
  
  const { 
    isValuesHidden, toggleValuesVisibility, 
    currencySymbol, setCurrencySymbol,
    isAppLockEnabled, setAppLock,
    isNotificationEnabled, setNotification
  } = useUIStore();

  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showClearDataModal, setShowClearDataModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showChangelogModal, setShowChangelogModal] = useState(false);

  const appVersion = Constants.expoConfig?.version || '1.0.0';

  const confirmClearData = () => {
    clearAllTransactions();
    setShowClearDataModal(false);
  };

  const handleImport = async () => {
    try {
      const file = await pickBackupFile();
      if (!file || !user) return;

      const { records } = parseBackup(file.content);
      if (records.length === 0) throw new Error('Nenhuma transação válida encontrada no arquivo.');

      const imported: Transaction[] = records.map((r) => ({
        ...r,
        userId: user.id,
        synced: false,
      }));

      Alert.alert(
        t('settings.sections.data.import.title', 'Restaurar Dados'),
        `Encontramos ${imported.length} transações no arquivo. Deseja mesclar com seus dados atuais ou substituir tudo?`,
        [
          { text: t('common.cancel', 'Cancelar'), style: 'cancel' },
          {
            text: 'Mesclar',
            onPress: () => {
              importTransactions(imported, false);
              Alert.alert('Sucesso', 'Transações mescladas com sucesso!');
            },
          },
          {
            text: 'Substituir Tudo',
            style: 'destructive',
            onPress: () => {
              importTransactions(imported, true);
              Alert.alert('Sucesso', 'Seus dados foram substituídos pelo backup.');
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(t('common.error', 'Erro na Importação'), error.message || 'Falha ao processar o arquivo.');
    }
  };

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    setShowLanguageModal(false);
  };

  const handleToggleAppLock = async (value: boolean) => {
    if (value) {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        Alert.alert(t('common.attention'), 'Biometria ou PIN não estão configurados neste dispositivo.');
        return;
      }

      const auth = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Autentique para habilitar a segurança',
        fallbackLabel: 'Usar PIN',
      });

      if (auth.success) {
        setAppLock(true);
      }
    } else {
      setAppLock(false);
    }
  };

  const handleToggleNotification = async (value: boolean) => {
    if (!Notifications) {
      Alert.alert(t('common.attention'), 'Notificações indisponíveis neste ambiente.');
      return;
    }

    if (value) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('common.attention'), 'Permissão de notificação negada nas configurações do sistema.');
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Core Finance 📊',
          body: 'Já registrou suas movimentações de hoje?',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: 20,
          minute: 0,
        },
      });
      setNotification(true);
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync();
      setNotification(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      t('settings.sections.account.logout.title', 'Sair da Conta'),
      t('settings.sections.account.logout.confirmation', 'Tem certeza que deseja desconectar?'),
      [
        { text: t('common.cancel', 'Cancelar'), style: 'cancel' },
        {
          text: t('settings.sections.account.logout.confirmText', 'Sair'),
          style: 'destructive',
          onPress: async () => {
            await logout();
          }
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Excluir Conta Definitivamente",
      "Esta ação é irreversível. Todos os seus dados, transações e acesso serão apagados para sempre. Deseja continuar?",
      [
        { text: t('common.cancel', 'Cancelar'), style: 'cancel' },
        {
          text: "Sim, Excluir",
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccountRequest();
              clearAllTransactions();
              await logout();
              Alert.alert("Conta Excluída", "Os seus dados foram removidos com sucesso.");
            } catch (error: any) {
              Alert.alert(t('common.error', 'Erro'), error.message);
            }
          }
        }
      ]
    );
  };

  const settingsSections: SettingSection[] = useMemo(() => [
    {
      title: t('settings.sections.account.title', 'Minha Conta'),
      items: [
        { 
          id: 'profile', 
          icon: 'user', 
          title: user?.user_metadata?.full_name || t('common.defaultUserName', 'Usuário'), 
          subtitle: user?.email || '' 
        },
        { 
          id: 'logout', 
          icon: 'log-out', 
          title: t('settings.sections.account.logout.title', 'Sair da Conta'), 
          isDanger: true, 
          action: handleLogout 
        },
        { 
          id: 'delete_account', 
          icon: 'user-x', 
          title: 'Excluir Conta', 
          subtitle: 'Apagar todos os dados permanentemente',
          isDanger: true, 
          action: handleDeleteAccount 
        },
      ]
    },
    {
      title: t('settings.sections.data.title', 'Gestão de Dados (Offline-First)'),
      items: [
        { id: 'export', icon: 'download', title: t('settings.sections.data.export.title', 'Cópia de Segurança / Exportar'), subtitle: t('settings.sections.data.export.subtitle', 'Gerar um ficheiro JSON ou CSV'), action: () => setShowExportModal(true) },
        { id: 'import', icon: 'upload', title: t('settings.sections.data.import.title', 'Restaurar / Importar Dados'), subtitle: t('settings.sections.data.import.subtitle', 'Carregar uma cópia anterior'), action: handleImport },
        { id: 'clear', icon: 'trash-2', title: t('settings.sections.data.clear.title', 'Limpar Dados'), subtitle: t('settings.sections.data.clear.subtitle', 'Apagar base de dados (Danger Zone)'), isDanger: true, action: () => setShowClearDataModal(true) },
      ]
    },
    {
      title: t('settings.sections.preferences.title', 'Preferências da Aplicação'),
      items: [
        { id: 'theme', icon: isDark ? 'moon' : 'sun', title: t('settings.sections.preferences.theme.title', 'Tema Escuro'), rightElement: <Switch value={isDark} onValueChange={toggleTheme} trackColor={{ true: theme.accent }} /> },
        { id: 'lang', icon: 'globe', title: t('settings.sections.preferences.language.title', 'Idioma'), subtitle: i18n.language.startsWith('pt') ? 'Português' : 'English', action: () => setShowLanguageModal(true) },
        { id: 'currency', icon: 'dollar-sign', title: t('settings.sections.preferences.currency.title', 'Moeda Padrão'), subtitle: currencySymbol, action: () => setShowCurrencyModal(true) },
        { id: 'hide_values', icon: isValuesHidden ? 'eye-off' : 'eye', title: t('settings.sections.preferences.hideValues.title', 'Ocultar Valores'), subtitle: t('settings.sections.preferences.hideValues.subtitle', 'Esconder saldo na tela inicial'), rightElement: <Switch value={isValuesHidden} onValueChange={toggleValuesVisibility} trackColor={{ true: theme.accent }} /> },
      ]
    },
    {
      title: t('settings.sections.security.title', 'Segurança'),
      items: [
        { id: 'lock', icon: 'lock', title: t('settings.sections.security.appLock.title', 'Bloqueio da Aplicação'), subtitle: t('settings.sections.security.appLock.subtitle', 'Exigir PIN ou Biometria ao abrir'), rightElement: <Switch value={isAppLockEnabled} onValueChange={handleToggleAppLock} trackColor={{ true: theme.accent }} /> },
      ]
    },
    {
      title: t('settings.sections.notifications.title', 'Notificações Locais'),
      items: [
        { id: 'notif', icon: 'bell', title: t('settings.sections.notifications.reminder.title', 'Lembrete de Registo'), subtitle: t('settings.sections.notifications.reminder.subtitle', 'Notificação diária (20:00)'), rightElement: <Switch value={isNotificationEnabled} onValueChange={handleToggleNotification} trackColor={{ true: theme.accent }} /> },
      ]
    },
    {
      title: t('settings.sections.about.title', 'Sobre'),
      items: [
        { id: 'version', icon: 'info', title: t('settings.sections.about.version.title', 'Versão da Aplicação'), rightElement: <Text style={{ color: theme.textSecondary, fontWeight: '600' }}>v{appVersion}</Text> },
        { id: 'changelog', icon: 'file-text', title: t('settings.sections.about.changelog.title', 'Histórico de Versões'), subtitle: t('settings.sections.about.changelog.subtitle', 'Veja o que mudou'), action: () => setShowChangelogModal(true) },
      ]
    }
  ], [isDark, isValuesHidden, isAppLockEnabled, isNotificationEnabled, currencySymbol, theme, i18n.language, t]);

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
          title: isSearchActive ? '' : t('options.settings.title', 'Configurações'), 
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
                    placeholder={t('settings.search.placeholder', 'Buscar configuração...')}
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
            <Text style={{ color: theme.textSecondary }}>{t('settings.search.empty', 'Nenhuma configuração encontrada.')}</Text>
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
                  const iconBgColor = item.isDanger ? 'rgba(239, 68, 68, 0.15)' : theme.background;
                  
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
  
  modalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { width: '100%', maxWidth: 320, borderRadius: 20, borderWidth: 1, padding: 22, alignItems: 'center' },
  iconCircle: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  modalDescription: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 20 },
  modalButtonsRow: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelButton: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  cancelButtonText: { fontSize: 14, fontWeight: '600' },
  confirmDeleteButton: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  confirmDeleteText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  bottomSheetBackdrop: { flex: 1, justifyContent: 'flex-end' },
  bottomSheetCard: { width: '100%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  bottomSheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 24 },
  bottomSheetOption: { flexDirection: 'row', alignItems: 'center', width: '100%', paddingVertical: 16, borderBottomWidth: 1 },
  bottomSheetOptionText: { fontSize: 16, fontWeight: '600' },
  bottomSheetOptionSubtext: { fontSize: 13, marginTop: 2 },
});