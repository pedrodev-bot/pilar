import i18n from '../locales/i18n';

const ERROR_RULES: { match: RegExp; key: string }[] = [
  {
    match: /fetch|network|timeout|timed out|abort|econnrefused|enotfound|offline|authretryablefetcherror/i,
    key: 'errors.network',
  },
  {
    match: /invalid login credentials|invalid_credentials/i,
    key: 'errors.invalidCredentials',
  },
  {
    match: /user already registered|already been registered/i,
    key: 'errors.userAlreadyExists',
  },
  {
    match: /email not confirmed/i,
    key: 'errors.emailNotConfirmed',
  },
  {
    match: /password should be at least|weak_password/i,
    key: 'errors.weakPassword',
  },
  {
    match: /invalid email|unable to validate email/i,
    key: 'errors.invalidEmail',
  },
  {
    match: /rate limit|too many requests/i,
    key: 'errors.rateLimit',
  },
  {
    match: /jwt|session|refresh_token|not authenticated/i,
    key: 'errors.sessionExpired',
  },
];

// Maps raw technical/SDK error strings into localized user-friendly messages.
export function getErrorMessage(error: unknown, fallback: string): string {
  const raw =
    error instanceof Error
      ? `${error.name} ${error.message}`
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: unknown }).message)
        : typeof error === 'string'
          ? error
          : '';

  for (const rule of ERROR_RULES) {
    if (rule.match.test(raw)) {
      return i18n.t(rule.key);
    }
  }

  return fallback;
}