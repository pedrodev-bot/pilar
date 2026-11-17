import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useUIStore } from '../../stores/useUIStore';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../stores/useThemeStore';

interface HomeHeaderProps {
  userName: string;
}

export function HomeHeader({ userName }: HomeHeaderProps) {
  const { isValuesHidden, toggleValuesVisibility } = useUIStore();
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <View style={[styles.container, { backgroundColor: theme.background, borderBottomColor: theme.cardBorder }]}>
      <View style={styles.textWrapper}>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{t('home.header.title')}</Text>
        <Text style={[styles.title, { color: theme.textPrimary }]}>{t('home.header.greeting', { userName })}</Text>
      </View>
      
      <TouchableOpacity 
        onPress={toggleValuesVisibility} 
        activeOpacity={0.7}
        style={styles.iconButton}
      >
        <Feather 
          name={isValuesHidden ? 'eye-off' : 'eye'} 
          size={24} 
          color={theme.textSecondary}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textWrapper: {
    flex: 1,
    marginRight: 16,
  },
  subtitle: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '600',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 2,
  },
  iconButton: {
    padding: 8,
  }
});