import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import type { PortfolioState, SnapshotPostBody, SnapshotRecord, StageMode } from './types.js';
import { type SnapshotStore, newSnapshotId, toRecord } from './store.js';

const { Pool } = pg;

type Row = {
  id: string;
  created_at: Date | string;
  cutoff_date: string;
  stage_mode: string;
  filename: string | null;
  uploaded_at: Date | string;
  warnings: unknown;
  payload: unknown;
};

function iso(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toISOString();
}

function rowToRecord(row: Row): SnapshotRecord {
  const warnings = Array.isArray(row.warnings)
    ? (row.warnings as string[])
    : typeof row.warnings === 'string'
      ? (JSON.parse(row.warnings) as string[])
      : [];
  const payload = (
    typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload
  ) as PortfolioState;
  return {
    id: row.id,
    createdAt: iso(row.created_at),
    cutoffDate: row.cutoff_date,
    stageMode: row.stage_mode as StageMode,
    filename: row.filename,
    uploadedAt: iso(row.uploaded_at),
    warnings,
    payload: {
      accounts: payload.accounts ?? [],
      uploads: payload.uploads ?? [],
      snapshots: payload.snapshots ?? [],
    },
  };
}

function migrationSql(): string {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    // api/_lib → repo root migrations/
    const path = join(here, '..', '..', 'migrations', '001_create_snapshots.sql');
    return readFileSync(path, 'utf8');
  } catch {
    // Fallback inline (Vercel bundle may not include sibling SQL file).
    return `
CREATE TABLE IF NOT EXISTS snapshots (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cutoff_date TEXT NOT NULL,
  stage_mode TEXT NOT NULL,
  filename TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL,
  warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  payload JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS snapshots_created_at_idx ON snapshots (created_at DESC);
`;
  }
}

export class PgSnapshotStore implements SnapshotStore {
  private readonly pool: pg.Pool;
  private migrated = false;

  constructor(databaseUrl: string) {
    this.pool = new Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes('localhost') ? undefined : { rejectUnauthorized: false },
    });
  }

  private async ensureMigrated(): Promise<void> {
    if (this.migrated) return;
    await this.pool.query(migrationSql());
    this.migrated = true;
  }

  async getLatest(): Promise<SnapshotRecord | null> {
    await this.ensureMigrated();
    const result = await this.pool.query<Row>(
      `SELECT id, created_at, cutoff_date, stage_mode, filename, uploaded_at, warnings, payload
       FROM snapshots
       ORDER BY created_at DESC
       LIMIT 1`,
    );
    const row = result.rows[0];
    return row ? rowToRecord(row) : null;
  }

  async save(input: SnapshotPostBody): Promise<SnapshotRecord> {
    await this.ensureMigrated();
    const record = toRecord(input, newSnapshotId());
    await this.pool.query(
      `INSERT INTO snapshots
        (id, created_at, cutoff_date, stage_mode, filename, uploaded_at, warnings, payload)
       VALUES ($1, $2::timestamptz, $3, $4, $5, $6::timestamptz, $7::jsonb, $8::jsonb)`,
      [
        record.id,
        record.createdAt,
        record.cutoffDate,
        record.stageMode,
        record.filename,
        record.uploadedAt,
        JSON.stringify(record.warnings),
        JSON.stringify(record.payload),
      ],
    );
    return record;
  }

  async clearLatest(): Promise<boolean> {
    await this.ensureMigrated();
    const result = await this.pool.query(`DELETE FROM snapshots`);
    return (result.rowCount ?? 0) > 0;
  }

  async end(): Promise<void> {
    await this.pool.end();
  }
}

let pgSingleton: PgSnapshotStore | null = null;

export function getPgStore(databaseUrl: string): PgSnapshotStore {
  if (!pgSingleton) pgSingleton = new PgSnapshotStore(databaseUrl);
  return pgSingleton;
}
