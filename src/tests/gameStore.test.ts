import { beforeEach, describe, expect, it } from 'vitest';
import { type PostSettlementChoice, useGameStore } from '../store/gameStore';

function selectCards(cardIds: string[]) {
  for (const cardId of cardIds) {
    useGameStore.getState().toggleCard(cardId);
  }
}

describe('game store loop', () => {
  beforeEach(() => {
    useGameStore.getState().startNewRun();
  });

  it('cash out locks 70% floating profit and reduces risk by 20', () => {
    settleFirstDay();
    const before = useGameStore.getState();
    const runBefore = before.run;

    if (!runBefore) {
      throw new Error('Expected run to exist.');
    }

    useGameStore.getState().chooseAfterSettlement('cashOut');

    const after = useGameStore.getState();
    const runAfter = after.run;

    if (!runAfter) {
      throw new Error('Expected run to exist.');
    }

    const lockedGain = roundToTwoDecimals(runBefore.floatingProfit * 0.7);

    expect(after.lockedProfit).toBeCloseTo(lockedGain, 5);
    expect(runAfter.floatingProfit).toBeCloseTo(
      roundToTwoDecimals(runBefore.floatingProfit - lockedGain),
      5
    );
    expect(runAfter.risk).toBeCloseTo(Math.max(0, runBefore.risk - 20), 5);
    expect(after.lastChoice).toBe('cashOut');
  });

  it('hold keeps floating profit, adds x1.5 carry multiplier, and adds 10 risk', () => {
    settleFirstDay();
    const before = useGameStore.getState().run;

    if (!before) {
      throw new Error('Expected run to exist.');
    }

    useGameStore.getState().chooseAfterSettlement('hold');

    const after = useGameStore.getState();
    const runAfter = after.run;

    if (!runAfter) {
      throw new Error('Expected run to exist.');
    }

    expect(after.lockedProfit).toBe(0);
    expect(runAfter.floatingProfit).toBe(before.floatingProfit);
    expect(runAfter.floatingProfitCarryMultiplier).toBe(1.5);
    expect(runAfter.risk).toBeCloseTo(before.risk + 10, 5);
    expect(after.lastChoice).toBe('hold');
  });

  it('leverage adds tomorrow x2 settlement multiplier, 25 risk, and lowers max risk by 10', () => {
    settleFirstDay();
    const before = useGameStore.getState().run;

    if (!before) {
      throw new Error('Expected run to exist.');
    }

    useGameStore.getState().chooseAfterSettlement('leverage');

    const after = useGameStore.getState();
    const runAfter = after.run;

    if (!runAfter) {
      throw new Error('Expected run to exist.');
    }

    expect(runAfter.nextSettlementMultiplier).toBe(2);
    expect(runAfter.temporaryMaxRiskPenalty).toBe(10);
    expect(runAfter.risk).toBeCloseTo(before.risk + 25, 5);
    expect(after.lastChoice).toBe('leverage');
  });

  it('can clear 12 trading days by taking profit each day', () => {
    while (useGameStore.getState().phase === 'selecting') {
      const run = useGameStore.getState().run;

      if (!run) {
        throw new Error('Expected run to exist.');
      }

      const safestCards = [...run.hand]
        .sort((first, second) => first.baseRisk - second.baseRisk)
        .slice(0, 5)
        .map((card) => card.id);

      selectCards(safestCards);
      useGameStore.getState().settleToday();

      if (useGameStore.getState().phase === 'bankrupt') {
        break;
      }

      useGameStore.getState().chooseAfterSettlement('cashOut');
    }

    expect(useGameStore.getState().phase).toBe('won');
  });

  it('can go bankrupt by holding risk and adding leverage', () => {
    let guard = 0;

    while (useGameStore.getState().phase === 'selecting' && guard < 12) {
      const run = useGameStore.getState().run;

      if (!run) {
        throw new Error('Expected run to exist.');
      }

      const riskiestCards = [...run.hand]
        .sort((first, second) => second.baseRisk - first.baseRisk)
        .slice(0, 5)
        .map((card) => card.id);

      selectCards(riskiestCards);
      useGameStore.getState().settleToday();

      if (useGameStore.getState().phase === 'bankrupt') {
        break;
      }

      useGameStore.getState().chooseAfterSettlement('leverage');
      guard += 1;
    }

    expect(useGameStore.getState().phase).toBe('bankrupt');
  });
});

function settleFirstDay() {
  const run = useGameStore.getState().run;

  if (!run) {
    throw new Error('Expected run to exist.');
  }

  selectCards(run.hand.slice(0, 5).map((card) => card.id));
  useGameStore.getState().settleToday();

  if (useGameStore.getState().phase !== 'settled') {
    throw new Error('Expected first day to settle without ending the run.');
  }
}

function roundToTwoDecimals(value: number) {
  return Math.round(value * 100) / 100;
}
