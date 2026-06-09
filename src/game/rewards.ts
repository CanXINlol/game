import { getComboMultiplier } from './combo';
import {
  TEST_EVENT_CARDS,
  TEST_EVENT_TOOLS,
  type EventCard,
  type EventTool
} from './effects';
import { createMarketPressureByIndex, type MarketPressure } from './marketPressure';
import type { EventGameState } from './playCard';
import { createRng, type Rng } from './rng';

export type RewardKind =
  | 'ADD_CARD'
  | 'UPGRADE_CARD'
  | 'ADD_TOOL'
  | 'REMOVE_CARD'
  | 'REDUCE_RISK'
  | 'LOCK_PROFIT'
  | 'INITIAL_COMBO';

export interface RewardOption {
  id: string;
  kind: RewardKind;
  title: string;
  description: string;
  cardId?: string;
  cardName?: string;
  toolId?: string;
  toolName?: string;
  value?: number;
}

export interface RewardApplyResult {
  message: string;
}

const REWARD_OPTION_COUNT = 3;

const REWARD_CARD_IDS = [
  'test-card-hot-rotation',
  'test-card-limit-chase',
  'test-card-quant-copy',
  'test-card-dip-rebound'
] as const;

const REWARD_TOOL_IDS = ['test-tool-quant-terminal', 'test-tool-limit-calculator'] as const;

export function createRewardSeed(state: EventGameState) {
  return `${state.seed}-reward-${state.rewardsTakenCount}`;
}

export function generateRewardChoices(state: EventGameState): RewardOption[] {
  const rng = createRng(createRewardSeed(state));
  const candidates = buildRewardCandidates(state, rng);
  const shuffled = rng.shuffle(candidates);

  return shuffled.slice(0, REWARD_OPTION_COUNT);
}

export function applyRewardChoice(
  state: EventGameState,
  rewardId: string
): RewardApplyResult {
  const reward = state.rewardChoices.find((item) => item.id === rewardId);

  if (!reward) {
    throw new Error(`Unknown reward option: ${rewardId}`);
  }

  switch (reward.kind) {
    case 'ADD_CARD':
      return applyAddCardReward(state, reward);
    case 'UPGRADE_CARD':
      return applyUpgradeCardReward(state, reward);
    case 'ADD_TOOL':
      return applyAddToolReward(state, reward);
    case 'REMOVE_CARD':
      return applyRemoveCardReward(state, reward);
    case 'REDUCE_RISK':
      return applyReduceRiskReward(state, reward);
    case 'LOCK_PROFIT':
      return applyLockProfitReward(state, reward);
    case 'INITIAL_COMBO':
      return applyInitialComboReward(state, reward);
    default:
      throw new Error(`Unsupported reward kind.`);
  }
}

export function startNextMarketPressure(state: EventGameState): EventGameState {
  const nextIndex = state.marketPressureIndex + 1;
  const nextPressure = createMarketPressureByIndex(state.seed, nextIndex);

  state.marketPressureIndex = nextIndex;
  state.marketPressure = nextPressure;
  state.phase = 'playing';
  state.rewardChoices = [];
  state.ap = state.maxAp;
  state.playedCardsThisTurn = [];
  state.lastPlayedCard = null;
  state.resolvedEventTypes = [];
  state.toolUseCounts = {};
  state.triggeredComboMilestones = {};

  applyInitialComboBonus(state);

  state.combo.eventLog.push(
    `进入下一压力盘：${nextPressure.name}。`
  );

  return state;
}

export function enterDayEndAfterReward(state: EventGameState): EventGameState {
  state.phase = 'dayEnd';
  state.rewardChoices = [];
  state.combo.eventLog.push('奖励已领取，进入日终选择。');
  return state;
}

function buildRewardCandidates(state: EventGameState, rng: Rng): RewardOption[] {
  const candidates: RewardOption[] = [];
  const rewardIndex = state.rewardsTakenCount;

  candidates.push(createAddCardReward(state, rng, rewardIndex));
  candidates.push(createUpgradeCardReward(state, rng, rewardIndex));
  candidates.push(createAddToolReward(state, rng, rewardIndex));
  candidates.push(createRemoveCardReward(state, rng, rewardIndex));
  candidates.push(createReduceRiskReward(rewardIndex));
  candidates.push(createLockProfitReward(state, rewardIndex));
  candidates.push(createInitialComboReward(rewardIndex));

  return candidates.filter((item): item is RewardOption => item !== null);
}

function createAddCardReward(
  state: EventGameState,
  rng: Rng,
  rewardIndex: number
): RewardOption | null {
  const availableCards = REWARD_CARD_IDS.filter(
    (cardId) => !getDeckCards(state).some((card) => card.id.startsWith(cardId))
  );

  if (availableCards.length === 0) {
    return null;
  }

  const cardId = rng.pick(availableCards);
  const card = getCardTemplate(cardId);

  return {
    id: `reward-${rewardIndex}-add-card-${cardId}`,
    kind: 'ADD_CARD',
    title: cardId === 'test-card-hot-rotation' ? '追加热点' : `新牌：${card.name}`,
    description:
      cardId === 'test-card-hot-rotation'
        ? '获得 1 张热点轮动，触发 hotSector 并抽牌。'
        : `将 ${card.name} 加入牌组，强化 combo 链路。`,
    cardId,
    cardName: card.name
  };
}

