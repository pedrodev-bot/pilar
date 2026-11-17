import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/useAuthStore';
import { useThemeStore } from '../stores/useThemeStore';
import { useAutoSync } from '../hooks/useAutoSync';
import { AlertHost } from '../components/AlertHost';
import { LockGate } from '../components/LockGate';
import '../locales/i18n';
import '../services/notificationService';

export default function RootLayout() {
  const { ready } = useTranslation();
  const { isAuthenticated, isLoading, init } = useAuthStore();
  const isDark = useThemeStore((state) => state.isDark);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => init(), [init]);
  useAutoSync();

  useEffect(() => {
    if (isLoading || !ready) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login' as any);
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)' as any);
    }
  }, [isAuthenticated, isLoading, ready, segments, router]);

  if (isLoading) return null;

  return (
    <LockGate>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="new" options={{ presentation: 'modal' }} />
      </Stack>
      <AlertHost />
    </LockGate>
  );
}