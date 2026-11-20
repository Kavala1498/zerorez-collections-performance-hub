import ExcelJS from 'exceljs';
import { normalizeStatus, resolveBaseId, type Account, type Segment } from '@zerorez/shared';

export type ParseStats = {
  sheetsTotal: number;
  sheetsMatched: number;
  sheetsSkipped: number;
  rowsRead: number;
  rowsLoaded: number;
  rowsInvalid: number;
  rowsDuplicate: number;
};

export type ParseWorkbookResult = {
  accounts: Account[];
  warnings: string[];
  stats: ParseStats;
};

type HeaderMap = Record<string, number>;

/** Letters-only lowercase key for Excel headers / segment titles. */
export function normalizeHeaderKey(value: unknown): string {
  return String(value ?? '')
    .replace(/[^a-z]/gi, '')
    .toLowerCase();
}

function cellToPrimitive(value: unknown): unknown {
  if (value == null) return null;
  if (value instanceof Date) return value;
  if (typeof value !== 'object') return value;

  const obj = value as Record<string, unknown>;

  if ('richText' in obj && Array.isArray(obj.richText)) {
    return (obj.richText as Array<{ text?: string }>).map((part) => part.text ?? '').join('');
  }
  if ('text' in obj && obj.text != null) {
    return String(obj.text);
  }
  if ('result' in obj) {
    return cellToPrimitive(obj.result);
  }
  if ('hyperlink' in obj && 'text' in obj) {
    return String(obj.text ?? obj.hyperlink ?? '');
  }
  if ('formula' in obj && 'result' in obj) {
    return cellToPrimitive(obj.result);
  }
  return null;
}

function cellToString(value: unknown): string | null {
  const prim = cellToPrimitive(value);
  if (prim == null) return null;
  if (prim instanceof Date) return formatIsoDate(prim);
  const s = String(prim).trim();
  return s.length ? s : null;
}

