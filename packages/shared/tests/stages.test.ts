import { describe, expect, it } from 'vitest';
import {
  DEFAULT_STAGE_WINDOWS,
  STAGES,
  getStage,
  stageFromAgingLabel,
  stageFromDays,
  type StageWindow,
} from '../src/stages.js';

describe('STAGES catalog', () => {
  it('defines 5 stages with labels, actions, and brand colors', () => {
    expect(STAGES).toHaveLength(5);
    expect(STAGES.map((s) => s.label)).toEqual([
      '0–14 DPD',
      '15–29 DPD',
      '30–48 DPD',
      '49–63 DPD',
      'Over 63 DPD',
    ]);
    expect(STAGES.map((s) => s.color)).toEqual([
      '#8FBF8A',
      '#F4B26E',
      '#E8923A',
      '#E06A6A',
      '#C8412A',
    ]);
    for (const stage of STAGES) {
      expect(stage.responsibleAction.length).toBeGreaterThan(0);
    }
  });

  it('exposes default windows 0–14, 15–29, 30–48, 49–63, 64+', () => {
    expect(DEFAULT_STAGE_WINDOWS).toEqual([
      { min: 0, max: 14, stage: 1 },
      { min: 15, max: 29, stage: 2 },
      { min: 30, max: 48, stage: 3 },
      { min: 49, max: 63, stage: 4 },
      { min: 64, max: null, stage: 5 },
    ]);
  });
});

describe('stageFromDays', () => {
  it('returns null for negative days (not overdue)', () => {
    expect(stageFromDays(-1)).toBeNull();
    expect(stageFromDays(-30)).toBeNull();
  });

  it('maps inclusive default windows', () => {
    expect(stageFromDays(0)).toBe(1);
    expect(stageFromDays(14)).toBe(1);
    expect(stageFromDays(15)).toBe(2);
    expect(stageFromDays(29)).toBe(2);
    expect(stageFromDays(30)).toBe(3);
    expect(stageFromDays(48)).toBe(3);
    expect(stageFromDays(49)).toBe(4);
    expect(stageFromDays(63)).toBe(4);
    expect(stageFromDays(64)).toBe(5);
    expect(stageFromDays(120)).toBe(5);
  });

  it('respects custom windows', () => {
    const custom: StageWindow[] = [
      { min: 0, max: 10, stage: 1 },
      { min: 11, max: null, stage: 2 },
    ];
    expect(stageFromDays(10, custom)).toBe(1);
    expect(stageFromDays(11, custom)).toBe(2);
    expect(stageFromDays(-1, custom)).toBeNull();
  });

  it('returns null for non-finite days', () => {
    expect(stageFromDays(Number.NaN)).toBeNull();
  });
});

describe('stageFromAgingLabel', () => {
  it('maps product and legacy aging labels', () => {
    expect(stageFromAgingLabel('0 to 14')).toBe(1);
    expect(stageFromAgingLabel('15 to 29')).toBe(2);
    expect(stageFromAgingLabel('30 to 48')).toBe(3);
    expect(stageFromAgingLabel('49 to 63')).toBe(4);
    expect(stageFromAgingLabel('Over 63')).toBe(5);
    expect(stageFromAgingLabel('16 to 30')).toBe(2);
    expect(stageFromAgingLabel('Over 60')).toBe(5);
    expect(stageFromAgingLabel('')).toBeNull();
  });
});

describe('getStage', () => {
  it('returns the stage definition by id', () => {
    expect(getStage(5).label).toBe('Over 63 DPD');
  });
});
