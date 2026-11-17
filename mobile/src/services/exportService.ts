import { Platform } from 'react-native';
import { documentDirectory, writeAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import i18n from '../locales/i18n';
import type { Transaction } from '../stores/transactionStore';

export type ExportFormat = 'json' | 'csv' | 'xlsx';

export interface ExportPeriod {
  start?: string;
  end?: string;
}

interface ExportFile {
  content: string;
  mimeType: string;
  extension: string;
}

const toRow = (t: Transaction) => ({
  id: t.id,
  date: t.date,
  description: t.description,
  amount: t.amount,
  type: t.type,
  category: t.category ?? null,
  tags: t.tags ?? [],
  payment_method: t.payment_method ?? null,
  installments: t.installments ?? null,
  notes: t.notes ?? null,
  mood: t.mood ?? null,
  vault_id: t.vault_id ?? null,
  shared_with: t.shared_with ?? [],
  is_recurring: t.is_recurring ?? false,
  warranty_end: t.warranty_end ?? null,
  synced: t.synced,
  deleted: t.deleted,
});

type ExportRow = ReturnType<typeof toRow>;

function filterByPeriod(transactions: Transaction[], period?: ExportPeriod): Transaction[] {
  if (!period?.start || !period?.end) return transactions;

  const start = new Date(`${period.start}T00:00:00`).getTime();
  const end = new Date(`${period.end}T23:59:59.999`).getTime();

  return transactions.filter((t) => {
    const time = new Date(t.date).getTime();
    return time >= start && time <= end;
  });
}

function toCsv(rows: ExportRow[]): string {
  const header = Object.keys(rows[0]).join(',');
  const lines = rows.map((row) =>
    Object.values(row)
      .map((value) => {
        if (value === null || value === undefined) return '';
        if (Array.isArray(value)) return `"${value.join(';')}"`;
        if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
        return value;
      })
      .join(',')
  );
  return [header, ...lines].join('\n');
}

function buildFile(rows: ExportRow[], format: ExportFormat): ExportFile {
  if (format === 'csv') {
    return { content: toCsv(rows), mimeType: 'text/csv', extension: 'csv' };
  }

  if (format === 'xlsx') {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(rows),
      i18n.t('settings.sections.data.export.sheetName')
    );
    return {
      content: XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' }),
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      extension: 'xlsx',
    };
  }

  return { content: JSON.stringify(rows, null, 2), mimeType: 'application/json', extension: 'json' };
}

function downloadOnWeb(file: ExportFile, fileName: string, isBase64: boolean) {
  const data = isBase64 ? Uint8Array.from(atob(file.content), (char) => char.charCodeAt(0)) : file.content;
  const url = URL.createObjectURL(new Blob([data], { type: file.mimeType }));

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

async function shareOnDevice(file: ExportFile, fileName: string, isBase64: boolean) {
  const fileUri = `${documentDirectory ?? ''}${fileName}`;

  await writeAsStringAsync(fileUri, file.content, {
    encoding: isBase64 ? EncodingType.Base64 : EncodingType.UTF8,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: file.mimeType,
      dialogTitle: i18n.t('settings.sections.data.export.dialogTitle'),
    });
  }
}

export async function exportTransactions(
  transactions: Transaction[],
  format: ExportFormat = 'json',
  period?: ExportPeriod
) {
  const rows = filterByPeriod(transactions, period).map(toRow);
  if (rows.length === 0) {
    throw new Error(i18n.t('settings.sections.data.export.noTransactions'));
  }

  const file = buildFile(rows, format);
  const isBase64 = format === 'xlsx';
  const fileName = `pilar_backup_${new Date().toISOString().split('T')[0]}.${file.extension}`;

  if (Platform.OS === 'web') {
    downloadOnWeb(file, fileName, isBase64);
  } else {
    await shareOnDevice(file, fileName, isBase64);
  }
}
