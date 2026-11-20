import { getEnv } from '../config/env.js';
import type { AccountsRepository } from './AccountsRepository.js';
import { InMemoryAccountsRepository } from './InMemoryAccountsRepository.js';
import { SheetsAccountsRepository } from './SheetsAccountsRepository.js';

export function createRepository(): AccountsRepository {
  const env = getEnv();
  if (env.REPOSITORY === 'memory' || env.NODE_ENV === 'test') {
    return new InMemoryAccountsRepository(env.CACHE_TTL_MS);
  }
  return new SheetsAccountsRepository(undefined, env.CACHE_TTL_MS);
}
