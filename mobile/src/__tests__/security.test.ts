import { useTransactionStore } from '../stores/transactionStore';
import { parseBackup } from '../utils/importTransactions';
import { supabase } from '../services/supabase';
import { authFetch } from '../services/api';

// Mocks dos módulos nativos e serviços externos
jest.mock('../locales/i18n', () => ({ __esModule: true, default: { t: (key: string) => key } }));

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'mock-uuid-' + Math.random().toString(36).substring(2, 9)),
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

describe('Segurança Offline-First & Isolamento de Dados (Mobile)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTransactionStore.setState({ transactions: [], pendingDeletes: [] });
  });

  it('NÃO deve sincronizar transações pendentes de outro usuário armazenadas localmente', async () => {
    // 1. Usuário A cria uma transação offline
    useTransactionStore.getState().addTransaction({
      userId: 'user-A',
      amount: 250,
      description: 'Compra secreta do Usuário A',
      date: '2026-11-17T12:00:00.000Z',
      type: 'expense',
    });

    // 2. Usuário B faz login no mesmo aparelho
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: 'user-B' }, access_token: 'token-B' } },
    });
    (authFetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => [] });

    // 3. Dispara sincronização
    await useTransactionStore.getState().syncTransactions();

    // 4. Garante que NENHUM PUT foi enviado com os dados do Usuário A
    expect(authFetch).not.toHaveBeenCalledWith(
      expect.stringContaining('/transactions/'),
      expect.objectContaining({ method: 'PUT' })
    );
  });

  it('deve rejeitar registros maliciosos ou inválidos na importação de backup', () => {
    const maliciousJson = JSON.stringify([
      {
        date: '2026-11-17',
        description: 'Válido',
        amount: 100,
        type: 'income',
      },
      {
        date: '2026-11-17',
        description: 'Valor negativo tentando burlar saldo',
        amount: -99999,
        type: 'expense',
      },
      {
        date: 'data-invalida',
        description: 'Data quebrada',
        amount: 50,
        type: 'expense',
      },
      {
        date: '2026-11-17',
        description: 'Tipo não permitido',
        amount: 50,
        type: 'admin_override',
      },
    ]);

    const report = parseBackup(maliciousJson);

    expect(report.records).toHaveLength(1);
    expect(report.records[0].description).toBe('Válido');
    expect(report.invalid).toHaveLength(3);
  });
});