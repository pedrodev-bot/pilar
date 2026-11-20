import { ExpoConfig, ConfigContext } from 'expo/config';

const IS_DEV = process.env.APP_VARIANT === 'development';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: IS_DEV ? 'Pilar Dev' : 'Pilar',
  slug: 'pilar',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: IS_DEV ? 'pilar-dev' : 'pilar',
  userInterfaceStyle: 'automatic',
  ios: {
    icon: './assets/expo.icon',
    infoPlist: {},
    bundleIdentifier: IS_DEV ? 'com.pedrolopes.pilar.dev' : 'com.pedrolopes.pilar',
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#121216',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    package: IS_DEV ? 'com.pedrolopes.pilar.dev' : 'com.pedrolopes.pilar',
  },
  web: {
    output: 'single',
    favicon: './assets/images/favicon.png',
    name: 'Pilar',
    shortName: 'Pilar',
    themeColor: '#121216',
    backgroundColor: '#121216',
    display: 'standalone',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#121216',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
    'expo-secure-store',
    'expo-localization',
    'expo-sharing',
    'expo-updates',
  ],
  runtimeVersion: {
    policy: 'appVersion',
  },
  updates: {
    url: 'https://u.expo.dev/9afaed39-5595-46c3-976e-0c813c29e6da',
  },
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    ...config.extra,
    eas: {
      projectId: '9afaed39-5595-46c3-976e-0c813c29e6da',
    },
    router: {
      asyncRoutes: {
        web: false,
      },
    },
  },
});