import { describe, expect, it } from 'vitest';
import { FORMAL_EVENT_CARDS, FORMAL_EVENT_TOOLS } from '../game/formalContent';
import { createTestEventGameState } from '../game/playCard';
import { createCardPreview } from '../game/preview';

describe('card preview', () => {
  it('returns base profit and risk in Chinese preview data', () => {
    const card = FORMAL_EVENT_CARDS.find((item) => item.id === 'formal-tech-001');
    const state = createTestEventGameState();

    if (!card) throw new Error('Expected formal card.');

    const preview = createCardPreview(card, state);

    expect(preview.baseProfit).toBeGreaterThan(0);
    expect(preview.baseRisk).toBeGreaterThan(0);
    expect(preview.cardType).not.toBe('BUY');
  });

  it('detects Turboturn progress and interruption', () => {
    const zeroCost = FORMAL_EVENT_CARDS.find((card) => card.cost === 0);
    const twoCost = FORMAL_EVENT_CARDS.find((card) => card.cost === 2);
    const state = createTestEventGameState({ lastPlayedCost: 0 });

    if (!zeroCost || !twoCost) throw new Error('Expected preview cards.');

    expect(createCardPreview(twoCost, state).notes).toContain('会中断极速连锁');
    expect(createCardPreview(zeroCost, state).notes).toContain('可推进极速连锁');
  });

  it('detects possible MarketPressure clear', () => {
    const card = FORMAL_EVENT_CARDS.find((item) => item.id === 'formal-tech-001');
    const state = createTestEventGameState({
      marketPressure: {
        ...createTestEventGameState().marketPressure,
        hp: 5,
        shield: 0
      }
    });

    if (!card) throw new Error('Expected formal card.');

    expect(createCardPreview(card, state).notes).toContain('可能击穿市场压力');
  });

  it('lists possible tool triggers without exposing enum text', () => {
    const card = FORMAL_EVENT_CARDS.find((item) => item.id === 'formal-tech-003');
    const tool = FORMAL_EVENT_TOOLS.find(
      (item) => item.id === 'formal-tool-limit-up-calculator'
    );
    const state = createTestEventGameState({
      combo: {
        ...createTestEventGameState().combo,
        currentChainProfit: 20
      },
      tools: tool ? [tool] : []
    });

    if (!card || !tool) throw new Error('Expected preview card and tool.');

    const preview = createCardPreview(card, state);

    expect(preview.possibleTools).toContain('涨停板计算器');
    expect(JSON.stringify(preview)).not.toContain('LIMIT_UP');
  });
});
