import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, TextInput, Modal, TouchableWithoutFeedback, useWindowDimensions } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../stores/useThemeStore';
import { useUIStore } from '../stores/useUIStore';
import { useTransactionStore } from '../stores/transactionStore';
import { useAuthStore } from '../stores/useAuthStore';
import { pickBackupFile } from '../services/importService';
import { parseBackup } from '../utils/importTransactions';

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

type ImportFeedback =
  | { kind: 'success'; imported: number; duplicates: number; invalid: number; skippedDeleted: number }
  | { kind: 'error'; message: string };

export default function SettingsScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { width } = useWindowDimensions();
  
  const { theme, isDark, toggleTheme } = useThemeStore();
  const { isValuesHidden, toggleValuesVisibility } = useUIStore();
  const { exportDataToJSON, clearAllTransactions, importTransactions } = useTransactionStore();
  const currentUserId = useAuthStore((state) => state.user?.id);

  const [isAppLockEnabled, setIsAppLockEnabled] = useState(false);
  const [isNotificationEnabled, setIsNotificationEnabled] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showClearDataModal, setShowClearDataModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const [isImporting, setIsImporting] = useState(false);
  const [importFeedback, setImportFeedback] = useState<ImportFeedback | null>(null);

  const handleImport = useCallback(async () => {
    if (isImporting) return;
    if (!currentUserId) {
      setImportFeedback({ kind: 'error', message: 'Faça login para importar dados.' });
      return;
    }
    try {
      setIsImporting(true);
      const file = await pickBackupFile();
      if (!file) return;

      const report = parseBackup(file.content);
      const { imported, duplicates } = importTransactions(report.records, currentUserId);

      setImportFeedback({
        kind: 'success',
        imported,
        duplicates,
        invalid: report.invalid.length,
        skippedDeleted: report.skippedDeleted,
      });
    } catch (e) {
      setImportFeedback({
        kind: 'error',
        message: e instanceof Error ? e.message : 'Não foi possível ler o arquivo.',
      });
    } finally {
      setIsImporting(false);
    }
  }, [isImporting, currentUserId, importTransactions]);

  const importMessage = !importFeedback
    ? ''
    : importFeedback.kind === 'error'
      ? importFeedback.message
      : [
          `${importFeedback.imported} transações importadas`,
          importFeedback.duplicates > 0 ? `${importFeedback.duplicates} já existiam (ignoradas)` : null,
          importFeedback.skippedDeleted > 0 ? `${importFeedback.skippedDeleted} apagadas no backup (ignoradas)` : null,
          importFeedback.invalid > 0 ? `${importFeedback.invalid} inválidas (ignoradas)` : null,
        ].filter(Boolean).join('\n');

  const confirmClearData = () => {
    clearAllTransactions();
    setShowClearDataModal(false);
  };

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    setShowLanguageModal(false);
  };

  const settingsSections: SettingSection[] = useMemo(() => [
    {
      title: t('settings.sections.data.title', 'Gestão de Dados (Offline-First)'),
      items: [
        { id: 'export', icon: 'download', title: t('settings.sections.data.export.title', 'Cópia de Segurança / Exportar'), subtitle: t('settings.sections.data.export.subtitle', 'Gerar um ficheiro JSON ou CSV'), action: () => setShowExportModal(true) },
        { id: 'import', icon: 'upload', title: t('settings.sections.data.import.title', 'Restaurar / Importar Dados'), subtitle: isImporting ? t('settings.importing', 'Importando...') : t('settings.sections.data.import.subtitle', 'Carregar uma cópia anterior'), action: handleImport },
        { id: 'clear', icon: 'trash-2', title: t('settings.sections.data.clear.title', 'Limpar Dados'), subtitle: t('settings.sections.data.clear.subtitle', 'Apagar base de dados (Danger Zone)'), isDanger: true, action: () => setShowClearDataModal(true) },
      ]
    },
    {
      title: t('settings.sections.preferences.title', 'Preferências da Aplicação'),
      items: [
        { id: 'theme', icon: isDark ? 'moon' : 'sun', title: t('settings.sections.preferences.theme.title', 'Tema Escuro'), rightElement: <Switch value={isDark} onValueChange={toggleTheme} trackColor={{ true: theme.accent }} /> },
        { id: 'lang', icon: 'globe', title: t('settings.sections.preferences.language.title', 'Idioma'), subtitle: i18n.language.startsWith('pt') ? 'Português' : 'English', action: () => setShowLanguageModal(true) },
        { id: 'currency', icon: 'dollar-sign', title: t('settings.sections.preferences.currency.title', 'Moeda Padrão'), subtitle: t('settings.sections.preferences.currency.subtitle', 'Selecionar símbolo monetário'), action: () => console.log('Moeda') },
        { id: 'hide_values', icon: isValuesHidden ? 'eye-off' : 'eye', title: t('settings.sections.preferences.hideValues.title', 'Ocultar Valores'), subtitle: t('settings.sections.preferences.hideValues.subtitle', 'Esconder saldo na tela inicial'), rightElement: <Switch value={isValuesHidden} onValueChange={toggleValuesVisibility} trackColor={{ true: theme.accent }} /> },
      ]
    },
    {
      title: t('settings.sections.security.title', 'Segurança'),
      items: [
        { id: 'lock', icon: 'lock', title: t('settings.sections.security.appLock.title', 'Bloqueio da Aplicação'), subtitle: t('settings.sections.security.appLock.subtitle', 'Exigir PIN ou Biometria'), rightElement: <Switch value={isAppLockEnabled} onValueChange={setIsAppLockEnabled} trackColor={{ true: theme.accent }} /> },
      ]
    },
    {
      title: t('settings.sections.notifications.title', 'Notificações Locais'),
      items: [
        { id: 'notif', icon: 'bell', title: t('settings.sections.notifications.reminder.title', 'Lembrete de Registo'), subtitle: t('settings.sections.notifications.reminder.subtitle', 'Notificação diária (ex: 20h)'), rightElement: <Switch value={isNotificationEnabled} onValueChange={setIsNotificationEnabled} trackColor={{ true: theme.accent }} /> },
      ]
    },
    {
      title: t('settings.sections.about.title', 'Sobre'),
      items: [
        { id: 'version', icon: 'info', title: t('settings.sections.about.version.title', 'Versão da Aplicação'), rightElement: <Text style={{ color: theme.textSecondary, fontWeight: '600' }}>v1.0.0</Text> },
        { id: 'changelog', icon: 'file-text', title: t('settings.sections.about.changelog.title', 'Histórico de Versões'), subtitle: t('settings.sections.about.changelog.subtitle', 'Veja o que mudou'), action: () => console.log('Changelog') },
      ]
    }
  ], [isDark, isValuesHidden, isAppLockEnabled, isNotificationEnabled, theme, i18n.language, t, handleImport, isImporting]);

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
                  { 
                    backgroundColor: theme.inputBg, 
                    borderColor: theme.inputBorder,
                    width: width - 110
                  }
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
                style={[
                  styles.sectionHeader, 
                  { 
                    color: theme.textSecondary,
                    marginTop: sIndex === 0 ? 0 : 24
                  }
                ]}
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

      <Modal
        visible={showClearDataModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowClearDataModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowClearDataModal(false)}>
          <View style={[styles.modalBackdrop, { backgroundColor: theme.modalOverlay }]}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.modalCard,
                  { backgroundColor: theme.card, borderColor: theme.cardBorder },
                ]}
              >
                <View style={[styles.iconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                  <Feather name="alert-triangle" size={24} color={theme.expense} />
                </View>

                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                  {t('settings.sections.data.clear.title', 'Limpar Dados')}
                </Text>

                <Text style={[styles.modalDescription, { color: theme.textSecondary }]}>
                  {t('settings.clearDataModal.description', 'Tem certeza que deseja apagar TODOS os seus dados? Esta ação não pode ser desfeita.')}
                </Text>

                <View style={styles.modalButtonsRow}>
                  <TouchableOpacity
                    style={[styles.cancelButton, { borderColor: theme.cardBorder }]}
                    onPress={() => setShowClearDataModal(false)}
                  >
                    <Text style={[styles.cancelButtonText, { color: theme.textPrimary }]}>
                      {t('common.cancel', 'Cancelar')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.confirmDeleteButton, { backgroundColor: theme.expense }]}
                    onPress={confirmClearData}
                  >
                    <Text style={styles.confirmDeleteText}>
                      {t('settings.clearDataModal.confirm', 'Sim, apagar tudo')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal
        visible={importFeedback !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setImportFeedback(null)}
      >
        <TouchableWithoutFeedback onPress={() => setImportFeedback(null)}>
          <View style={[styles.modalBackdrop, { backgroundColor: theme.modalOverlay }]}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <View style={[styles.iconCircle, { backgroundColor: importFeedback?.kind === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(163, 230, 53, 0.15)' }]}>
                  <Feather
                    name={importFeedback?.kind === 'error' ? 'alert-circle' : 'check-circle'}
                    size={24}
                    color={importFeedback?.kind === 'error' ? theme.expense : theme.accent}
                  />
                </View>

                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                  {importFeedback?.kind === 'error'
                    ? t('settings.importModal.errorTitle', 'Falha na importação')
                    : t('settings.importModal.successTitle', 'Importação concluída')}
                </Text>

                <Text style={[styles.modalDescription, { color: theme.textSecondary }]}>
                  {importMessage}
                </Text>

                <View style={styles.modalButtonsRow}>
                  <TouchableOpacity
                    style={[styles.confirmDeleteButton, { backgroundColor: theme.accent }]}
                    onPress={() => setImportFeedback(null)}
                  >
                    <Text style={[styles.confirmDeleteText, { color: '#1a2e05' }]}>OK</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal
        visible={showExportModal}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setShowExportModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowExportModal(false)}>
          <View style={[styles.bottomSheetBackdrop, { backgroundColor: theme.modalOverlay }]}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.bottomSheetCard,
                  { backgroundColor: theme.card },
                ]}
              >
                <View style={styles.bottomSheetHeader}>
                    <Text style={[styles.modalTitle, { color: theme.textPrimary, marginBottom: 0 }]}>
                        {t('settings.sections.data.export.title', 'Exportar Backup')}
                    </Text>
                    <TouchableOpacity onPress={() => setShowExportModal(false)}>
                        <Feather name="x-circle" size={24} color={theme.textSecondary} />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity 
                    style={[styles.bottomSheetOption, { borderBottomColor: theme.cardBorder }]}
                    onPress={() => {
                        setShowExportModal(false);
                        exportDataToJSON('csv');
                    }}
                >
                    <View style={[styles.iconContainer, { backgroundColor: 'rgba(10, 132, 255, 0.15)', marginRight: 16 }]}>
                        <Feather name="file-text" size={20} color="#0A84FF" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.bottomSheetOptionText, { color: theme.textPrimary }]}>CSV</Text>
                        <Text style={[styles.bottomSheetOptionSubtext, { color: theme.textSecondary }]}>
                            {t('settings.exportModal.csvSub', 'Planilhas (Excel, Google Sheets)')}
                        </Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.bottomSheetOption, { borderBottomWidth: 0 }]}
                    onPress={() => {
                        setShowExportModal(false);
                        exportDataToJSON('json');
                    }}
                >
                    <View style={[styles.iconContainer, { backgroundColor: 'rgba(239, 68, 68, 0.15)', marginRight: 16 }]}>
                        <Feather name="code" size={20} color={theme.expense} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.bottomSheetOptionText, { color: theme.textPrimary }]}>JSON</Text>
                        <Text style={[styles.bottomSheetOptionSubtext, { color: theme.textSecondary }]}>
                            {t('settings.exportModal.jsonSub', 'Restauração de sistema e devs')}
                        </Text>
                    </View>
                </TouchableOpacity>
                
                <View style={{ height: 20 }} /> 
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal
        visible={showLanguageModal}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowLanguageModal(false)}>
          <View style={[styles.bottomSheetBackdrop, { backgroundColor: theme.modalOverlay }]}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.bottomSheetCard,
                  { backgroundColor: theme.card },
                ]}
              >
                <View style={styles.bottomSheetHeader}>
                    <Text style={[styles.modalTitle, { color: theme.textPrimary, marginBottom: 0 }]}>
                      {t('settings.sections.preferences.language.title', 'Idioma')}
                    </Text>
                    <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                        <Feather name="x-circle" size={24} color={theme.textSecondary} />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity 
                    style={[styles.bottomSheetOption, { borderBottomColor: theme.cardBorder }]}
                    onPress={() => handleLanguageChange('pt-BR')}
                >
                    <View style={[styles.iconContainer, { backgroundColor: 'rgba(163, 230, 53, 0.15)', marginRight: 16 }]}>
                        <Feather name="globe" size={20} color={theme.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.bottomSheetOptionText, { color: theme.textPrimary }]}>Português (Brasil)</Text>
                    </View>
                    {i18n.language.startsWith('pt') && <Feather name="check" size={20} color={theme.accent} />}
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.bottomSheetOption, { borderBottomWidth: 0 }]}
                    onPress={() => handleLanguageChange('en')}
                >
                    <View style={[styles.iconContainer, { backgroundColor: 'rgba(14, 165, 233, 0.15)', marginRight: 16 }]}>
                        <Feather name="globe" size={20} color="#0EA5E9" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.bottomSheetOptionText, { color: theme.textPrimary }]}>English</Text>
                    </View>
                    {!i18n.language.startsWith('pt') && <Feather name="check" size={20} color={theme.accent} />}
                </TouchableOpacity>

                <View style={{ height: 20 }} /> 
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
  
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 20,
    borderWidth: 1,
    padding: 22,
    alignItems: 'center',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  confirmDeleteButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmDeleteText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  bottomSheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bottomSheetCard: {
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 24,
  },
  bottomSheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  bottomSheetOptionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSheetOptionSubtext: {
    fontSize: 13,
    marginTop: 2,
  },
});