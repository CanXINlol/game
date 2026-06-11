import { describe, expect, it } from 'vitest';
import { applyDayChoice } from '../game/dayChoices';
import { createTestEventGameState, playCard } from '../game/playCard';
import { applyRunFailureConditions } from '../game/routeMap';

describe('cash, floating profit, locked profit, and risk tension', () => {
  it('playing cards mainly increases FloatingProfit', () => {
    const state = createTestEventGameState({
      hand: [createTestEventGameState().hand[0]]
    });

    const nextState = playCard(state, 'test-card-tech-buy');

    expect(nextState.combo.currentChainProfit).toBeGreaterThan(0);
    expect(nextState.cash).toBe(120);
  });

  it('cash out converts FloatingProfit into Cash and locked profit', () => {
    const state = createDayEndState(100);
    const cashBefore = state.cash;

    applyDayChoice(state, 'cashOut');

    expect(state.cash).toBe(cashBefore + 70);
    expect(state.lockedProfit).toBe(70);
    expect(state.combo.currentChainProfit).toBe(30);
  });

  it('continue trading raises risk and the active reward multiplier', () => {
    const state = createDayEndState(100);
    const multiplierBefore = state.profitMultiplier;

    applyDayChoice(state, 'continueTrading');

    expect(state.risk).toBe(15);
    expect(state.profitMultiplier).toBeGreaterThan(multiplierBefore);
    expect(state.combo.currentChainProfit).toBe(100);
  });

  it('bankruptcy loses all unprotected FloatingProfit first', () => {
    const state = createTestEventGameState({
      risk: 100,
      maxRisk: 100,
      combo: {
        ...createTestEventGameState().combo,
        currentChainProfit: 123
      }
    });

    expect(applyRunFailureConditions(state)).toBe(true);
    expect(state.phase).toBe('RUN_LOST');
    expect(state.combo.currentChainProfit).toBe(0);
    expect(state.runHistory.at(-1)).toContain('浮盈 123');
  });

  it('one-shot insurance can prevent bankruptcy and protect FloatingProfit', () => {
    const state = createTestEventGameState({
      risk: 100,
      maxRisk: 100,
      consumables: [
        {
          id: 'insurance-liquidation-buffer',
          name: '爆仓缓冲',
          description: '阻止一次爆仓。'
        }
      ],
      combo: {
        ...createTestEventGameState().combo,
        currentChainProfit: 123
      }
    });

    expect(applyRunFailureConditions(state)).toBe(false);
    expect(state.phase).not.toBe('RUN_LOST');
    expect(state.risk).toBe(90);
    expect(state.combo.currentChainProfit).toBe(123);
    expect(state.consumables).toHaveLength(0);
  });
});

function createDayEndState(floatingProfit: number) {
  return createTestEventGameState({
    phase: 'DAY_END',
    combo: {
      ...createTestEventGameState().combo,
      currentChainProfit: floatingProfit
    }
  });
}
