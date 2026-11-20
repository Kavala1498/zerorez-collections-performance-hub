export type BaseDefinition = {
  id: string;
  name: string;
  aliases: string[];
};

/** Catalog of the 14 Zerorez collection bases. */
export const BASES: readonly BaseDefinition[] = [
  {
    id: 'BayArea',
    name: 'Bay Area',
    aliases: ['Bay Area', 'BayArea', 'SF Bay', 'San Francisco Bay'],
  },
  {
    id: 'Dallas',
    name: 'Dallas',
    aliases: ['Dallas', 'DFW', 'Dallas Fort Worth'],
  },
  {
    id: 'Denver',
    name: 'Denver',
    aliases: ['Denver', 'DEN'],
  },
  {
    id: 'Indianapolis',
    name: 'Indianapolis',
    aliases: ['Indianapolis', 'Indy', 'IND'],
  },
  {
    id: 'Jacksonville',
    name: 'Jacksonville',
    aliases: ['Jacksonville', 'Jax', 'JAX'],
  },
  {
    id: 'Minnesota',
    name: 'Minnesota',
    aliases: ['Minnesota', 'Minneapolis', 'MSP', 'Twin Cities'],
  },
  {
    id: 'Phoenix',
    name: 'Phoenix',
    aliases: ['Phoenix', 'PHX'],
  },
  {
    id: 'Pittsburgh',
    name: 'Pittsburgh',
    aliases: ['Pittsburgh', 'PIT'],
  },
  {
    id: 'Raleigh',
    name: 'Raleigh',
    aliases: ['Raleigh', 'RDU'],
  },
  {
    id: 'SaltLakeCity',
    name: 'Salt Lake City',
    aliases: ['Salt Lake City', 'SLC', 'Salt Lake', 'SaltLake', 'SaltLakeCity'],
  },
  {
    id: 'SoCal',
    name: 'SoCal',
    aliases: ['SoCal', 'Southern California', 'South California', 'LA'],
  },
  {
    id: 'Spokane',
    name: 'Spokane',
    aliases: ['Spokane', 'GEG'],
  },
  {
    id: 'St.Louis',
    name: 'St. Louis',
    aliases: ['St. Louis', 'St Louis', 'Saint Louis', 'STL', 'St.Louis'],
  },
  {
    id: 'Tulsa',
    name: 'Tulsa',
    aliases: ['Tulsa', 'TUL'],
  },
] as const;

export const BASE_IDS = BASES.map((b) => b.id);

/** Normalize a sheet/tab name for base matching (letters only, lowercase). */
export function normalizeBaseKey(value: string): string {
  return String(value || '')
    .replace(/[^a-z]/gi, '')
    .toLowerCase();
}

/** Resolve a tab or alias string to a base id, or null if unknown. */
export function resolveBaseId(raw: string): string | null {
  const key = normalizeBaseKey(raw);
  if (!key) return null;
  for (const base of BASES) {
    const candidates = [base.id, base.name, ...base.aliases];
    if (candidates.some((c) => normalizeBaseKey(c) === key)) {
      return base.id;
    }
  }
  return null;
}
