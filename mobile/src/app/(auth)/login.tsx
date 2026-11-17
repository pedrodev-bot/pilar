import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { loginRequest, registerRequest } from '../../services/authService';
import { useTheme } from '../../stores/useThemeStore';
import { showAlert } from '../../stores/useAlertStore';
import { getErrorMessage } from '../../utils/errors';

export default function LoginScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const inputStyle = [
    styles.input,
    { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.textPrimary },
  ];

  async function handleSubmit() {
    if ((isRegistering && !username.trim()) || !email.trim() || !password.trim()) {
      showAlert(t('common.attention'), t('auth.login.alerts.missingCredentials'), undefined, { variant: 'warning' });
      return;
    }

    try {
      setLoading(true);
      if (isRegistering) {
        await registerRequest(email.trim(), password, username.trim());
        showAlert(t('common.success'), t('auth.login.alerts.registered'), undefined, { variant: 'success' });
      } else {
        await loginRequest(email.trim(), password);
      }
    } catch (error) {
      showAlert(t('common.error'), getErrorMessage(error, t('auth.login.errors.requestFailed')), undefined, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setUsername('');
    setPassword('');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={[styles.formCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <Text style={[styles.brandTitle, { color: theme.textPrimary }]}>{t('auth.login.brandTitle')}</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {isRegistering ? t('auth.login.subtitle.register') : t('auth.login.subtitle.signIn')}
        </Text>

        {isRegistering && (
          <TextInput
            placeholder={t('auth.login.placeholders.username')}
            placeholderTextColor={theme.textSecondary}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            style={inputStyle}
          />
        )}

        <TextInput
          placeholder={t('auth.login.placeholders.email')}
          placeholderTextColor={theme.textSecondary}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={inputStyle}
        />

        <TextInput
          placeholder={t('auth.login.placeholders.password')}
          placeholderTextColor={theme.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={inputStyle}
        />

        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.accent }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#000000" />
          ) : (
            <Text style={styles.buttonText}>
              {isRegistering ? t('auth.login.buttons.registerAndSignIn') : t('auth.login.buttons.signIn')}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={toggleMode} style={styles.switchButton}>
          <Text style={[styles.switchText, { color: theme.investment }]}>
            {isRegistering ? t('auth.login.switchMode.toLogin') : t('auth.login.switchMode.toRegister')}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  formCard: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 24,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    marginBottom: 14,
  },
  button: {
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  buttonText: {
    color: '#000000',
    fontWeight: '700',
    fontSize: 16,
  },
  switchButton: {
    marginTop: 18,
    alignItems: 'center',
  },
  switchText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
