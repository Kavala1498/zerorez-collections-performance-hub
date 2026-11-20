/**
 * Bootstrap a Google Spreadsheet with the tabs/columns required by the CRM.
 *
 * Usage:
 *   pnpm --filter @zerorez/api setup-sheets
 *
 * Requires GOOGLE_SHEETS_SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL,
 * and GOOGLE_PRIVATE_KEY (see .env.example). The service account must have
 * Editor access to the spreadsheet.
 */
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { BASES, DEFAULT_STAGE_WINDOWS } from '@zerorez/shared';
import { expandPrivateKey, getEnv } from '../src/config/env.js';
import {
  ACCOUNT_CHANGE_COLUMNS,
  ACCOUNT_COLUMNS,
  BASE_COLUMNS,
  SETTINGS_COLUMNS,
  SHEET_TABS,
  SNAPSHOT_COLUMNS,
  UPLOAD_COLUMNS,
} from '../src/repositories/sheetColumns.js';

async function main(): Promise<void> {
  const env = getEnv();
  const spreadsheetId = env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const email = env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = expandPrivateKey(env.GOOGLE_PRIVATE_KEY);

  if (!spreadsheetId || !email || !privateKey) {
    throw new Error(
      'Set GOOGLE_SHEETS_SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, and GOOGLE_PRIVATE_KEY',
    );
  }

  const auth = new JWT({
    email,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existing = new Map(
    (meta.data.sheets ?? []).map((s) => [s.properties?.title ?? '', s.properties?.sheetId ?? 0]),
  );

  const requests: object[] = [];
  for (const tab of SHEET_TABS) {
    if (!existing.has(tab)) {
      requests.push({ addSheet: { properties: { title: tab } } });
    }
  }
  if (requests.length) {
    const created = SHEET_TABS.filter((t) => !existing.has(t));
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });
    console.log(`Created tabs: ${created.join(', ')}`);
  } else {
    console.log('All required tabs already exist.');
  }

  const baseRows = BASES.map((b) => [b.id, b.name, b.aliases.join('|')]);
  const settingsRows = [
    ['stage_windows', JSON.stringify(DEFAULT_STAGE_WINDOWS)],
    ['amount_basis', 'gross'],
    [
      'base_aliases',
      JSON.stringify(Object.fromEntries(BASES.map((b) => [b.id, b.aliases]))),
    ],
  ];

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'RAW',
      data: [
        { range: 'accounts!A1', values: [[...ACCOUNT_COLUMNS]] },
        { range: 'bases!A1', values: [[...BASE_COLUMNS], ...baseRows] },
        { range: 'uploads!A1', values: [[...UPLOAD_COLUMNS]] },
        { range: 'snapshots!A1', values: [[...SNAPSHOT_COLUMNS]] },
        { range: 'settings!A1', values: [[...SETTINGS_COLUMNS], ...settingsRows] },
        { range: 'account_changes!A1', values: [[...ACCOUNT_CHANGE_COLUMNS]] },
      ],
    },
  });

  console.log(
    `Spreadsheet ${spreadsheetId} is ready (accounts/bases/uploads/snapshots/settings/account_changes).`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
