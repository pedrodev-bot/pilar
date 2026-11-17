import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import type { TransactionType } from '../utils/importTransactions';
import { supabase } from '../services/supabase';
import { authFetch } from '../services/api';

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
  importTransactions: (newTransactions: Transaction[], replace: boolean) => void;
  clearAllTransactions: () => void;
  syncTransactions: () => Promise<void>;
  fetchCloudTransactions: () => Promise<void>;
}

export const useTransactionStore = create<TransactionState>()(
  persist(
    (set, get) => ({
      transactions: [],
      
      addTransaction: (tx) => set((state) => ({
        transactions: [{ ...tx, id: randomUUID(), synced: false, deleted: false }, ...state.transactions]
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

      clearAllTransactions: () => {
        set({ transactions: [] });
      },

      syncTransactions: async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const pending = get().transactions.filter(
          (t) => !t.synced && !t.deleted && t.userId === session.user.id
        );

        for (const tx of pending) {
          try {
            const response = await authFetch('/transactions', {
              method: 'POST',
              body: JSON.stringify({
                description: tx.description,
                amount: tx.amount,
                date: tx.date,
                type: tx.type,
              }),
            });

            if (response.ok) {
              set((state) => ({
                transactions: state.transactions.map((t) => (t.id === tx.id ? { ...t, synced: true } : t)),
              }));
            }
          } catch {
            
          }
        }
      },
      fetchCloudTransactions: async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return;

          const response = await authFetch('/transactions');
          if (!response.ok) return;

          const cloudData = await response.json();
          
          set((state) => {
            const localMap = new Map(state.transactions.map((t) => [t.id, t]));

            cloudData.forEach((cloudTx: any) => {
              const local = localMap.get(cloudTx.id);
              
              if (!local || local.synced) {
                localMap.set(cloudTx.id, {
                  ...local,
                  id: cloudTx.id,
                  description: cloudTx.description,
                  amount: cloudTx.amount,
                  date: cloudTx.date,
                  type: cloudTx.type as any,
                  userId: cloudTx.user_id,
                  synced: true,
                });
              }
            });

            const mergedTransactions = Array.from(localMap.values()).sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            );

            return { transactions: mergedTransactions };
          });
        } catch (error) {
          if (__DEV__) console.warn('Modo Offline: Não foi possível descarregar dados da nuvem.');
        }
      },
    }),
    {
      name: 'core-finance-transactions',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);