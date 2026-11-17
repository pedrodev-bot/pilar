import * as DocumentPicker from 'expo-document-picker';
import { readAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import i18n from '../locales/i18n';

export interface PickedFile {
  name: string;
  content: string;
}

async function readTextFromUri(uri: string): Promise<string> {
  const errors: string[] = [];

  try {
    const response = await fetch(uri);
    const text = await response.text();
    if (text) return text;
    errors.push('fetch: arquivo vazio');
  } catch (e) {
    errors.push(`fetch: ${e instanceof Error ? e.message : String(e)}`);
  }

  try {
    const { File } = require('expo-file-system');
    if (File) {
      const text = await new File(uri).text();
      if (text) return text;
      errors.push('File.text: arquivo vazio');
    }
  } catch (e) {
    errors.push(`File.text: ${e instanceof Error ? e.message : String(e)}`);
  }

  try {
    const text = await readAsStringAsync(uri, { encoding: EncodingType.UTF8 });
    if (text) return text;
    errors.push('legacy: arquivo vazio');
  } catch (e) {
    errors.push(`legacy: ${e instanceof Error ? e.message : String(e)}`);
  }

  console.warn('Falha ao ler arquivo de importação:', errors);
  throw new Error(i18n.t('settings.sections.data.import.errors.unreadable'));
}
export async function pickBackupFile(): Promise<PickedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    multiple: false,
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];

  const content =
    Platform.OS === 'web'
      ? asset.file
        ? await asset.file.text()
        : await (await fetch(asset.uri)).text()
      : await readTextFromUri(asset.uri);

  return { name: asset.name, content };
}