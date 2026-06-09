import { describe, expect, it } from 'vitest';
import { applyDayChoice, getDayChoicePreviews } from '../game/dayChoices';
import { TEST_EVENT_CARDS } from '../game/effects';
import { createTestEventGameState, playCard } from '../game/playCard';

function createDayEndState() {
  return createTestEventGameState({
    phase: 'dayEnd',
    combo: {
      ...createTestEventGameState().combo,
      comboCount: 4,
      comboMultiplier: 1.32,
      currentChainProfit: 100,
      highestComboToday: 4,
      highestComboThisRun: 4
    }
  });
}

describe('day-end greed choices', () => {
  it('previews profit and risk consequences before choosing', () => {
    const previews = getDayChoicePreviews(createDayEndState());

    expect(previews).toHaveLength(4);
    expect(previews.map((preview) => preview.id)).toEqual([
      'cashOut',
      'hold',
      'leverage',
      'continueTrading'
    ]);
    expect(previews[0].profitText).toContain('70%');
    expect(previews[2].riskText).toContain('maxRisk');
  });

  it('cash out locks 70% floatingProfit and records history', () => {
    const state = createDayEndState();

    applyDayChoice(state, 'cashOut');

    expect(state.lockedProfit).toBe(70);
    expect(state.combo.currentChainProfit).toBe(30);
    expect(state.risk).toBe(0);
    expect(state.phase).toBe('playing');
    expect(state.day).toBe(2);
    expect(state.runHistory.at(-1)).toContain('止盈');
    expect(state.lastDayChoice).toBe('cashOut');
  });

  it('hold gives next day combo and profit multiplier but adds risk', () => {
    const state = createDayEndState();

    applyDayChoice(state, 'hold');

    expect(state.risk).toBe(10);
    expect(state.combo.comboCount).toBe(2);
    expect(state.combo.comboMultiplier).toBe(1.16);
    expect(state.profitMultiplier).toBe(1.2);
    expect(state.phase).toBe('playing');
    expect(state.runHistory.at(-1)).toContain('继续持有');
  });

  it('leverage increases profit multiplier and AP but adds risk and lowers maxRisk', () => {
    const state = createDayEndState();

    applyDayChoice(state, 'leverage');

    expect(state.risk).toBe(25);
    expect(state.profitMultiplier).toBe(1.6);
    expect(state.maxAp).toBe(7);
    expect(state.ap).toBe(7);
    expect(state.maxRisk).toBe(90);
    expect(state.lastDayChoice).toBe('leverage');
  });

  it('leverage profit multiplier affects the next day PROFIT_GAINED events', () => {
    const state = createDayEndState();

    applyDayChoice(state, 'leverage');
    state.hand = [getTestCard('test-card-tech-buy')];
    const afterPlay = playCard(state, 'test-card-tech-buy');

    expect(afterPlay.combo.currentChainProfit).toBeGreaterThan(100);
    expect(afterPlay.combo.eventLog.join('\n')).toContain('x1.60');
  });

  it('continue trading creates a new MarketPressure and keeps floatingProfit and risk', () => {
    const state = createDayEndState();
    state.risk = 35;
    const floatingBefore = state.combo.currentChainProfit;
    const pressureIdBefore = state.marketPressure.id;

    applyDayChoice(state, 'continueTrading');

    expect(state.phase).toBe('playing');
    expect(state.day).toBe(1);
    expect(state.risk).toBe(35);
    expect(state.combo.currentChainProfit).toBe(floatingBefore);
    expect(state.marketPressure.id).not.toBe(pressureIdBefore);
    expect(state.rewardRarityBonus).toBe(1);
    expect(state.runHistory.at(-1)).toContain('继续交易');
  });

  it('records the last choice and exposes it when bankrupt later', () => {
    const state = createDayEndState();

    applyDayChoice(state, 'leverage');
    state.risk = 88;
    state.hand = [getTestCard('test-card-margin-add')];
    const afterRiskCard = playCard(state, 'test-card-margin-add');

    expect(afterRiskCard.phase).toBe('bankrupt');
    expect(afterRiskCard.lastDayChoice).toBe('leverage');
    expect(afterRiskCard.runHistory.at(-1)).toContain('最后一次选择 加杠杆');
  });
});

function getTestCard(cardId: string) {
  const card = TEST_EVENT_CARDS.find((item) => item.id === cardId);

  if (!card) {
    throw new Error(`Missing test card ${cardId}`);
  }

  return { ...card, effects: card.effects.map((effect) => ({ ...effect })) };
}
