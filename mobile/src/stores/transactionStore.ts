import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

import { documentDirectory, writeAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import type { ImportedTransaction, TransactionType } from '../utils/importTransactions';

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  description: string;
  date: string;
  type: TransactionType;
  synced: boolean;
  deleted?: boolean;
  category?: string | null;
  tags?: string[];
  payment_method?: string | null;
  installments?: number | null;
  notes?: string | null;
  mood?: string | null;
  vault_id?: string | null;
  shared_with?: string[];
  is_recurring?: boolean;
  warranty_end?: string | null;
}

export interface ImportSummary {
  imported: number;
  duplicates: number;
}

const byDateDesc = (a: Transaction, b: Transaction) =>
  new Date(b.date).getTime() - new Date(a.date).getTime();

interface TransactionState {
  transactions: Transaction[];
  addTransaction: (tx: Omit<Transaction, 'id' | 'synced' | 'deleted'>) => void;
  updateTransaction: (id: string, updatedData: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  exportDataToJSON: (format?: 'json' | 'csv') => Promise<void>;
  importTransactions: (records: ImportedTransaction[], userId: string) => ImportSummary;
  clearAllTransactions: () => void;
}

export const useTransactionStore = create<TransactionState>()(
  persist(
    (set, get) => ({
      transactions: [],
      
      addTransaction: (tx) => set((state) => ({
        transactions: [{ ...tx, id: uuidv4(), synced: false, deleted: false }, ...state.transactions]
      })),

      updateTransaction: (id, updatedData) => set((state) => ({
        transactions: state.transactions.map(tx => 
          tx.id === id ? { ...tx, ...updatedData, synced: false } : tx
        )
      })),

      deleteTransaction: (id: string) => set((state) => ({
        transactions: state.transactions.filter(
            (t) => String(t.id) !== String(id)
          ),
      })),

      importTransactions: (records, userId) => {
        const knownIds = new Set(get().transactions.map((t) => String(t.id)));
        const toAdd: Transaction[] = [];
        let duplicates = 0;

        for (const record of records) {
          if (knownIds.has(record.id)) {
            duplicates++;
            continue;
          }
          knownIds.add(record.id);
          toAdd.push({ ...record, userId, synced: false, deleted: false });
        }

        if (toAdd.length > 0) {
          set((state) => ({
            transactions: [...toAdd, ...state.transactions].sort(byDateDesc),
          }));
        }

        return { imported: toAdd.length, duplicates };
      },

      exportDataToJSON: async (format = 'json') => {
        const { transactions } = get();

        const exportData = transactions.map(t => ({
            id: t.id,
            date: t.date,
            description: t.description,
            amount: t.amount,
            type: t.type,
            category: t.category ?? null,
            tags: t.tags ?? [],
            payment_method: t.payment_method ?? null,
            installments: t.installments ?? null,
            notes: t.notes ?? null,
            mood: t.mood ?? null,
            vault_id: t.vault_id ?? null,
            shared_with: t.shared_with ?? [],
            is_recurring: t.is_recurring ?? false,
            warranty_end: t.warranty_end ?? null,
            synced: t.synced,
            deleted: t.deleted ?? false
        }));

        let fileContent = '';
        let mimeType = '';
        let fileExtension = '';

        if (format === 'csv') {
           if (exportData.length === 0) {
             fileContent = "id,date,description,amount,type";
           } else {
             const headers = Object.keys(exportData[0]).join(',');
             const rows = exportData.map(obj => {
                 return Object.values(obj).map(value => {
                     if (value === null) return '';
                     if (Array.isArray(value)) return `"${value.join(';')}"`;
                     if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
                     return value;
                 }).join(',');
             }).join('\n');
             fileContent = `${headers}\n${rows}`;
           }
           mimeType = 'text/csv';
           fileExtension = 'csv';
        } else {
           fileContent = JSON.stringify(exportData, null, 2);
           mimeType = 'application/json';
           fileExtension = 'json';
        }

        try {
          if (Platform.OS === 'web') {
            const blob = new Blob([fileContent], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `core_finance_backup_${new Date().toISOString().split('T')[0]}.${fileExtension}`;
            a.click();
            URL.revokeObjectURL(url);
          } else {
            const dir = documentDirectory || '';
            const fileUri = `${dir}core_finance_backup_${new Date().toISOString().split('T')[0]}.${fileExtension}`;
            
            await writeAsStringAsync(fileUri, fileContent, {
              encoding: EncodingType.UTF8,
            });
            
            if (await Sharing.isAvailableAsync()) {
              await Sharing.shareAsync(fileUri, {
                mimeType: mimeType,
                dialogTitle: 'Exportar Backup do Core Finance',
              });
            }
          }
        } catch (error) {
          console.error("Erro ao exportar dados:", error);
          throw error;
        }
      },

      clearAllTransactions: () => {
        set({ transactions: [] });
      },

    }),
    {
      name: 'core-finance-transactions',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);