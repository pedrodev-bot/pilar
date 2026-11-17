import * as LocalAuthentication from 'expo-local-authentication';
import i18n from '../locales/i18n';

export async function canAuthenticate(): Promise<boolean> {
  const level = await LocalAuthentication.getEnrolledLevelAsync();
  return level !== LocalAuthentication.SecurityLevel.NONE;
}

export async function authenticate(promptKey: string): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: i18n.t(promptKey),
    fallbackLabel: i18n.t('settings.sections.security.appLock.fallback'),
  });
  return result.success;
}
