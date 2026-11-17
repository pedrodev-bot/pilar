import { randomUUID } from 'expo-crypto';
import i18n from '../locales/i18n';

export type TransactionType = 'expense' | 'income' | 'investment';

export interface ImportedTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string | null;
  tags: string[];
  payment_method: string | null;
  installments: number | null;
  notes: string | null;
  mood: string | null;
  vault_id: string | null;
  shared_with: string[];
  is_recurring: boolean;
  warranty_end: string | null;
}

export interface InvalidRecord {
  line: number;
  reason: string;
}

export interface ParseReport {
  records: ImportedTransaction[];
  invalid: InvalidRecord[];
  skippedDeleted: number;
  total: number;
}

const VALID_TYPES: Record<string, TransactionType> = {
  expense: 'expense',
  income: 'income',
  investment: 'investment',
  despesa: 'expense',
  receita: 'income',
  investimento: 'investment',
};

const REQUIRED_COLUMNS = ['date', 'description', 'amount', 'type'];

type RawRecord = Record<string, unknown>;

export function parseBackup(content: string): ParseReport {
  const text = content.replace(/^\uFEFF/, '').trim();
  if (!text) throw new Error(i18n.t('settings.sections.data.import.errors.empty'));

  const isJson = text.startsWith('[') || text.startsWith('{');
  const rawRecords = isJson ? readJson(text) : readCsv(text);
  return normalizeAll(rawRecords);
}

function readJson(text: string): RawRecord[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(i18n.t('settings.sections.data.import.errors.jsonCorrupt'));
  }

  const list = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as { transactions?: unknown })?.transactions)
      ? (parsed as { transactions: unknown[] }).transactions
      : null;

  if (!list) throw new Error(i18n.t('settings.sections.data.import.errors.jsonUnrecognized'));
  return list.map((item) => (item && typeof item === 'object' ? (item as RawRecord) : {}));
}

function readCsv(text: string): RawRecord[] {
  const rows = parseCsvRows(text);
  if (rows.length === 0) throw new Error(i18n.t('settings.sections.data.import.errors.csvEmpty'));

  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const missing = REQUIRED_COLUMNS.filter((c) => !headers.includes(c));
  if (missing.length > 0) {
    throw new Error(i18n.t('settings.sections.data.import.errors.csvMissingColumns', { columns: missing.join(', ') }));
  }

  return rows.slice(1).map((cells) => {
    const obj: RawRecord = {};
    headers.forEach((h, i) => {
      obj[h] = cells[i] ?? '';
    });
    return obj;
  });
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }

  row.push(field);
  if (row.some((c) => c.trim() !== '')) rows.push(row);
  return rows;
}

function normalizeAll(rawRecords: RawRecord[]): ParseReport {
  const report: ParseReport = { records: [], invalid: [], skippedDeleted: 0, total: rawRecords.length };

  rawRecords.forEach((raw, index) => {
    const line = index + 1;

    if (toBoolean(raw.deleted)) {
      report.skippedDeleted++;
      return;
    }

    const result = normalizeOne(raw);
    if ('error' in result) {
      report.invalid.push({ line, reason: result.error });
    } else {
      report.records.push(result.record);
    }
  });

  return report;
}

function normalizeOne(raw: RawRecord): { record: ImportedTransaction } | { error: string } {
  const type = VALID_TYPES[String(raw.type ?? '').trim().toLowerCase()];
  if (!type) return { error: `tipo inválido: "${String(raw.type ?? '')}"` };

  const amount = toAmount(raw.amount);
  if (amount === null || amount <= 0) return { error: `valor inválido: "${String(raw.amount ?? '')}"` };

  const date = toIsoDate(raw.date);
  if (!date) return { error: `data inválida: "${String(raw.date ?? '')}"` };

  return {
    record: {
      id: toText(raw.id) ?? randomUUID(),
      date,
      description: toText(raw.description) ?? i18n.t('settings.sections.data.import.noDescription'),
      amount,
      type,
      category: toText(raw.category),
      tags: toList(raw.tags),
      payment_method: toText(raw.payment_method),
      installments: toInteger(raw.installments),
      notes: toText(raw.notes),
      mood: toText(raw.mood),
      vault_id: toText(raw.vault_id),
      shared_with: toList(raw.shared_with),
      is_recurring: toBoolean(raw.is_recurring),
      warranty_end: toText(raw.warranty_end),
    },
  };
}

function toText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s === '' ? null : s;
}

function toBoolean(value: unknown): boolean {
  return value === true || String(value ?? '').trim().toLowerCase() === 'true';
}

function toInteger(value: unknown): number | null {
  const s = toText(value);
  if (s === null) return null;
  const n = Number(s);
  return Number.isInteger(n) ? n : null;
}

function toAmount(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
  const s = toText(value);
  if (s === null) return null;
  const normalized = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
  const n = Number(normalized);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

function toList(value: unknown): string[] {
  const items = Array.isArray(value) ? value : typeof value === 'string' ? value.split(';') : [];
  return items.map((v) => String(v).trim()).filter(Boolean);
}

function toIsoDate(value: unknown): string | null {
  const s = toText(value);
  if (s === null) return null;

  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const d = br ? new Date(`${br[3]}-${br[2]}-${br[1]}T12:00:00.000Z`) : new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}