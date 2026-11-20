import { writeFileSync } from 'node:fs';
import { buildSyntheticWorkbook } from '../packages/shared/tests/fixtures/buildSyntheticWorkbook.ts';
import {
  buildSnapshotsForUpload,
  getDashboard,
  mergeAccountsForUpload,
  parseWorkbook,
} from '../packages/shared/src/index.ts';

const buf = await buildSyntheticWorkbook();
writeFileSync('/tmp/zerorez-synthetic.xlsx', buf);

const parsed = await parseWorkbook(buf);
const now = new Date().toISOString();
const uploadId = 'local-verify';
const merged = mergeAccountsForUpload({
  existing: [],
  incoming: parsed.accounts,
  uploadId,
  nowIso: now,
});
const snapshots = buildSnapshotsForUpload({
  accounts: merged,
  uploadId,
  cutoffDate: '2026-11-18',
  stageMode: 'date',
});
const dash = getDashboard(
  {
    accounts: merged,
    uploads: [
      {
        id: uploadId,
        filename: 'zerorez-synthetic.xlsx',
        uploaded_at: now,
        uploaded_by: null,
        cutoff_date: '2026-11-18',
        stage_mode: 'date',
        rows_read: parsed.stats.rowsRead,
        rows_loaded: parsed.stats.rowsLoaded,
        warnings: parsed.warnings,
      },
    ],
    snapshots,
  },
  'all',
);

console.log(
  JSON.stringify(
    {
      file: '/tmp/zerorez-synthetic.xlsx',
      fileBytes: buf.length,
      rowsLoaded: parsed.stats.rowsLoaded,
      overdueAccounts: dash.kpis.overdueAccounts,
      overdueAmount: dash.kpis.overdueAmount,
      cutoffDate: dash.cutoffDate,
      stageLabels: dash.stages.map((s) => s.label),
    },
    null,
    2,
  ),
);
