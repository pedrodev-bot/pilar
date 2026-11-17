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

let isSyncing = false;

export interface TransactionState {
  transactions: Transaction[];
  pendingDeletes: string[];
  addTransaction: (tx: Omit<Transaction, 'id' | 'synced' | 'deleted'>) => void;
  updateTransaction: (id: string, updatedData: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  importTransactions: (newTransactions: Transaction[], replace: boolean) => void;
  clearAllTransactions: () => void;
  syncTransactions: () => Promise<void>;
  downloadTransactions: () => Promise<void>;
}

export const useTransactionStore = create<TransactionState>()(
  persist(
    (set, get) => ({
      transactions: [],
      pendingDeletes: [],
      
      addTransaction: (tx) => set((state) => ({
        transactions: [{ ...tx, id: randomUUID(), synced: false, deleted: false }, ...state.transactions]
      })),

      updateTransaction: (id, updatedData) => set((state) => ({
        transactions: state.transactions.map(tx => 
          tx.id === id ? { ...tx, ...updatedData, synced: false } : tx
        )
      })),

      deleteTransaction: (id) => set((state) => ({
        transactions: state.transactions.filter((t) => t.id !== id),
        pendingDeletes: [...state.pendingDeletes, id],
      })),

      importTransactions: (newTx, replace) => set((state) => {
        if (replace) {
          const keptIds = new Set(newTx.map((t) => t.id));
          const removedIds = state.transactions.map((t) => t.id).filter((id) => !keptIds.has(id));
          return {
            transactions: newTx,
            pendingDeletes: [...state.pendingDeletes, ...removedIds],
          };
        }

        const existingIds = new Set(state.transactions.map((t) => t.id));
        const uniqueNewTx = newTx.filter((t) => !existingIds.has(t.id));
        return { transactions: [...state.transactions, ...uniqueNewTx] };
      }),

      clearAllTransactions: () => set((state) => ({
        transactions: [],
        pendingDeletes: [...state.pendingDeletes, ...state.transactions.map((t) => t.id)],
      })),

      syncTransactions: async () => {
        if (isSyncing) return;
        isSyncing = true;

        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return;

          for (const id of get().pendingDeletes) {
            const response = await authFetch(`/transactions/${id}`, { method: 'DELETE' });
            if (response.ok || response.status === 404) {
              set((state) => ({ pendingDeletes: state.pendingDeletes.filter((pendingId) => pendingId !== id) }));
            }
          }

          const pending = get().transactions.filter(
            (t) => !t.synced && t.userId === session.user.id
          );

          for (const tx of pending) {
            const response = await authFetch(`/transactions/${tx.id}`, {
              method: 'PUT',
              body: JSON.stringify({
                description: tx.description,
                amount: tx.amount,
                date: tx.date,
                type: tx.type,
                category: tx.category ?? null,
                tags: tx.tags ?? [],
                payment_method: tx.payment_method ?? null,
                installments: tx.installments ?? null,
                notes: tx.notes ?? null,
                mood: tx.mood ?? null,
                vault_id: tx.vault_id ?? null,
                shared_with: tx.shared_with ?? [],
                is_recurring: tx.is_recurring ?? false,
                warranty_end: tx.warranty_end ?? null,
              }),
            });

            if (response.ok) {
              set((state) => ({
                transactions: state.transactions.map((t) =>
                t.id === tx.id &&
                t.description === tx.description &&
                t.amount === tx.amount &&
                t.date === tx.date &&
                t.type === tx.type &&
                (t.category ?? null) === (tx.category ?? null) &&
                JSON.stringify(t.tags ?? []) === JSON.stringify(tx.tags ?? []) &&
                (t.payment_method ?? null) === (tx.payment_method ?? null) &&
                (t.installments ?? null) === (tx.installments ?? null) &&
                (t.notes ?? null) === (tx.notes ?? null) &&
                (t.mood ?? null) === (tx.mood ?? null) &&
                (t.vault_id ?? null) === (tx.vault_id ?? null) &&
                JSON.stringify(t.shared_with ?? []) === JSON.stringify(tx.shared_with ?? []) &&
                (t.is_recurring ?? false) === (tx.is_recurring ?? false) &&
                (t.warranty_end ?? null) === (tx.warranty_end ?? null)
                  ? { ...t, synced: true }
                  : t
              ),
              }));
            }

            if (!response.ok) {
              const errorText = await response.text();

              console.log(
                `[SYNC] Falha na transação ${tx.id}:`,
                response.status,
                errorText
              );

              continue;
            }
          }
        } catch (error) {
          console.log("[SYNC] Erro ao sincronizar:", error);
        } finally {
          isSyncing = false;
        }
      },

      
      downloadTransactions: async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return;

          const response = await authFetch('/transactions');
          if (!response.ok) {
            console.error('Erro ao baixar transações:', response.status);
            return;
          }

          const serverResponse: (Omit<Transaction, 'userId'> & {
            user_id: string;
          })[] = await response.json();

          const serverTxs: Transaction[] = serverResponse.map(
            ({ user_id, ...tx }) => ({
              ...tx,
              userId: user_id,
            })
          );
          const serverIds = new Set(serverTxs.map((tx) => tx.id));

          set((state) => {
            const userTransactions = state.transactions.filter(
              (tx) => tx.userId === session.user.id
            );

            const reconciledTransactions = userTransactions.map((tx) =>
              tx.synced && !serverIds.has(tx.id)
                ? { ...tx, synced: false }
                : tx
            );

            const existingIds = new Set(state.transactions.map((tx) => tx.id));
            const pendingDeleteIds = new Set(state.pendingDeletes);

            const newTxs = serverTxs
              .filter((tx) => !existingIds.has(tx.id))
              .filter((tx) => !pendingDeleteIds.has(tx.id))
              .map((tx) => ({ ...tx, synced: true, deleted: false }));

            return {
              transactions: [
                ...state.transactions.filter((tx) => tx.userId !== session.user.id),
                ...reconciledTransactions,
                ...newTxs,
              ],
            };
          });
        } catch (error) {
          console.error('Erro ao baixar transações:', error);
        }
      },
    }),
    {
      name: 'pilar-transactions',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);