function createUpgradeCardReward(
  state: EventGameState,
  rng: Rng,
  rewardIndex: number
): RewardOption | null {
  const deckCards = getDeckCards(state);

  if (deckCards.length === 0) {
    return null;
  }

  const card = rng.pick(deckCards);

  return {
    id: `reward-${rewardIndex}-upgrade-${card.id}`,
    kind: 'UPGRADE_CARD',
    title: '牌面升级',
    description: `升级 ${card.name}：Rank +1，并强化其收益效果。`,
    cardId: card.id,
    cardName: card.name
  };
}

function createAddToolReward(
  state: EventGameState,
  rng: Rng,
  rewardIndex: number
): RewardOption | null {
  const ownedToolIds = new Set(state.tools.map((tool) => tool.id));
  const availableTools = REWARD_TOOL_IDS.filter((toolId) => !ownedToolIds.has(toolId));

  if (availableTools.length === 0) {
    return null;
  }

  const toolId = rng.pick(availableTools);
  const tool = getToolTemplate(toolId);

  return {
    id: `reward-${rewardIndex}-add-tool-${toolId}`,
    kind: 'ADD_TOOL',
    title: toolId === 'test-tool-quant-terminal' ? '量化插件' : `工具：${tool.name}`,
    description:
      toolId === 'test-tool-quant-terminal'
        ? '获得工具“量化终端”，复制牌后抽牌并 combo +1。'
        : `${tool.description}`,
    toolId,
    toolName: tool.name
  };
}

function createRemoveCardReward(
  state: EventGameState,
  rng: Rng,
  rewardIndex: number
): RewardOption | null {
  const removableCards = getRemovableCards(state);

  if (removableCards.length === 0) {
    return null;
  }

  const card = pickNoiseCard(removableCards, rng);

  return {
    id: `reward-${rewardIndex}-remove-${card.id}`,
    kind: 'REMOVE_CARD',
    title: '删掉噪音',
    description: `从牌组移除 ${card.name}，减少无效出牌。`,
    cardId: card.id,
    cardName: card.name
  };
}

function createReduceRiskReward(rewardIndex: number): RewardOption {
  return {
    id: `reward-${rewardIndex}-reduce-risk`,
    kind: 'REDUCE_RISK',
    title: '风控休息',
    description: 'Risk -15，为下一轮 combo 腾出风险空间。',
    value: 15
  };
}

function createLockProfitReward(
  state: EventGameState,
  rewardIndex: number
): RewardOption {
  const ratio = 0.4;
  const lockAmount = roundToTwoDecimals(state.combo.currentChainProfit * ratio);

  return {
    id: `reward-${rewardIndex}-lock-profit`,
    kind: 'LOCK_PROFIT',
    title: '锁定利润',
    description: `锁定 ${Math.round(ratio * 100)}% 浮盈（约 ${lockAmount}）。`,
    value: ratio
  };
}

function createInitialComboReward(rewardIndex: number): RewardOption {
  return {
    id: `reward-${rewardIndex}-initial-combo`,
    kind: 'INITIAL_COMBO',
    title: '连击惯性',
    description: '下一场初始 combo +2，更快进入高倍率区。',
    value: 2
  };
}

function applyAddCardReward(state: EventGameState, reward: RewardOption): RewardApplyResult {
  const template = getCardTemplate(reward.cardId ?? 'test-card-hot-rotation');
  const card = cloneCardForDeck(template, `${template.id}-reward-${state.rewardsTakenCount}`);

  state.drawPile.push(card);
  state.rewardsTakenCount += 1;

  return {
    message: `奖励生效：${card.name} 已加入牌组。`
  };
}

function applyUpgradeCardReward(
  state: EventGameState,
  reward: RewardOption
): RewardApplyResult {
  const cardId = reward.cardId;

  if (!cardId) {
    throw new Error('Upgrade reward is missing cardId.');
  }

  upgradeCardInDeck(state, cardId);
  state.rewardsTakenCount += 1;

  return {
    message: `奖励生效：${reward.cardName ?? cardId} 已升级。`
  };
}

function applyAddToolReward(state: EventGameState, reward: RewardOption): RewardApplyResult {
  const toolId = reward.toolId ?? 'test-tool-quant-terminal';
  const template = getToolTemplate(toolId);

  if (state.tools.some((tool) => tool.id === template.id)) {
    throw new Error(`Tool already owned: ${template.id}`);
  }

  state.tools.push(cloneTool(template));
  state.rewardsTakenCount += 1;

  return {
    message: `奖励生效：获得工具 ${template.name}。`
  };
}

function applyRemoveCardReward(
  state: EventGameState,
  reward: RewardOption
): RewardApplyResult {
  const cardId = reward.cardId;

  if (!cardId) {
    throw new Error('Remove card reward is missing cardId.');
  }

  removeCardFromDeck(state, cardId);
  state.rewardsTakenCount += 1;

  return {
    message: `奖励生效：${reward.cardName ?? cardId} 已从牌组移除。`
  };
}

