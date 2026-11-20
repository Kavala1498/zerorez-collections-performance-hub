import { readEnv } from './env.js';
import { getMemoryStore, type MemorySnapshotStore } from './memoryStore.js';
import { getPgStore, type PgSnapshotStore } from './pgStore.js';
import type { SnapshotStore } from './store.js';

export function createSnapshotStore(
  env = readEnv(),
): SnapshotStore | MemorySnapshotStore | PgSnapshotStore {
  if (env.databaseUrl) {
    return getPgStore(env.databaseUrl);
  }
  return getMemoryStore();
}
