import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '../store/gameStore';

describe('event-driven game store', () => {
  beforeEach(() => {
    useGameStore.getState().resetRun();
  });

  it('starts a run with event-driven test cards and tools', () => {
    useGameStore.getState().startNewRun();

    const state = useGameStore.getState();

    expect(state.gameStatus).toBe('playing');
    expect(state.eventState?.hand).toHaveLength(8);
    expect(state.eventState?.drawPile).toHaveLength(2);
    expect(state.eventState?.tools).toHaveLength(8);
  });

  it('plays a card and updates hand, played cards, event log, combo, and MarketPressure', () => {
    useGameStore.getState().startNewRun();
    const before = useGameStore.getState().eventState;

    if (!before) {
      throw new Error('Expected event state.');
    }

    useGameStore.getState().playCard('test-card-tech-buy');

    const after = useGameStore.getState().eventState;

    if (!after) {
      throw new Error('Expected event state.');
    }

    expect(after.hand).toHaveLength(before.hand.length - 1);
    expect(after.playedCardsThisTurn.map((card) => card.id)).toContain(
      'test-card-tech-buy'
    );
    expect(after.combo.eventLog.length).toBeGreaterThan(0);
    expect(after.combo.comboCount).toBeGreaterThan(0);
    expect(after.marketPressure.hp).toBeLessThan(before.marketPressure.hp);
  });

  it('marks reward when MarketPressure is cleared through play', () => {
    useGameStore.getState().startNewRun();
    const eventState = useGameStore.getState().eventState;

    if (!eventState) {
      throw new Error('Expected event state.');
    }

    useGameStore.setState({
      eventState: {
        ...eventState,
        marketPressure: {
          ...eventState.marketPressure,
          hp: 10,
          maxHp: 10
        }
      }
    });
    useGameStore.getState().playCard('test-card-tech-buy');

    expect(useGameStore.getState().gameStatus).toBe('reward');
    expect(useGameStore.getState().eventState?.rewardChoices).toHaveLength(3);
    expect(
      useGameStore.getState().eventState?.combo.eventLog.join('\n')
    ).toContain('奖励掉落');
  });

  it('applies selected reward and can continue to the next pressure', () => {
    useGameStore.getState().startNewRun();
    const eventState = useGameStore.getState().eventState;

    if (!eventState) {
      throw new Error('Expected event state.');
    }

    useGameStore.setState({
      eventState: {
        ...eventState,
        marketPressure: {
          ...eventState.marketPressure,
          hp: 10,
          maxHp: 10
        }
      }
    });
    useGameStore.getState().playCard('test-card-tech-buy');

    const rewardId = useGameStore.getState().eventState?.rewardChoices[0]?.id;

    if (!rewardId) {
      throw new Error('Expected reward choices.');
    }

    useGameStore.getState().selectReward(rewardId);
    expect(useGameStore.getState().gameStatus).toBe('postReward');

    useGameStore.getState().continueAfterReward();
    expect(useGameStore.getState().gameStatus).toBe('playing');
    expect(useGameStore.getState().eventState?.marketPressureIndex).toBe(1);
  });

  it('marks bankrupt when risk reaches maxRisk through play', () => {
    useGameStore.getState().startNewRun();
    const eventState = useGameStore.getState().eventState;

    if (!eventState) {
      throw new Error('Expected event state.');
    }

    useGameStore.setState({
      eventState: {
        ...eventState,
        maxRisk: 20
      }
    });
    useGameStore.getState().playCard('test-card-margin-add');

    expect(useGameStore.getState().gameStatus).toBe('bankrupt');
  });
});
