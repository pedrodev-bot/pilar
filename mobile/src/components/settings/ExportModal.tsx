import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TouchableWithoutFeedback, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Calendar, DateData } from 'react-native-calendars';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../../stores/useThemeStore';
import { useTransactionStore } from '../../stores/transactionStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { exportTransactions, ExportFormat } from '../../services/exportService';

interface ExportModalProps {
  visible: boolean;
  onClose: () => void;
}

type PeriodFilter = 'all' | 'this_week' | 'this_month' | 'custom';

export function ExportModal({ visible, onClose }: ExportModalProps) {
  const { t } = useTranslation();
  const theme = useThemeStore((state) => state.theme);
  const transactions = useTransactionStore((state) => state.transactions);
  const userId = useAuthStore((state) => state.user?.id);

  const [selectedFilter, setSelectedFilter] = useState<PeriodFilter>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  const calculateDates = (filter: PeriodFilter) => {
    const today = new Date();
    if (filter === 'this_week') {
      const start = new Date(today);
      start.setDate(today.getDate() - 7);
      return { start: start.toISOString(), end: today.toISOString() };
    }
    if (filter === 'this_month') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start: start.toISOString(), end: today.toISOString() };
    }
    if (filter === 'custom' && customStartDate && customEndDate) {
      return { start: customStartDate, end: customEndDate };
    }
    return undefined; // 'all' retorna undefined
  };

  const handleExport = async (format: ExportFormat) => {
    if (selectedFilter === 'custom' && (!customStartDate || !customEndDate)) {
        Alert.alert(t('common.attention'), t('settings.sections.data.export.selectRange'));
        return;
    }

    const period = calculateDates(selectedFilter);
    try {
      await exportTransactions(transactions.filter((t) => t.userId === userId), format, period);
      onClose(); // Fecha após gerar
    } catch (error: any) {
        Alert.alert(t('common.error'), error.message);
    }
  };

  const handleDayPress = (day: DateData) => {
    if (!customStartDate || (customStartDate && customEndDate)) {
      setCustomStartDate(day.dateString);
      setCustomEndDate('');
    } else {
      const start = new Date(customStartDate);
      const current = new Date(day.dateString);
      if (current < start) {
        setCustomStartDate(day.dateString); // Inverte se selecionou uma data menor
      } else {
        setCustomEndDate(day.dateString);
      }
    }
  };

  const calendarTheme = {
    calendarBackground: theme.card,
    textSectionTitleColor: theme.textSecondary,
    dayTextColor: theme.textPrimary,
    todayTextColor: theme.accent,
    selectedDayTextColor: '#000000',
    monthTextColor: theme.textPrimary,
    indicatorColor: theme.accent,
    arrowColor: theme.textPrimary,
    selectedDayBackgroundColor: theme.accent,
  };

  const markedDates: any = {};
  if (customStartDate) {
    markedDates[customStartDate] = { startingDay: true, color: theme.accent, textColor: '#000' };
  }
  if (customEndDate) {
    markedDates[customEndDate] = { endingDay: true, color: theme.accent, textColor: '#000' };
    
    let currentDate = new Date(customStartDate);
    currentDate.setDate(currentDate.getDate() + 1);
    const endDateObj = new Date(customEndDate);
    
    while (currentDate < endDateObj) {
      const dateString = currentDate.toISOString().split('T')[0];
      markedDates[dateString] = { color: 'rgba(163, 230, 53, 0.2)', textColor: theme.textPrimary }; 
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  return (
    <Modal animationType="slide" onRequestClose={onClose} statusBarTranslucent transparent visible={visible}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.backdrop, { backgroundColor: theme.modalOverlay }]}>
          <TouchableWithoutFeedback>
            <View style={[styles.card, { backgroundColor: theme.card }]}>
              
              <View style={styles.header}>
                <Text style={[styles.title, { color: theme.textPrimary }]}>
                  {t('settings.sections.data.export.title')}
                </Text>
                <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} onPress={onClose}>
                  <Feather color={theme.textSecondary} name="x-circle" size={24} />
                </TouchableOpacity>
              </View>

              {/* CHIPS DE FILTRO */}
              <View style={styles.chipRow}>
                {[
                  { id: 'all', label: t('settings.sections.data.export.filters.all') },
                  { id: 'this_week', label: t('settings.sections.data.export.filters.thisWeek') },
                  { id: 'this_month', label: t('settings.sections.data.export.filters.thisMonth') },
                  { id: 'custom', label: t('settings.sections.data.export.filters.custom') }
                ].map((chip) => {
                  const isActive = selectedFilter === chip.id;
                  return (
                    <TouchableOpacity 
                      key={chip.id} 
                      activeOpacity={0.7} 
                      style={[
                        styles.chip, 
                        { borderColor: theme.cardBorder },
                        isActive ? { backgroundColor: theme.textPrimary } : { backgroundColor: 'transparent' }
                      ]} 
                      onPress={() => setSelectedFilter(chip.id as PeriodFilter)}
                    >
                      <Text style={[
                        styles.chipText, 
                        isActive ? { color: theme.background } : { color: theme.textSecondary }
                      ]}>
                        {chip.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* CALENDÁRIO (Só aparece no Personalizado) */}
              {selectedFilter === 'custom' && (
                <View style={[styles.calendarContainer, { borderColor: theme.cardBorder }]}>
                  <Calendar 
                    firstDay={0} 
                    markedDates={markedDates} 
                    markingType={'period'} 
                    onDayPress={handleDayPress} 
                    theme={calendarTheme}
                  />
                </View>
              )}

              {/* BOTÕES DE EXPORTAÇÃO */}
              <View style={styles.actionSection}>
                <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>Selecione o formato:</Text>
                
                <TouchableOpacity onPress={() => handleExport('xlsx')} style={[styles.optionRow, { borderBottomColor: theme.cardBorder }]}>
                    <View style={[styles.iconContainer, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                      <Feather color={theme.income} name="grid" size={20} />
                    </View>
                    <View style={styles.textContainer}>
                        <Text style={[styles.optionText, { color: theme.textPrimary }]}>XLSX (Excel)</Text>
                        <Text style={[styles.optionSubtext, { color: theme.textSecondary }]}>Planilha nativa formatada.</Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => handleExport('csv')} style={[styles.optionRow, { borderBottomColor: theme.cardBorder }]}>
                    <View style={[styles.iconContainer, { backgroundColor: 'rgba(10, 132, 255, 0.15)' }]}>
                      <Feather color="#0A84FF" name="file-text" size={20} />
                    </View>
                    <View style={styles.textContainer}>
                        <Text style={[styles.optionText, { color: theme.textPrimary }]}>CSV</Text>
                        <Text style={[styles.optionSubtext, { color: theme.textSecondary }]}>Planilha em texto simples.</Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => handleExport('json')} style={[styles.optionRow, { borderBottomWidth: 0 }]}>
                    <View style={[styles.iconContainer, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                      <Feather color={theme.expense} name="code" size={20} />
                    </View>
                    <View style={styles.textContainer}>
                        <Text style={[styles.optionText, { color: theme.textPrimary }]}>JSON</Text>
                        <Text style={[styles.optionSubtext, { color: theme.textSecondary }]}>Restauração do sistema.</Text>
                    </View>
                </TouchableOpacity>
              </View>

            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  card: { width: '100%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 20 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 0 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '600' },
  calendarContainer: { borderWidth: 1, borderRadius: 16, overflow: 'hidden', marginBottom: 20 },
  actionSection: { marginTop: 4 },
  sectionSubtitle: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12 },
  optionRow: { flexDirection: 'row', alignItems: 'center', width: '100%', paddingVertical: 14, borderBottomWidth: 1 },
  iconContainer: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  textContainer: { flex: 1 },
  optionText: { fontSize: 16, fontWeight: '600' },
  optionSubtext: { fontSize: 13, marginTop: 2 },
});