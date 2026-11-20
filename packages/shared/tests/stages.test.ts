import { describe, expect, it } from 'vitest';
import {
  DEFAULT_STAGE_WINDOWS,
  STAGES,
  getStage,
  stageFromDays,
  type StageWindow,
} from '../src/stages.js';

describe('STAGES catalog', () => {
  it('defines 5 stages with labels, actions, and brand colors', () => {
    expect(STAGES).toHaveLength(5);
    expect(STAGES.map((s) => s.label)).toEqual([
      '1–15 DPD',
      '16–30 DPD',
      '31–45 DPD',
      '46–60 DPD',
      'Over 61 DPD',
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

  it('exposes default windows 0–15, 16–30, 31–45, 46–60, 61+', () => {
    expect(DEFAULT_STAGE_WINDOWS).toEqual([
      { min: 0, max: 15, stage: 1 },
      { min: 16, max: 30, stage: 2 },
      { min: 31, max: 45, stage: 3 },
      { min: 46, max: 60, stage: 4 },
      { min: 61, max: null, stage: 5 },
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
    expect(stageFromDays(15)).toBe(1);
    expect(stageFromDays(16)).toBe(2);
    expect(stageFromDays(30)).toBe(2);
    expect(stageFromDays(31)).toBe(3);
    expect(stageFromDays(45)).toBe(3);
    expect(stageFromDays(46)).toBe(4);
    expect(stageFromDays(60)).toBe(4);
    expect(stageFromDays(61)).toBe(5);
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

describe('getStage', () => {
  it('returns the stage definition by id', () => {
    expect(getStage(5).label).toBe('Over 61 DPD');
  });
});
