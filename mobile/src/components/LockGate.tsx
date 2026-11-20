
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/useAuthStore';
import { useTheme } from '../stores/useThemeStore';
import { useUIStore } from '../stores/useUIStore';
import { authenticate, canAuthenticate } from '../services/appLockService';

function useUIStoreHydrated() {
  const [hydrated, setHydrated] = useState(() => useUIStore.persist.hasHydrated());

  useEffect(() => {
    if (useUIStore.persist.hasHydrated()) {
      return;
    }
    return useUIStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  return hydrated;
}

export function LockGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const hydrated = useUIStoreHydrated();
  const isLockEnabled = useUIStore((state) => state.isAppLockEnabled);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isAppActive, setIsAppActive] = useState(
    AppState.currentState === 'active'
  );

  const isPrompting = useRef(false);

  const shouldLock = hydrated && isLockEnabled && isAuthenticated;
  const shouldLockRef = useRef(shouldLock);

  useEffect(() => {
    shouldLockRef.current = shouldLock;
  }, [shouldLock]);

  const unlock = useCallback(async () => {
    if (AppState.currentState !== 'active' || !shouldLockRef.current || isPrompting.current) {
      return;
    }

    isPrompting.current = true;

    try {
      const enrolled = await canAuthenticate();
      const success = enrolled
        ? await authenticate('settings.sections.security.appLock.prompt')
        : true;

      if (success) {
        setIsUnlocked(true);
      }
    } catch (error) {
      console.error('App lock authentication failed:', error);
    } finally {
      isPrompting.current = false;
    }
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      const isActive = state === 'active';

      setIsAppActive(isActive);

      if (state === 'background') {
        setIsUnlocked(false);
      }
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (shouldLock && !isUnlocked && isAppActive) {
      unlock();
    }
  }, [shouldLock, isUnlocked, isAppActive, unlock]);

  const isVisible = shouldLock && !isUnlocked;

  return (
    <View style={styles.container}>
      {children}

      {isVisible && (
        <View
          pointerEvents="auto"
          style={[
            styles.overlay,
            { backgroundColor: theme.background },
          ]}
        >
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: theme.card,
                borderColor: theme.cardBorder,
              },
            ]}
          >
            <Ionicons
              name="lock-closed-outline"
              size={32}
              color={theme.accent}
            />
          </View>

          <Text style={[styles.title, { color: theme.textPrimary }]}>
            {t('settings.sections.security.appLock.lockedTitle')}
          </Text>

          <Text style={[styles.message, { color: theme.textSecondary }]}>
            {t('settings.sections.security.appLock.lockedMessage')}
          </Text>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={unlock}
            style={[
              styles.button,
              { backgroundColor: theme.accent },
            ]}
          >
            <Text style={styles.buttonText}>
              {t('settings.sections.security.appLock.unlock')}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
    elevation: 1000,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 24,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
  },
  buttonText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '700',
  },
});
