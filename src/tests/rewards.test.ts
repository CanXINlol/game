import { describe, expect, it } from 'vitest';
import { FORMAL_EVENT_CARDS } from '../game/formalContent';
import {
  applyRewardChoice,
  createRewardSeed,
  enterDayEndAfterReward,
  generateRewardChoices,
  skipReward,
  startNextMarketPressure,
  type RewardOption
} from '../game/rewards';
import { createTestEventGameState, playCard } from '../game/playCard';

function createRewardReadyState(overrides: Parameters<typeof createTestEventGameState>[0] = {}) {
  const state = createTestEventGameState({
    seed: 'reward-seed',
      tools: [],
    marketPressure: {
      ...createTestEventGameState().marketPressure,
      hp: 10,
      maxHp: 10
    },
    ...overrides
  });

  return playCard(state, 'test-card-tech-buy');
}

function cloneState(state: ReturnType<typeof createTestEventGameState>) {
  return JSON.parse(JSON.stringify(state)) as typeof state;
}

describe('reward generation and application', () => {
  it('generates reproducible reward choices from seed', () => {
    const state = createRewardReadyState();

    expect(state.phase).toBe('REWARD');
    expect(state.rewardChoices).toHaveLength(3);

    const firstIds = state.rewardChoices.map((reward) => reward.id);
    const secondState = createRewardReadyState();
    const secondIds = secondState.rewardChoices.map((reward) => reward.id);

    expect(secondIds).toEqual(firstIds);
    expect(createRewardSeed(state)).toBe('reward-seed-reward-0');
  });

  it('adds a new card to the deck when selecting add-card reward', () => {
    const state = createRewardReadyState();
    const reward: RewardOption = {
      id: 'test-add-card',
      kind: 'ADD_CARD',
      title: '追加热点',
      description: '获得 1 张正式牌。',
      cardId: 'formal-tech-003',
      cardName: '涨停追击'
    };

    const deckSizeBefore = state.hand.length + state.drawPile.length;

    state.rewardChoices = [reward];
    applyRewardChoice(state, reward.id);

    expect(state.hand.length + state.drawPile.length).toBe(deckSizeBefore + 1);
    expect(
      [...state.hand, ...state.drawPile].some((card) =>
        card.id.startsWith('formal-tech-003')
      )
    ).toBe(true);
  });

  it('adds a tool when selecting add-tool reward', () => {
    const state = createRewardReadyState();
    const reward: RewardOption = {
      id: 'test-add-tool',
      kind: 'ADD_TOOL',
      title: '量化插件',
      description: '获得工具“涨停板计算器”。',
      toolId: 'formal-tool-limit-up-calculator',
      toolName: '涨停板计算器'
    };

    state.rewardChoices = [reward];
    const toolCountBefore = state.tools.length;
    applyRewardChoice(state, reward.id);

    expect(state.tools).toHaveLength(toolCountBefore + 1);
    expect(state.tools.some((tool) => tool.id === 'formal-tool-limit-up-calculator')).toBe(true);
  });

  it('reduces risk when selecting reduce-risk reward', () => {
    const state = createRewardReadyState({ risk: 40 });
    const reward: RewardOption = {
      id: 'test-reduce-risk',
      kind: 'REDUCE_RISK',
      title: '风控休息',
      description: 'Risk -15。',
      value: 15
    };

    state.rewardChoices = [reward];
    applyRewardChoice(state, reward.id);

    expect(state.risk).toBe(25);
  });

  it('locks floating profit when selecting lock-profit reward', () => {
    const state = createRewardReadyState();
    const floatingBefore = state.combo.currentChainProfit;
    const reward: RewardOption = {
      id: 'test-lock-profit',
      kind: 'LOCK_PROFIT',
      title: '锁定利润',
      description: '锁定 40% 浮盈。',
      value: 0.4
    };

    state.rewardChoices = [reward];
    applyRewardChoice(state, reward.id);

    expect(state.lockedProfit).toBeGreaterThan(0);
    expect(state.combo.currentChainProfit).toBeLessThan(floatingBefore);
    expect(state.lockedProfit + state.combo.currentChainProfit).toBeCloseTo(
      floatingBefore,
      1
    );
  });

  it('transitions to next MarketPressure or day end after reward selection', () => {
    const state = createRewardReadyState();
    const reward = state.rewardChoices[0];

    applyRewardChoice(state, reward.id);
    state.rewardChoices = [];
    state.phase = 'REWARD';

    const nextPressureState = cloneState(state);
    startNextMarketPressure(nextPressureState);

    expect(nextPressureState.phase).toBe('PLAYER_TURN');
    expect(nextPressureState.marketPressureIndex).toBe(1);
    expect(nextPressureState.marketPressure.name).toBe('消费回撤盘');
    expect(nextPressureState.ap).toBe(nextPressureState.maxAp);

    const dayEndState = cloneState(state);
    enterDayEndAfterReward(dayEndState);

    expect(dayEndState.phase).toBe('DAY_END');
  });

  it('applies initial combo bonus when continuing to the next pressure', () => {
    const state = createRewardReadyState();
    const reward: RewardOption = {
      id: 'test-initial-combo',
      kind: 'INITIAL_COMBO',
      title: '连击惯性',
      description: '下一场初始 combo +2。',
      value: 2
    };

    state.rewardChoices = [reward];
    applyRewardChoice(state, reward.id);
    startNextMarketPressure(state);

    expect(state.combo.comboCount).toBeGreaterThanOrEqual(2);
    expect(state.nextInitialCombo).toBe(0);
  });

  it('can regenerate choices deterministically for later reward tiers', () => {
    const state = createTestEventGameState({
      seed: 'reward-seed',
      rewardsTakenCount: 2
    });

    const first = generateRewardChoices(state).map((reward) => reward.id);
    const second = generateRewardChoices(state).map((reward) => reward.id);

    expect(first).toEqual(second);
    expect(createRewardSeed(state)).toBe('reward-seed-reward-2');
  });

  it('Act 1 rewards do not offer Act 3 finisher cards', () => {
    const state = createTestEventGameState({
      seed: 'act-1-reward',
      tools: [],
      routeMap: {
        ...createTestEventGameState().routeMap,
        currentAct: 1
      }
    });

    const rewards = generateRewardChoices(state);
    const cardReward = rewards.find((reward) => reward.kind === 'ADD_CARD');
    const card = FORMAL_EVENT_CARDS.find((item) => item.id === cardReward?.cardId);

    expect(card?.cardType).not.toBe('FINISHER');
    expect(card?.cardType).not.toBe('LEVERAGE');
    expect(card?.cardType).not.toBe('COPY');
  });

  it('Act 2 can offer middle-tier cards', () => {
    const state = createTestEventGameState({ seed: 'act-2-reward', tools: [] });
    state.routeMap.currentAct = 2;

    const cardReward = generateRewardChoices(state).find(
      (reward) => reward.kind === 'ADD_CARD'
    );
    const card = FORMAL_EVENT_CARDS.find((item) => item.id === cardReward?.cardId);

    expect(['COPY', 'LEVERAGE', 'RISK', 'CHASE', 'DRAW', 'BUY', 'CASH_OUT']).toContain(
      card?.cardType
    );
  });

  it('Act 3 Boss can offer a finisher card', () => {
    const state = createTestEventGameState({ seed: 'act-3-reward', tools: [] });
    const boss = state.routeMap.acts[2].nodes.find((node) => node.type === 'BOSS');

    if (!boss) throw new Error('Expected boss node.');

    state.routeMap.currentAct = 3;
    state.routeMap.currentNodeId = boss.id;

    const cardReward = generateRewardChoices(state).find(
      (reward) => reward.kind === 'ADD_CARD'
    );
    const card = FORMAL_EVENT_CARDS.find((item) => item.id === cardReward?.cardId);

    expect(card?.cardType).toBe('FINISHER');
  });

  it('formal rewards do not include test tools', () => {
    const state = createTestEventGameState({ seed: 'formal-tools-only', tools: [] });
    state.routeMap.currentAct = 2;

    const rewards = generateRewardChoices(state);

    expect(rewards.every((reward) => !reward.toolId?.startsWith('test-'))).toBe(true);
  });

  it('normal and elite node rewards differ', () => {
    const normalState = createTestEventGameState({ seed: 'node-reward', tools: [] });
    const eliteState = createTestEventGameState({ seed: 'node-reward', tools: [] });
    const elite = eliteState.routeMap.acts[1].nodes.find(
      (node) => node.type !== 'BOSS'
    );

    if (!elite) throw new Error('Expected elite node.');

    elite.type = 'ELITE_MARKET';
    eliteState.routeMap.currentNodeId = elite.id;

    const normalKinds = generateRewardChoices(normalState).map((reward) => reward.kind);
    const eliteKinds = generateRewardChoices(eliteState).map((reward) => reward.kind);

    expect(eliteKinds).not.toEqual(normalKinds);
    expect(eliteKinds).toContain('ADD_TOOL');
  });

  it('skipping reward gives cash compensation', () => {
    const state = createRewardReadyState({ cash: 20 });
    const result = applyRewardChoice(state, state.rewardChoices[0].id);
    expect(result.message).toContain('奖励生效');

    const skipState = createRewardReadyState({ cash: 20 });
    const before = skipState.cash;
    const skipResult = skipReward(skipState);

    expect(skipResult.message).toContain('现金 +15');
    expect(skipState.cash).toBe(before + 15);
  });
});