function formatIsoDate(d: Date): string {
  // Midday nudge avoids timezone day-shift for date-only Excel values.
  const shifted = new Date(d.getTime() + 12 * 60 * 60 * 1000);
  const y = shifted.getFullYear();
  const m = String(shifted.getMonth() + 1).padStart(2, '0');
  const day = String(shifted.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function excelSerialToDate(serial: number): Date | null {
  if (!Number.isFinite(serial) || serial < 1) return null;
  // Excel epoch 1899-12-30 (with the 1900 leap-year bug baked in).
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseDate(value: unknown): Date | null {
  const prim = cellToPrimitive(value);
  if (prim == null) return null;
  if (prim instanceof Date && !Number.isNaN(prim.getTime())) return prim;
  if (typeof prim === 'number') return excelSerialToDate(prim);
  if (typeof prim === 'string') {
    const trimmed = prim.trim();
    if (!trimmed) return null;
    // Reject obvious non-dates (free text in next_action_date, etc.).
    if (!/\d/.test(trimmed)) return null;
    const d = new Date(trimmed);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

function parseAmount(value: unknown): number | null {
  const prim = cellToPrimitive(value);
  if (prim == null || prim === '') return null;
  if (typeof prim === 'number') {
    return Number.isFinite(prim) ? prim : null;
  }
  if (typeof prim === 'string') {
    const cleaned = prim.replace(/[$,\s]/g, '').trim();
    if (!cleaned) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function detectSegment(rowValues: unknown[]): Segment | null {
  const title = rowValues
    .slice(0, 3)
    .map((v) => cellToString(v))
    .filter(Boolean)
    .join(' ');
  if (!/^\s*(residen|commercial)/i.test(title)) return null;
  return /^\s*commercial/i.test(title) ? 'C' : 'R';
}

function buildHeaderMap(rowValues: unknown[]): HeaderMap | null {
  const first = normalizeHeaderKey(cellToPrimitive(rowValues[0]));
  if (first !== 'clientname') return null;
  const map: HeaderMap = {};
  rowValues.forEach((v, i) => {
    const key = normalizeHeaderKey(cellToPrimitive(v));
    if (key) map[key] = i;
  });
  return map;
}

function getByHeader(headers: HeaderMap, row: unknown[], ...keys: string[]): unknown {
  for (const key of keys) {
    const idx = headers[key];
    if (idx != null) return row[idx] ?? null;
  }
  return null;
}

function rowValues(row: ExcelJS.Row, colCount: number): unknown[] {
  const values: unknown[] = [];
  for (let c = 1; c <= colCount; c++) {
    values.push(row.getCell(c).value);
  }
  return values;
}

/**
 * Parse a Zerorez collections .xlsx buffer into standardized accounts.
 * Implements arquitectura rules 1–5 and 9 (tabs, segments, headers, validity,
 * dedupe, next_action_date text handling). Stage calculation is out of scope.
 */
export async function parseWorkbook(
  buffer: Buffer | ArrayBuffer | Uint8Array,
): Promise<ParseWorkbookResult> {
  const workbook = new ExcelJS.Workbook();
  const data =
    buffer instanceof ArrayBuffer
      ? Buffer.from(buffer)
      : Buffer.isBuffer(buffer)
        ? buffer
        : Buffer.from(buffer);

  // exceljs typings accept Buffer via ArrayBuffer-like input.
  await workbook.xlsx.load(data as unknown as ExcelJS.Buffer);

  const accounts: Account[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();
  const stats: ParseStats = {
    sheetsTotal: workbook.worksheets.length,
    sheetsMatched: 0,
    sheetsSkipped: 0,
    rowsRead: 0,
    rowsLoaded: 0,
    rowsInvalid: 0,
    rowsDuplicate: 0,
  };

  for (const sheet of workbook.worksheets) {
    const baseId = resolveBaseId(sheet.name);
    if (!baseId) {
      stats.sheetsSkipped += 1;
      warnings.push(`Skipped unknown sheet "${sheet.name}" (not in BASES aliases).`);
      continue;
    }
    stats.sheetsMatched += 1;

    let segment: Segment | null = null;
    let headers: HeaderMap | null = null;
    const colCount = Math.max(sheet.columnCount || 0, 20);

    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      const values = rowValues(row, colCount);

      const nextSeg = detectSegment(values);
      if (nextSeg) {
        segment = nextSeg;
        headers = null;
        return;
      }

      const nextHeaders = buildHeaderMap(values);
      if (nextHeaders) {
        headers = nextHeaders;
        return;
      }

      if (!headers || !segment) return;

      stats.rowsRead += 1;

      const clientRaw = getByHeader(headers, values, 'clientname');
      const clientName = cellToString(clientRaw);
      const serviceDate = parseDate(getByHeader(headers, values, 'servicedate'));
      const amountDue = parseAmount(getByHeader(headers, values, 'amountdue'));

      if (!clientName || !serviceDate || amountDue == null) {
        stats.rowsInvalid += 1;
        return;
      }

      // Discard obvious total / subtotal label rows.
      if (/^(total|subtotal|grandtotal)/i.test(normalizeHeaderKey(clientName))) {
        stats.rowsInvalid += 1;
        return;
      }

      const invoiceNumber = cellToString(getByHeader(headers, values, 'invoicenumber'));
      if (invoiceNumber) {
        const dedupeKey = `${baseId}|${invoiceNumber}`;
        if (seen.has(dedupeKey)) {
          stats.rowsDuplicate += 1;
          warnings.push(
            `Duplicate invoice ${invoiceNumber} in ${baseId} (row ${rowNumber}); keeping first.`,
          );
          return;
        }
        seen.add(dedupeKey);
      }

      const paidAmount = parseAmount(getByHeader(headers, values, 'paidamount')) ?? 0;

      const statusRaw = cellToString(getByHeader(headers, values, 'accstatus', 'accstattus'));
      const normalized = normalizeStatus(statusRaw);

      let nextAction = cellToString(getByHeader(headers, values, 'nextaction'));
      let nextActionDate: string | null = null;
      const nextActionDateRaw = getByHeader(headers, values, 'nextactiondate', 'nactiondate');
      if (
        nextActionDateRaw != null &&
        String(cellToPrimitive(nextActionDateRaw) ?? '').trim() !== ''
      ) {
        const asDate = parseDate(nextActionDateRaw);
        if (asDate) {
          nextActionDate = formatIsoDate(asDate);
        } else {
          const asText = cellToString(nextActionDateRaw);
          if (asText) {
            nextAction = nextAction ? `${nextAction}; ${asText}` : asText;
            warnings.push(
              `${baseId} row ${rowNumber}: next_action_date is text ("${asText}"); moved to next_action.`,
            );
          }
        }
      }

      const lastContactedRaw = getByHeader(headers, values, 'lastcontacted');
      const lastContactedDate = parseDate(lastContactedRaw);
      const lastContacted = lastContactedDate
        ? formatIsoDate(lastContactedDate)
        : cellToString(lastContactedRaw);

      const id = invoiceNumber ? `${baseId}|${invoiceNumber}` : `${baseId}|__row_${rowNumber}`;

      const account: Account = {
        id,
        base: baseId,
        segment,
        client_name: clientName,
        company_name: cellToString(getByHeader(headers, values, 'companyname')),
        service_date: formatIsoDate(serviceDate),
        amount_due: amountDue,
        paid_amount: paidAmount,
        invoice_number: invoiceNumber,
        client_url: cellToString(getByHeader(headers, values, 'clienturl')),
        invoice_url: cellToString(getByHeader(headers, values, 'invoiceurl')),
        technician: cellToString(getByHeader(headers, values, 'technician')),
        status: normalized ?? statusRaw,
        accountability: cellToString(getByHeader(headers, values, 'accountability')),
        terms: cellToString(getByHeader(headers, values, 'terms')),
        last_contacted: lastContacted,
        next_action: nextAction,
        next_action_date: nextActionDate,
        acc_notes: cellToString(getByHeader(headers, values, 'accnotes')),
        bm_notes: cellToString(getByHeader(headers, values, 'bmnotes')),
      };

      accounts.push(account);
      stats.rowsLoaded += 1;
    });
  }

  return { accounts, warnings, stats };
}
