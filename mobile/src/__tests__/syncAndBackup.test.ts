import { useTransactionStore } from '../stores/transactionStore';
import { parseBackup } from '../utils/importTransactions';
import { supabase } from '../services/supabase';
import { authFetch } from '../services/api';

jest.mock('../locales/i18n', () => ({ __esModule: true, default: { t: (key: string) => key } }));

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

let uuidCounter = 0;
jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => `mock-uuid-${++uuidCounter}`),
}));

jest.mock('../services/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
  },
}));

jest.mock('../services/api', () => ({
  authFetch: jest.fn(),
}));

describe('Offline-First Sync Engine & Backup Parser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    uuidCounter = 0;
    useTransactionStore.setState({ transactions: [], pendingDeletes: [] });

    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: 'user-1' }, access_token: 'valid-token' } },
    });
  });

  it('syncs pending local transactions and marks them as synced on 200 OK', async () => {
    useTransactionStore.getState().addTransaction({
      userId: 'user-1',
      amount: 85.5,
      description: 'Internet Bill',
      date: '2026-11-20T10:00:00.000Z',
      type: 'expense',
    });

    (authFetch as jest.Mock).mockResolvedValue({ ok: true, status: 200 });

    await useTransactionStore.getState().syncTransactions();

    const txs = useTransactionStore.getState().transactions;
    expect(txs).toHaveLength(1);
    expect(txs[0].synced).toBe(true);
    expect(authFetch).toHaveBeenCalledWith(
      '/transactions/mock-uuid-1',
      expect.objectContaining({ method: 'PUT' })
    );
  });

  it('clears pendingDeletes on 200 or 404, but retains IDs on 500 server error', async () => {
    useTransactionStore.setState({
      transactions: [],
      pendingDeletes: ['tx-ok', 'tx-missing', 'tx-server-fail'],
    });

    (authFetch as jest.Mock).mockImplementation((path: string) => {
      if (path.endsWith('tx-ok')) return Promise.resolve({ ok: true, status: 200 });
      if (path.endsWith('tx-missing')) return Promise.resolve({ ok: false, status: 404 });
      return Promise.resolve({ ok: false, status: 500, text: async () => 'Internal Error' });
    });

    await useTransactionStore.getState().syncTransactions();

    expect(useTransactionStore.getState().pendingDeletes).toEqual(['tx-server-fail']);
  });

  it('reconciles server transactions and ignores items queued in pendingDeletes', async () => {
    useTransactionStore.setState({
      transactions: [
        {
          id: 'tx-deleted-remotely',
          userId: 'user-1',
          amount: 40,
          description: 'Old Coffee',
          date: '2026-11-19T10:00:00.000Z',
          type: 'expense',
          synced: true,
        },
      ],
      pendingDeletes: ['tx-pending-local-delete'],
    });

    (authFetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 'tx-from-server',
          user_id: 'user-1',
          amount: 500,
          description: 'Freelance',
          date: '2026-11-20T10:00:00.000Z',
          type: 'income',
          synced: true,
        },
        {
          id: 'tx-pending-local-delete',
          user_id: 'user-1',
          amount: 20,
          description: 'Should stay deleted',
          date: '2026-11-20T10:00:00.000Z',
          type: 'expense',
          synced: true,
        },
      ],
    });

    await useTransactionStore.getState().downloadTransactions();

    const txs = useTransactionStore.getState().transactions;
    const remotelyDeleted = txs.find((t) => t.id === 'tx-deleted-remotely');
    const serverImported = txs.find((t) => t.id === 'tx-from-server');
    const suppressedDelete = txs.find((t) => t.id === 'tx-pending-local-delete');

    expect(remotelyDeleted?.synced).toBe(false);
    expect(serverImported?.synced).toBe(true);
    expect(suppressedDelete).toBeUndefined();
  });

  it('parses localized CSV backups with Brazilian currency and dates', () => {
    const csvContent = [
      'date,description,amount,type,deleted',
      '20/11/2026,"Supermercado, Mensal","1.250,50",despesa,false',
      '21/11/2026,"Dividendo",320.00,receita,false',
      '22/11/2026,"Ignorado",100,despesa,true',
    ].join('\n');

    const report = parseBackup(csvContent);

    expect(report.records).toHaveLength(2);
    expect(report.records[0].amount).toBe(1250.5);
    expect(report.records[0].type).toBe('expense');
    expect(report.records[1].type).toBe('income');
    expect(report.skippedDeleted).toBe(1);
  });
});