import { getErrorMessage } from '../utils/errors';
import { isBeforeMonth, matchesMonth } from '../utils/monthFilter';

jest.mock('../locales/i18n', () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));

describe('Error Localization & Carry-Over Date Helpers', () => {
  it('translates raw fetch and Supabase network errors into friendly messages', () => {
    expect(getErrorMessage(new Error('TypeError: Failed to fetch'), 'fallback')).toBe('errors.network');
    expect(getErrorMessage({ name: 'AuthRetryableFetchError', message: 'java fetch supabase' }, 'fallback')).toBe(
      'errors.network'
    );
    expect(getErrorMessage(new Error('Invalid login credentials'), 'fallback')).toBe('errors.invalidCredentials');
    expect(getErrorMessage(new Error('User already registered'), 'fallback')).toBe('errors.userAlreadyExists');
    expect(getErrorMessage(new Error('Unknown internal failure'), 'fallback')).toBe('fallback');
  });

  it('partitions transactions accurately before and within a target month for carry-over', () => {
    const target = { year: 2026, month: 10 }; // November 2026 (0-indexed)

    expect(isBeforeMonth('2026-10-31T23:59:00.000Z', target)).toBe(true);
    expect(isBeforeMonth('2026-11-01T12:00:00.000Z', target)).toBe(false);
    expect(matchesMonth('2026-11-15T12:00:00.000Z', target)).toBe(true);
    expect(isBeforeMonth('2026-12-01T12:00:00.000Z', target)).toBe(false);
  });
});