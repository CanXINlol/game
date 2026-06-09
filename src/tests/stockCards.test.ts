import { describe, expect, it } from 'vitest';
import { STOCK_CARDS } from '../data/stockCards';
import type { Sector } from '../game/types';

const MVP_SECTORS: Sector[] = [
  'TECH',
  'CONSUMER',
  'MEDICAL',
  'ENERGY',
  'FINANCE'
];

describe('STOCK_CARDS', () => {
  it('contains 40 cards', () => {
    expect(STOCK_CARDS).toHaveLength(40);
  });

  it('uses unique ids', () => {
    const ids = STOCK_CARDS.map((card) => card.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('uses ranks from 1 to 10', () => {
    for (const card of STOCK_CARDS) {
      expect(card.rank).toBeGreaterThanOrEqual(1);
      expect(card.rank).toBeLessThanOrEqual(10);
    }
  });

  it('has at least 8 cards in each MVP sector', () => {
    for (const sector of MVP_SECTORS) {
      const count = STOCK_CARDS.filter((card) => card.sector === sector).length;

      expect(count).toBeGreaterThanOrEqual(8);
    }
  });
});
