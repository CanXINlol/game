import { beforeEach, describe, expect, it } from 'vitest';
import { FORMAL_EVENT_CARDS } from '../game/formalContent';
import { useGameStore } from '../store/gameStore';

describe('event-driven game store', () => {
  beforeEach(() => {
    useGameStore.getState().resetRun();
  });

  it('starts a run with event-driven test cards and tools', () => {
    useGameStore.getState().startNewRun();

    const state = useGameStore.getState();

    expect(state.gameStatus).toBe('ROUTE_SELECT');
    expect(state.eventState?.routeMap.acts).toHaveLength(3);
    expect(state.eventState?.routeMap.availableNodeIds.length).toBeGreaterThanOrEqual(2);
    expect((state.eventState?.hand.length ?? 0) + (state.eventState?.drawPile.length ?? 0)).toBe(12);
    expect(state.eventState?.tools.length).toBeLessThanOrEqual(1);
  });

  it('plays a card and updates hand, played cards, event log, combo, and MarketPressure', () => {
    startFirstRouteEncounter();
    const before = useGameStore.getState().eventState;

    if (!before) {
      throw new Error('Expected event state.');
    }

    useGameStore.getState().playCard('formal-tech-001');

    const after = useGameStore.getState().eventState;

    if (!after) {
      throw new Error('Expected event state.');
    }

    expect(after.hand).toHaveLength(before.hand.length - 1);
    expect(after.playedCardsThisTurn.map((card) => card.id)).toContain(
      'formal-tech-001'
    );
    expect(after.combo.eventLog.length).toBeGreaterThan(0);
    expect(after.combo.comboCount).toBeGreaterThan(0);
    expect(after.marketPressure.hp).toBeLessThan(before.marketPressure.hp);
  });

  it('marks reward when MarketPressure is cleared through play', () => {
    startFirstRouteEncounter();
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
          maxHp: 10,
          shield: 0
        }
      }
    });
    useGameStore.getState().playCard('formal-tech-001');

    expect(useGameStore.getState().gameStatus).toBe('REWARD');
    expect(useGameStore.getState().eventState?.rewardChoices).toHaveLength(3);
    expect(
      useGameStore.getState().eventState?.combo.eventLog.join('\n')
    ).toContain('奖励掉落');
  });

  it('applies selected reward and enters day-end choice', () => {
    startFirstRouteEncounter();
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
          maxHp: 10,
          shield: 0
        }
      }
    });
    useGameStore.getState().playCard('formal-tech-001');

    const rewardId = useGameStore.getState().eventState?.rewardChoices[0]?.id;

    if (!rewardId) {
      throw new Error('Expected reward choices.');
    }

    const completedBefore =
      useGameStore.getState().eventState?.routeMap.completedNodeIds.length ?? 0;

    useGameStore.getState().selectReward(rewardId);
    expect(useGameStore.getState().gameStatus).toBe('ROUTE_SELECT');
    expect(useGameStore.getState().eventState?.routeMap.completedNodeIds).toHaveLength(
      completedBefore + 1
    );
  });

  it('ends the player turn by resolving intent and drawing the next hand', () => {
    startFirstRouteEncounter();
    const before = useGameStore.getState().eventState;

    if (!before) {
      throw new Error('Expected event state.');
    }

    const intentBeforeResolve = before.currentIntentId;

    useGameStore.getState().endTurn();
    expect(useGameStore.getState().gameStatus).toBe('PLAYER_TURN');
    expect(useGameStore.getState().eventState?.currentTurn).toBe(
      before.currentTurn + 1
    );
    expect(useGameStore.getState().eventState?.lastResolvedIntentId).toBe(
      intentBeforeResolve
    );
    expect(useGameStore.getState().eventState?.playedCardsThisTurn).toHaveLength(0);
    expect(useGameStore.getState().eventState?.ap).toBe(
      useGameStore.getState().eventState?.maxAp
    );
    expect(useGameStore.getState().eventState?.lastTurnSummary).toContain('下一意图');
  });

  it('marks bankrupt when risk reaches maxRisk through play', () => {
    startFirstRouteEncounter();
    const eventState = useGameStore.getState().eventState;

    if (!eventState) {
      throw new Error('Expected event state.');
    }

    const riskCard = FORMAL_EVENT_CARDS.find((card) => card.id === 'formal-tech-005');

    if (!riskCard) {
      throw new Error('Expected risk card in hand.');
    }

    useGameStore.setState({
      eventState: {
        ...eventState,
        hand: [riskCard],
        tools: [],
        risk: 10,
        maxRisk: 18,
        marketPressure: {
          ...eventState.marketPressure,
          hp: 999,
          maxHp: 999
        }
      }
    });
    useGameStore.getState().playCard('formal-tech-005');

    expect(useGameStore.getState().gameStatus).toBe('RUN_LOST');
  });
});

function startFirstRouteEncounter() {
  useGameStore.getState().startNewRun();
  const state = useGameStore.getState().eventState;
  const nodeId = state?.routeMap.availableNodeIds[0];

  if (!nodeId) {
    throw new Error('Expected an available route node.');
  }

  useGameStore.getState().selectRouteNode(nodeId);

  for (let attempt = 0; attempt < 10; attempt += 1) {
    if (useGameStore.getState().gameStatus === 'PLAYER_TURN') {
      return;
    }

    useGameStore.getState().completeRouteNode();
    const nextNode = useGameStore.getState().eventState?.routeMap.availableNodeIds[0];

    if (!nextNode) {
      throw new Error('Expected route encounter after first selection.');
    }

    useGameStore.getState().selectRouteNode(nextNode);
  }

  throw new Error('Expected to enter a route encounter.');
}
