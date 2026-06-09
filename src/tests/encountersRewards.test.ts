import { describe, expect, it } from 'vitest';
import {
  endEncounterTurn,
  enterEnemyIntentPhase,
  settleEncounterTurn,
  type MarketIntent
} from '../game/encounters';
import { createMarketPressureByIndex } from '../game/marketPressure';
import { createTestEventGameState, playCard } from '../game/playCard';
import {
  applyRewardChoice,
  skipReward,
  type RewardOption
} from '../game/rewards';

describe('encounter pressure and disciplined rewards', () => {
  it('generates public MarketPressure intents with weakness and resistance sectors', () => {
    const pressure = createMarketPressureByIndex('intent-seed', 0);

    expect(pressure.intent.type).toBeTruthy();
    expect(pressure.intent.label).toBeTruthy();
    expect(pressure.intent.description).toBeTruthy();
    expect(pressure.weaknessSector).toBeTruthy();
    expect(pressure.resistanceSector).toBeTruthy();
  });

  it('applies the public intent once and advances to the next player turn', () => {
    const state = createTestEventGameState({
      risk: 5,
      marketPressure: {
        ...createTestEventGameState().marketPressure,
        intent: createIntent('RISK_ATTACK', 12)
      }
    });
    state.currentIntentId = state.marketPressure.intent.id;

    enterEnemyIntentPhase(state);
    settleEncounterTurn(state);

    expect(state.risk).toBe(17);
    expect(state.currentTurn).toBe(2);
    expect(state.phase).toBe('PLAYER_TURN');
    expect(state.lastResolvedIntentId).toBe('test-RISK_ATTACK');
    expect(state.currentIntentId).not.toBe('test-RISK_ATTACK');
    expect(state.combo.eventLog.join('\n')).toContain('公开意图结算');
  });

  it('endEncounterTurn resolves intent, discards hand, redraws, and creates next intent', () => {
    const state = createTestEventGameState({
      risk: 5,
      hand: createTestEventGameState().hand.slice(0, 3),
      drawPile: createTestEventGameState().drawPile,
      playedCardsThisTurn: [createTestEventGameState().hand[3]],
      marketPressure: {
        ...createTestEventGameState().marketPressure,
        intent: createIntent('RISK_ATTACK', 12)
      }
    });
    state.currentIntentId = state.marketPressure.intent.id;
    const firstIntentId = state.currentIntentId;

    endEncounterTurn(state);

    expect(state.phase).toBe('PLAYER_TURN');
    expect(state.risk).toBe(17);
    expect(state.playedCardsThisTurn).toHaveLength(0);
    expect(state.hand.length).toBeGreaterThan(0);
    expect(state.cardsDrawnThisTurn).toBeGreaterThan(0);
    expect(state.lastResolvedIntentId).toBe(firstIntentId);
    expect(state.currentIntentId).not.toBe(firstIntentId);
    expect(state.lastTurnSummary).toContain('下一意图');
  });

  it('can make a pressure intent add shield instead of surprising the player', () => {
    const state = createTestEventGameState({
      marketPressure: {
        ...createTestEventGameState().marketPressure,
        shield: 2,
        intent: createIntent('SHIELD_UP', 18)
      }
    });
    state.currentIntentId = state.marketPressure.intent.id;

    enterEnemyIntentPhase(state);
    settleEncounterTurn(state);

    expect(state.marketPressure.shield).toBe(20);
  });

  it('does not resolve the same intent twice', () => {
    const state = createTestEventGameState({
      risk: 5,
      marketPressure: {
        ...createTestEventGameState().marketPressure,
        intent: createIntent('RISK_ATTACK', 12)
      }
    });
    state.currentIntentId = state.marketPressure.intent.id;

    enterEnemyIntentPhase(state);
    settleEncounterTurn(state);

    const riskAfterFirstResolve = state.risk;
    const hpAfterFirstResolve = state.marketPressure.hp;
    const turnAfterFirstResolve = state.currentTurn;
    const currentIntentAfterFirstResolve = state.currentIntentId;

    settleEncounterTurn(state);

    expect(state.risk).toBe(riskAfterFirstResolve);
    expect(state.marketPressure.hp).toBe(hpAfterFirstResolve);
    expect(state.currentTurn).toBe(turnAfterFirstResolve);
    expect(state.currentIntentId).toBe(currentIntentAfterFirstResolve);
    expect(state.combo.eventLog.at(-1)).toBe('本回合意图已结算。');
  });

  it('does not enter enemy intent after MarketPressure is cleared', () => {
    const state = playCard(
      createTestEventGameState({
        tools: [],
        marketPressure: {
          ...createTestEventGameState().marketPressure,
          hp: 10,
          maxHp: 10
        }
      }),
      'test-card-tech-buy'
    );

    enterEnemyIntentPhase(state);

    expect(state.phase).toBe('REWARD');
    expect(state.canResolveIntent).toBe(false);
  });

  it('marks the run lost when a public intent causes bankruptcy', () => {
    const state = createTestEventGameState({
      risk: 90,
      maxRisk: 100,
      marketPressure: {
        ...createTestEventGameState().marketPressure,
        intent: createIntent('RISK_ATTACK', 12)
      }
    });
    state.currentIntentId = state.marketPressure.intent.id;

    enterEnemyIntentPhase(state);
    settleEncounterTurn(state);

    expect(state.phase).toBe('RUN_LOST');
    expect(state.encounterStatus).toBe('LOST');
  });

  it('creates exactly three reward options after MarketPressure is cleared', () => {
    const state = playCard(
      createTestEventGameState({
        tools: [],
        marketPressure: {
          ...createTestEventGameState().marketPressure,
          hp: 10,
          maxHp: 10
        }
      }),
      'test-card-tech-buy'
    );

    expect(state.phase).toBe('REWARD');
    expect(state.rewardChoices).toHaveLength(3);
  });

  it('lets the player skip rewards to preserve deck discipline', () => {
    const state = createTestEventGameState({
      risk: 20,
      combo: {
        ...createTestEventGameState().combo,
        currentChainProfit: 0
      }
    });
    const cashBefore = state.cash;

    const result = skipReward(state);

    expect(state.cash).toBe(cashBefore + 15);
    expect(result.message).toContain('跳过奖励');
  });

  it('adds a new card to the deck from a reward', () => {
    const state = createTestEventGameState();
    const before = state.drawPile.length;
    const reward: RewardOption = {
      id: 'add-card',
      kind: 'ADD_CARD',
      title: '新牌',
      description: '加一张牌。',
      cardId: 'formal-tech-003',
      cardName: '涨停追击'
    };

    state.rewardChoices = [reward];
    applyRewardChoice(state, reward.id);

    expect(state.drawPile).toHaveLength(before + 1);
  });

  it('adds a tool from a reward', () => {
    const state = createTestEventGameState({ tools: [] });
    const reward: RewardOption = {
      id: 'add-tool',
      kind: 'ADD_TOOL',
      title: '工具',
      description: '加一个工具。',
      toolId: 'formal-tool-limit-up-calculator',
      toolName: '涨停板计算器'
    };

    state.rewardChoices = [reward];
    applyRewardChoice(state, reward.id);

    expect(
      state.tools.some((tool) => tool.id === 'formal-tool-limit-up-calculator')
    ).toBe(true);
  });

  it('upgrades a card and changes its playable shape', () => {
    const state = createTestEventGameState({
      hand: [getCardState().hand[0]],
      drawPile: []
    });
    const card = state.hand[0];
    const reward: RewardOption = {
      id: 'upgrade-card',
      kind: 'UPGRADE_CARD',
      title: '升级',
      description: '升级一张牌。',
      cardId: card.id,
      cardName: card.name
    };

    state.rewardChoices = [reward];
    applyRewardChoice(state, reward.id);

    expect(state.hand[0]).not.toEqual(card);
  });

  it('removes a card from the deck from a reward', () => {
    const state = createTestEventGameState();
    const cardId = state.hand[0].id;
    const reward: RewardOption = {
      id: 'remove-card',
      kind: 'REMOVE_CARD',
      title: '删牌',
      description: '移除一张牌。',
      cardId,
      cardName: state.hand[0].name
    };

    state.rewardChoices = [reward];
    applyRewardChoice(state, reward.id);

    expect(
      [...state.hand, ...state.drawPile, ...state.discardPile].some(
        (card) => card.id === cardId
      )
    ).toBe(false);
  });
});

function createIntent(type: MarketIntent['type'], value?: number): MarketIntent {
  return {
    id: `test-${type}`,
    type,
    label: type,
    description: `${type} preview`,
    value
  };
}

function getCardState() {
  return createTestEventGameState();
}