function applyReduceRiskReward(
  state: EventGameState,
  reward: RewardOption
): RewardApplyResult {
  const amount = reward.value ?? 15;
  state.risk = Math.max(0, roundToTwoDecimals(state.risk - amount));
  state.rewardsTakenCount += 1;

  return {
    message: `奖励生效：Risk -${amount}。`
  };
}

function applyLockProfitReward(
  state: EventGameState,
  reward: RewardOption
): RewardApplyResult {
  const ratio = reward.value ?? 0.4;
  const lockAmount = roundToTwoDecimals(state.combo.currentChainProfit * ratio);

  state.lockedProfit = roundToTwoDecimals(state.lockedProfit + lockAmount);
  state.combo = {
    ...state.combo,
    currentChainProfit: roundToTwoDecimals(state.combo.currentChainProfit - lockAmount)
  };
  state.rewardsTakenCount += 1;

  return {
    message: `奖励生效：锁定 ${lockAmount} 浮盈。`
  };
}

function applyInitialComboReward(
  state: EventGameState,
  reward: RewardOption
): RewardApplyResult {
  const bonus = reward.value ?? 2;
  state.nextInitialCombo += bonus;
  state.rewardsTakenCount += 1;

  return {
    message: `奖励生效：下一场初始 combo +${bonus}。`
  };
}

function applyInitialComboBonus(state: EventGameState) {
  if (state.nextInitialCombo <= 0) {
    return;
  }

  const comboCount = state.combo.comboCount + state.nextInitialCombo;

  state.combo = {
    ...state.combo,
    comboCount,
    comboMultiplier: getComboMultiplier(comboCount),
    highestComboToday: Math.max(state.combo.highestComboToday, comboCount),
    highestComboThisRun: Math.max(state.combo.highestComboThisRun, comboCount)
  };

  state.combo.eventLog.push(
    `连击惯性生效：初始 combo +${state.nextInitialCombo}。`
  );
  state.nextInitialCombo = 0;
}

function getDeckCards(state: EventGameState) {
  return [...state.hand, ...state.drawPile];
}

function getRemovableCards(state: EventGameState) {
  return getDeckCards(state).filter((card) => card.id !== 'test-card-closeout');
}

function pickNoiseCard(cards: EventCard[], rng: Rng) {
  const sorted = [...cards].sort((left, right) => {
    if (left.rank !== right.rank) {
      return left.rank - right.rank;
    }

    return left.name.localeCompare(right.name, 'zh-CN');
  });

  const lowRank = sorted[0]?.rank;
  const lowRankCards = sorted.filter((card) => card.rank === lowRank);

  return rng.pick(lowRankCards);
}

function getCardTemplate(cardId: string) {
  const card = TEST_EVENT_CARDS.find((item) => item.id === cardId);

  if (!card) {
    throw new Error(`Unknown reward card template: ${cardId}`);
  }

  return card;
}

function getToolTemplate(toolId: string) {
  const tool = TEST_EVENT_TOOLS.find((item) => item.id === toolId);

  if (!tool) {
    throw new Error(`Unknown reward tool template: ${toolId}`);
  }

  return tool;
}

function cloneCardForDeck(card: EventCard, id: string): EventCard {
  return {
    ...card,
    id,
    effects: card.effects.map((effect) => ({ ...effect }))
  };
}

function cloneTool(tool: EventTool): EventTool {
  return {
    ...tool,
    trigger: { ...tool.trigger, meta: tool.trigger.meta ? { ...tool.trigger.meta } : undefined },
    effects: tool.effects.map((effect) => ({ ...effect }))
  };
}

function upgradeCardInDeck(state: EventGameState, cardId: string) {
  const upgrade = (card: EventCard): EventCard => {
    if (card.id !== cardId) {
      return card;
    }

    return {
      ...card,
      rank: Math.min(10, card.rank + 1),
      effects: card.effects.map((effect) => {
        if (effect.type === 'GAIN_PROFIT') {
          return {
            ...effect,
            value: roundToTwoDecimals(effect.value * 1.2)
          };
        }

        if (effect.type === 'GAIN_PROFIT_FROM_COMBO') {
          return {
            ...effect,
            profitPerCombo: roundToTwoDecimals(effect.profitPerCombo * 1.2)
          };
        }

        return effect;
      })
    };
  };

  state.hand = state.hand.map(upgrade);
  state.drawPile = state.drawPile.map(upgrade);
}

function removeCardFromDeck(state: EventGameState, cardId: string) {
  state.hand = state.hand.filter((card) => card.id !== cardId);
  state.drawPile = state.drawPile.filter((card) => card.id !== cardId);
}

function roundToTwoDecimals(value: number) {
  return Math.round(value * 100) / 100;
}

export function getRewardPhaseLabel(phase: EventGameState['phase']) {
  if (phase === 'reward') {
    return '选择奖励';
  }

  if (phase === 'postReward') {
    return '奖励已领取';
  }

  return null;
}
