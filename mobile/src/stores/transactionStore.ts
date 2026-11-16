import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

import { documentDirectory, writeAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import type { TransactionType } from '../utils/importTransactions';
import * as XLSX from 'xlsx';
import { supabase } from '../services/supabase';
import { API_BASE_URL } from '../services/api';

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

const byDateDesc = (a: Transaction, b: Transaction) =>
  new Date(b.date).getTime() - new Date(a.date).getTime();

export interface TransactionState {
  transactions: Transaction[];
  addTransaction: (tx: Omit<Transaction, 'id' | 'synced' | 'deleted'>) => void;
  updateTransaction: (id: string, updatedData: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  exportData: (format?: 'json' | 'csv' | 'xlsx', period?: { start?: string; end?: string }) => Promise<void>;
  importTransactions: (newTransactions: Transaction[], replace: boolean) => void;
  clearAllTransactions: () => void;
  syncTransactions: () => Promise<void>; 
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

      importTransactions: (newTx, replace) => set((state) => {
        if (replace) {
          return { transactions: newTx };
        }
        const existingIds = new Set(state.transactions.map(t => t.id));
        const uniqueNewTx = newTx.filter(t => !existingIds.has(t.id));
        
        return { transactions: [...state.transactions, ...uniqueNewTx] };
      }),

      exportData: async (format = 'json', period) => {
        const { transactions } = get();

        let filteredTransactions = transactions;
        if (period?.start && period?.end) {
          const startDate = new Date(period.start).getTime();
          const endDate = new Date(period.end).setHours(23, 59, 59, 999);
          
          filteredTransactions = transactions.filter(t => {
            const tTime = new Date(t.date).getTime();
            return tTime >= startDate && tTime <= endDate;
          });
        }

        const exportData = filteredTransactions.map(t => ({
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
          deleted: t.deleted,
        }));

        if (exportData.length === 0) {
            throw new Error("Nenhuma transação encontrada no período selecionado.");
        }

        let fileContent = '';
        let mimeType = '';
        let fileExtension = '';

        if (format === 'csv') {
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
           mimeType = 'text/csv';
           fileExtension = 'csv';
        } else if (format === 'xlsx') {
           const worksheet = XLSX.utils.json_to_sheet(exportData);
           const workbook = XLSX.utils.book_new();
           XLSX.utils.book_append_sheet(workbook, worksheet, "Transações");
           
           fileContent = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
           mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
           fileExtension = 'xlsx';
        } else {
           fileContent = JSON.stringify(exportData, null, 2);
           mimeType = 'application/json';
           fileExtension = 'json';
        }

        try {
          if (Platform.OS === 'web') {
             let blob;
             if (format === 'xlsx') {
                 const byteCharacters = atob(fileContent);
                 const byteNumbers = new Array(byteCharacters.length);
                 for (let i = 0; i < byteCharacters.length; i++) {
                     byteNumbers[i] = byteCharacters.charCodeAt(i);
                 }
                 const byteArray = new Uint8Array(byteNumbers);
                 blob = new Blob([byteArray], { type: mimeType });
             } else {
                 blob = new Blob([fileContent], { type: mimeType });
             }
             
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
              encoding: format === 'xlsx' ? EncodingType.Base64 : EncodingType.UTF8,
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

      syncTransactions: async () => {
    const state = get();
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    const token = session.access_token;
    
    const unsyncedTx = state.transactions.filter(
      t => !t.synced && !t.deleted && t.userId === session.user.id
    );

    if (unsyncedTx.length === 0) return;

    for (const tx of unsyncedTx) {
      try {
        const response = await fetch(`${API_BASE_URL}/transactions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            description: tx.description,
            amount: tx.amount,
            date: tx.date,
            type: tx.type
          })
        });

        if (response.ok) {
          set((s) => ({
            transactions: s.transactions.map((t) => 
              t.id === tx.id ? { ...t, synced: true } : t
            )
          }));
        }
      } catch (error) {
        if (__DEV__) console.warn('A aguardar internet para sincronizar:', tx.description);
      }
    }
  },

    }),
    {
      name: 'core-finance-transactions',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);