import { google, type sheets_v4 } from 'googleapis';
import { JWT } from 'google-auth-library';
import type { Account, AccountChange, Snapshot, Upload } from '@zerorez/shared';
import { AppError } from '../errors/AppError.js';
import { expandPrivateKey, getEnv } from '../config/env.js';
import type {
  AccountsRepository,
  HealthStatus,
  PersistAccountPatchPayload,
  PersistUploadPayload,
} from './AccountsRepository.js';
import {
  ACCOUNT_COLUMNS,
  accountChangeToRow,
  accountToRow,
  rowToAccount,
  rowToAccountChange,
  rowToSnapshot,
  rowToUpload,
  snapshotToRow,
  uploadToRow,
} from './sheetColumns.js';
import { TtlCache } from './ttlCache.js';

export type SheetsCredentials = {
  spreadsheetId: string;
  clientEmail: string;
  privateKey: string;
};

function resolveCredentials(): SheetsCredentials {
  const env = getEnv();
  const spreadsheetId = env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new AppError(
      'SHEETS_ERROR',
      'GOOGLE_SHEETS_SPREADSHEET_ID is required for Sheets repository',
      500,
    );
  }

  const clientEmail = env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = expandPrivateKey(env.GOOGLE_PRIVATE_KEY);
  if (clientEmail && privateKey) {
    return { spreadsheetId, clientEmail, privateKey };
  }

  throw new AppError(
    'SHEETS_ERROR',
    'Missing Google Sheets credentials (GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY)',
    500,
  );
}

/**
 * Google Sheets-backed repository. Reads/writes in bulk; caches for CACHE_TTL_MS.
 */
export class SheetsAccountsRepository implements AccountsRepository {
  private readonly sheets: sheets_v4.Sheets;
  private readonly spreadsheetId: string;
  private readonly accountsCache: TtlCache<Account[]>;
  private readonly uploadsCache: TtlCache<Upload[]>;
  private readonly snapshotsCache: TtlCache<Snapshot[]>;

  constructor(
    credentials?: SheetsCredentials,
    ttlMs = getEnv().CACHE_TTL_MS,
    sheetsClient?: sheets_v4.Sheets,
  ) {
    const creds = credentials ?? resolveCredentials();
    this.spreadsheetId = creds.spreadsheetId;
    this.accountsCache = new TtlCache(ttlMs);
    this.uploadsCache = new TtlCache(ttlMs);
    this.snapshotsCache = new TtlCache(ttlMs);

    if (sheetsClient) {
      this.sheets = sheetsClient;
    } else {
      const auth = new JWT({
        email: creds.clientEmail,
        key: creds.privateKey,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      this.sheets = google.sheets({ version: 'v4', auth });
    }
  }

  async listAccounts(): Promise<Account[]> {
    const cached = this.accountsCache.get();
    if (cached) return structuredClone(cached);
    const rows = await this.readDataRows('accounts');
    const accounts = rows.map(rowToAccount).filter((a) => a.id);
    this.accountsCache.set(accounts);
    return structuredClone(accounts);
  }

  async listUploads(): Promise<Upload[]> {
    const cached = this.uploadsCache.get();
    if (cached) return structuredClone(cached);
    const rows = await this.readDataRows('uploads');
    const uploads = rows.map(rowToUpload).filter((u) => u.id);
    this.uploadsCache.set(uploads);
    return structuredClone(uploads);
  }

  async listSnapshots(): Promise<Snapshot[]> {
    const cached = this.snapshotsCache.get();
    if (cached) return structuredClone(cached);
    const rows = await this.readDataRows('snapshots');
    const snapshots = rows.map(rowToSnapshot).filter((s) => s.upload_id);
    this.snapshotsCache.set(snapshots);
    return structuredClone(snapshots);
  }

  async listAccountChanges(accountId?: string): Promise<AccountChange[]> {
    const rows = await this.readDataRows('account_changes');
    const changes = rows.map(rowToAccountChange).filter((c) => c.id && c.account_id);
    if (!accountId) return changes;
    return changes.filter((c) => c.account_id === accountId);
  }

  async persistUpload(payload: PersistUploadPayload): Promise<void> {
    const accountValues = [[...ACCOUNT_COLUMNS], ...payload.accounts.map(accountToRow)];
    const uploadRow = uploadToRow(payload.upload);
    const snapshotRows = payload.snapshots.map(snapshotToRow);

    try {
      // Clear + rewrite accounts so removed/resolved rows do not linger.
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range: 'accounts!A:ZZ',
      });
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: 'accounts!A1',
        valueInputOption: 'RAW',
        requestBody: { values: accountValues },
      });

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'uploads!A:I',
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: [uploadRow] },
      });

      if (snapshotRows.length) {
        await this.sheets.spreadsheets.values.append({
          spreadsheetId: this.spreadsheetId,
          range: 'snapshots!A:G',
          valueInputOption: 'RAW',
          insertDataOption: 'INSERT_ROWS',
          requestBody: { values: snapshotRows },
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sheets write failed';
      throw new AppError('SHEETS_ERROR', message, 502);
    }

    this.invalidateCache();
  }

  async persistAccountPatch(payload: PersistAccountPatchPayload): Promise<void> {
    const accounts = await this.listAccounts();
    const idx = accounts.findIndex((a) => a.id === payload.account.id);
    if (idx < 0) {
      throw new AppError('NOT_FOUND', `Account not found: ${payload.account.id}`, 404);
    }
    const next = [...accounts];
    next[idx] = structuredClone(payload.account);
    const accountValues = [[...ACCOUNT_COLUMNS], ...next.map(accountToRow)];
    const changeRows = payload.changes.map(accountChangeToRow);

    try {
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range: 'accounts!A:ZZ',
      });
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: 'accounts!A1',
        valueInputOption: 'RAW',
        requestBody: { values: accountValues },
      });

      if (changeRows.length) {
        await this.sheets.spreadsheets.values.append({
          spreadsheetId: this.spreadsheetId,
          range: 'account_changes!A:E',
          valueInputOption: 'RAW',
          insertDataOption: 'INSERT_ROWS',
          requestBody: { values: changeRows },
        });
      }
    } catch (err) {
      if (err instanceof AppError) throw err;
      const message = err instanceof Error ? err.message : 'Sheets write failed';
      throw new AppError('SHEETS_ERROR', message, 502);
    }

    this.invalidateCache();
  }

  async healthCheck(): Promise<HealthStatus> {
    try {
      await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
        fields: 'spreadsheetId,properties.title',
      });
      return {
        ok: true,
        repository: 'sheets',
        spreadsheetId: this.spreadsheetId,
        message: 'Google Sheets reachable',
      };
    } catch (err) {
      return {
        ok: false,
        repository: 'sheets',
        spreadsheetId: this.spreadsheetId,
        message: err instanceof Error ? err.message : 'Sheets unreachable',
      };
    }
  }

  invalidateCache(): void {
    this.accountsCache.invalidate();
    this.uploadsCache.invalidate();
    this.snapshotsCache.invalidate();
  }

  private async readDataRows(tab: string): Promise<string[][]> {
    try {
      const res = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${tab}!A:ZZ`,
        majorDimension: 'ROWS',
      });
      const values = (res.data.values ?? []) as string[][];
      if (values.length <= 1) return [];
      return values.slice(1).map((row) => row.map((c) => (c == null ? '' : String(c))));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sheets read failed';
      throw new AppError('SHEETS_ERROR', message, 502);
    }
  }
}
