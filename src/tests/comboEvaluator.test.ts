import { describe, expect, it } from 'vitest';
import { evaluateCombo } from '../game/comboEvaluator';
import type { RiskLevel, Sector, StockCard } from '../game/types';

function card(
  id: string,
  rank: number,
  sector: Sector = 'TECH',
  risk: RiskLevel = 'medium'
): StockCard {
  return {
    id,
    name: `测试牌-${id}`,
    sector,
    rank,
    risk,
    tags: [],
    baseReturn: 10,
    baseRisk: 10,
    description: '测试用虚构股票牌。'
  };
}

describe('evaluateCombo', () => {
  it('recognizes NORMAL 普通持仓', () => {
    const combo = evaluateCombo([
      card('a', 1, 'TECH'),
      card('b', 3, 'CONSUMER'),
      card('c', 5, 'MEDICAL'),
      card('d', 7, 'ENERGY'),
      card('e', 9, 'FINANCE')
    ]);

    expect(combo.comboType).toBe('NORMAL');
  });

  it('recognizes PAIR 双龙头', () => {
    const combo = evaluateCombo([
      card('a', 4, 'TECH'),
      card('b', 4, 'CONSUMER'),
      card('c', 6, 'MEDICAL'),
      card('d', 8, 'ENERGY'),
      card('e', 10, 'FINANCE')
    ]);

    expect(combo.comboType).toBe('PAIR');
  });

  it('recognizes THREE 主力控盘', () => {
    const combo = evaluateCombo([
      card('a', 6, 'TECH'),
      card('b', 6, 'CONSUMER'),
      card('c', 6, 'MEDICAL'),
      card('d', 8, 'ENERGY'),
      card('e', 10, 'FINANCE')
    ]);

    expect(combo.comboType).toBe('THREE');
  });

  it('recognizes FOUR 垄断行情', () => {
    const combo = evaluateCombo([
      card('a', 8, 'TECH'),
      card('b', 8, 'CONSUMER'),
      card('c', 8, 'MEDICAL'),
      card('d', 8, 'ENERGY'),
      card('e', 10, 'FINANCE')
    ]);

    expect(combo.comboType).toBe('FOUR');
  });

  it('recognizes STRAIGHT 趋势通道', () => {
    const combo = evaluateCombo([
      card('a', 2, 'TECH'),
      card('b', 3, 'CONSUMER'),
      card('c', 4, 'MEDICAL'),
      card('d', 5, 'ENERGY'),
      card('e', 6, 'FINANCE')
    ]);

    expect(combo.comboType).toBe('STRAIGHT');
  });

  it('recognizes SAME_SECTOR 板块共振', () => {
    const combo = evaluateCombo([
      card('a', 1, 'MEDICAL'),
      card('b', 3, 'MEDICAL'),
      card('c', 5, 'MEDICAL'),
      card('d', 7, 'MEDICAL'),
      card('e', 9, 'MEDICAL')
    ]);

    expect(combo.comboType).toBe('SAME_SECTOR');
  });

  it('recognizes FULL_HOUSE 产业链闭环', () => {
    const combo = evaluateCombo([
      card('a', 3, 'TECH'),
      card('b', 3, 'CONSUMER'),
      card('c', 3, 'MEDICAL'),
      card('d', 9, 'ENERGY'),
      card('e', 9, 'FINANCE')
    ]);

    expect(combo.comboType).toBe('FULL_HOUSE');
  });

  it('recognizes SECTOR_STRAIGHT 超级主线', () => {
    const combo = evaluateCombo([
      card('a', 4, 'ENERGY'),
      card('b', 5, 'ENERGY'),
      card('c', 6, 'ENERGY'),
      card('d', 7, 'ENERGY'),
      card('e', 8, 'ENERGY')
    ]);

    expect(combo.comboType).toBe('SECTOR_STRAIGHT');
  });

  it('recognizes HIGH_RISK_BASKET 妖股抱团', () => {
    const combo = evaluateCombo([
      card('a', 1, 'TECH', 'high'),
      card('b', 3, 'CONSUMER', 'high'),
      card('c', 5, 'MEDICAL', 'extreme'),
      card('d', 7, 'ENERGY', 'high'),
      card('e', 9, 'FINANCE', 'high')
    ]);

    expect(combo.comboType).toBe('HIGH_RISK_BASKET');
  });

  it('recognizes LOW_RISK_BASKET 价值投资', () => {
    const combo = evaluateCombo([
      card('a', 1, 'TECH', 'low'),
      card('b', 3, 'CONSUMER', 'low'),
      card('c', 5, 'MEDICAL', 'low'),
      card('d', 7, 'ENERGY', 'low'),
      card('e', 9, 'FINANCE', 'low')
    ]);

    expect(combo.comboType).toBe('LOW_RISK_BASKET');
  });

  it('uses SECTOR_STRAIGHT priority over SAME_SECTOR and STRAIGHT', () => {
    const combo = evaluateCombo([
      card('a', 1, 'FINANCE'),
      card('b', 2, 'FINANCE'),
      card('c', 3, 'FINANCE'),
      card('d', 4, 'FINANCE'),
      card('e', 5, 'FINANCE')
    ]);

    expect(combo.comboType).toBe('SECTOR_STRAIGHT');
  });

  it('throws when the input is not exactly 5 cards', () => {
    expect(() => evaluateCombo([card('a', 1)])).toThrow(
      'evaluateCombo expects exactly 5 cards.'
    );
  });
});
