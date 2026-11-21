import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { CHANGELOG, LATEST_RELEASE_VERSION } from '../constants/changelog';
import { useTheme } from '../stores/useThemeStore';

interface WhatsNewModalProps {
  visible: boolean;
  mode: 'announcement' | 'history';
  onClose: () => void;
}

export function WhatsNewModal({ visible, mode, onClose }: WhatsNewModalProps) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const lang = i18n.language.startsWith('pt') ? 'pt-BR' : 'en-US';

  const releases = mode === 'announcement' ? CHANGELOG.slice(0, 1) : CHANGELOG;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[styles.backdrop, { backgroundColor: theme.modalOverlay }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.header}>
            <View style={[styles.badge, { backgroundColor: theme.incomeSoft }]}>
              <Feather name="zap" size={14} color={theme.income} />
              <Text style={[styles.badgeText, { color: theme.income }]}>
                {mode === 'announcement'
                  ? t('whatsNew.announcementBadge', { version: LATEST_RELEASE_VERSION })
                  : t('whatsNew.historyBadge')}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="x" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.heading, { color: theme.textPrimary }]}>
            {mode === 'announcement' ? t('whatsNew.announcementTitle') : t('whatsNew.historyTitle')}
          </Text>

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator
            nestedScrollEnabled
          >
            {releases.map((release, idx) => {
              const isLast = idx === releases.length - 1;
              const formattedDate = new Date(`${release.date}T12:00:00`).toLocaleDateString(
                i18n.language,
                { day: '2-digit', month: 'short', year: 'numeric' }
              );

              return (
                <View
                  key={release.version}
                  style={[
                    styles.releaseBlock,
                    !isLast && { borderBottomWidth: 1, borderBottomColor: theme.cardBorder },
                  ]}
                >
                  <View style={styles.releaseHeader}>
                    <Text style={[styles.versionTag, { color: theme.accent }]}>
                      v{release.version}
                    </Text>
                    <Text style={[styles.dateText, { color: theme.textSecondary }]}>
                      {formattedDate}
                    </Text>
                  </View>

                  <Text style={[styles.releaseTitle, { color: theme.textPrimary }]}>
                    {release.title[lang]}
                  </Text>

                  {release.highlights[lang].map((item, itemIdx) => (
                    <View key={itemIdx} style={styles.bulletRow}>
                      <View style={[styles.bulletDot, { backgroundColor: theme.accent }]} />
                      <Text style={[styles.bulletText, { color: theme.textSecondary }]}>
                        {item}
                      </Text>
                    </View>
                  ))}
                </View>
              );
            })}
          </ScrollView>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onClose}
            style={[styles.primaryButton, { backgroundColor: theme.accent }]}
          >
            <Text style={styles.primaryButtonText}>{t('whatsNew.confirmButton')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '80%',
    borderRadius: 22,
    borderWidth: 1,
    padding: 22,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 14,
  },
  scrollArea: {
    flexShrink: 1,
    marginBottom: 18,
  },
  scrollContent: {
    paddingRight: 4,
  },
  releaseBlock: {
    paddingVertical: 12,
  },
  releaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  versionTag: {
    fontSize: 13,
    fontWeight: '800',
  },
  dateText: {
    fontSize: 12,
  },
  releaseTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  primaryButton: {
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '700',
  },
});