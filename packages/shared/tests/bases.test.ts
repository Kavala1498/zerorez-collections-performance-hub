import { describe, expect, it } from 'vitest';
import { BASES, BASE_IDS, normalizeBaseKey, resolveBaseId } from '../src/bases.js';

describe('BASES catalog', () => {
  it('contains exactly 14 bases with id, name, and aliases', () => {
    expect(BASES).toHaveLength(14);
    expect(BASE_IDS).toHaveLength(14);
    for (const base of BASES) {
      expect(base.id).toBeTruthy();
      expect(base.name).toBeTruthy();
      expect(Array.isArray(base.aliases)).toBe(true);
      expect(base.aliases.length).toBeGreaterThan(0);
    }
  });

  it('includes the expected base ids', () => {
    expect(BASE_IDS).toEqual([
      'BayArea',
      'Dallas',
      'Denver',
      'Indianapolis',
      'Jacksonville',
      'Minnesota',
      'Phoenix',
      'Pittsburgh',
      'Raleigh',
      'SaltLakeCity',
      'SoCal',
      'Spokane',
      'St.Louis',
      'Tulsa',
    ]);
  });

  it('lists Salt Lake City / SLC aliases for SaltLakeCity', () => {
    const slc = BASES.find((b) => b.id === 'SaltLakeCity');
    expect(slc?.aliases).toEqual(
      expect.arrayContaining(['Salt Lake City', 'SLC', 'Salt Lake', 'SaltLake']),
    );
  });
});

describe('normalizeBaseKey', () => {
  it('strips non-letters and lowercases', () => {
    expect(normalizeBaseKey('Salt Lake City')).toBe('saltlakecity');
    expect(normalizeBaseKey('St. Louis')).toBe('stlouis');
    expect(normalizeBaseKey('')).toBe('');
  });
});

describe('resolveBaseId', () => {
  it('resolves ids, names, and aliases', () => {
    expect(resolveBaseId('SaltLakeCity')).toBe('SaltLakeCity');
    expect(resolveBaseId('Salt Lake City')).toBe('SaltLakeCity');
    expect(resolveBaseId('SLC')).toBe('SaltLakeCity');
    expect(resolveBaseId('St. Louis')).toBe('St.Louis');
    expect(resolveBaseId('Bay Area')).toBe('BayArea');
  });

  it('returns null for unknown tabs', () => {
    expect(resolveBaseId('Richmond')).toBeNull();
    expect(resolveBaseId('')).toBeNull();
  });
});
