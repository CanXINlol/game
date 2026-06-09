import { getComboMultiplier } from './combo';
import { discardContinuousTurn, drawFromContinuousDeck } from './deck';
import { gainCash } from './economy';
import {
  type EventCard,
  type EventTool
} from './effects';
import { FORMAL_EVENT_CARDS, FORMAL_EVENT_TOOLS } from './formalContent';
import { createMarketPressureByIndex } from './marketPressure';
import type { EventGameState } from './playCard';
import { getRouteNode } from './routeMap';
import { createRng, type Rng } from './rng';
import type { EventCardRole } from './types';
import { getCardUpgradePreview, upgradeCard } from './upgrades';

export type RewardKind =
  | 'ADD_CARD'
  | 'UPGRADE_CARD'
  | 'ADD_TOOL'
  | 'REMOVE_CARD'
  | 'REDUCE_RISK'
  | 'LOCK_PROFIT'
  | 'GAIN_CASH'
  | 'INITIAL_COMBO'
  | 'SKIP';

export interface RewardOption {
  id: string;
  kind: RewardKind;
  title: string;
  description: string;
  cardId?: string;
  cardName?: string;
  cardRole?: EventCardRole;
  cardArchetype?: string;
  toolId?: string;
  toolName?: string;
  value?: number;
}

export interface RewardApplyResult {
  message: string;
}

const REWARD_OPTION_COUNT = 3;
const EVENT_HAND_SIZE = 5;

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
    case 'GAIN_CASH':
      return applyGainCashReward(state, reward);
    case 'INITIAL_COMBO':
      return applyInitialComboReward(state, reward);
    case 'SKIP':
      return applySkipReward(state);
    default:
      throw new Error(`Unsupported reward kind.`);
  }
}

export function skipReward(state: EventGameState): RewardApplyResult {
  return applySkipReward(state);
}

export function startNextMarketPressure(state: EventGameState): EventGameState {
  const preparedState = discardContinuousTurn(state);
  state.hand = preparedState.hand;
  state.discardPile = preparedState.discardPile;
  state.playedCardsThisTurn = preparedState.playedCardsThisTurn;
  state.cardsDrawnThisTurn = preparedState.cardsDrawnThisTurn;

  const nextIndex = state.marketPressureIndex + 1;
  const nextPressure = createMarketPressureByIndex(state.seed, nextIndex);

  state.marketPressureIndex = nextIndex;
  state.marketPressure = nextPressure;
  state.encounterTurn = 0;
  state.currentTurn = 1;
  state.currentIntentId = nextPressure.intent.id;
  state.lastResolvedIntentId = null;
  state.intentResolvedThisTurn = false;
  state.canResolveIntent = false;
  state.encounterStatus = 'ACTIVE';
  state.phase = 'PLAYER_TURN';
  state.rewardChoices = [];
  state.ap = state.maxAp;
  state.actionPoints = state.ap;
  state.maxActionPoints = state.maxAp;
  state.playedCardsThisTurn = [];
  state.lastPlayedCard = null;
  state.lastPlayedCost = null;
  state.turboturnStep = 0;
  state.turboturnMultiplier = 1;
  state.intentProfitMultiplier = 1;
  state.intentRiskMultiplier = 1;
  state.weakenedSector = null;
  state.resolvedEventTypes = [];
  state.toolUseCounts = {};
  state.traderPassiveUsesThisTurn = {};
  state.triggeredComboMilestones = {};
  drawOpeningHand(state);

  applyInitialComboBonus(state);

  state.combo.eventLog.push(
    `进入下一压力盘：${nextPressure.name}。`
  );

  return state;
}

function drawOpeningHand(state: EventGameState) {
  const drawCount = Math.max(0, EVENT_HAND_SIZE - state.hand.length);
  const nextState = drawFromContinuousDeck(state, drawCount);

  state.hand = nextState.hand;
  state.drawPile = nextState.drawPile;
  state.discardPile = nextState.discardPile;
  state.reshuffleCount = nextState.reshuffleCount;
  state.cardsDrawnThisTurn = nextState.cardsDrawnThisTurn;
}

export function enterDayEndAfterReward(state: EventGameState): EventGameState {
  state.phase = 'DAY_END';
  state.rewardChoices = [];
  state.combo.eventLog.push('奖励已领取，进入日终选择。');
  return state;
}

function buildRewardCandidates(state: EventGameState, rng: Rng): RewardOption[] {
  const candidates: Array<RewardOption | null> = [];
  const rewardIndex = state.rewardsTakenCount;

  candidates.push(createAddCardReward(state, rng, rewardIndex));
  const nodeType = getCurrentRewardNodeType(state);

  if (nodeType === 'ELITE_MARKET' || nodeType === 'BOSS') {
    candidates.push(createAddToolReward(state, rng, rewardIndex));
    candidates.push(createUpgradeCardReward(state, rng, rewardIndex));
    candidates.push(createGainCashReward(rewardIndex, nodeType === 'BOSS' ? 100 : 60));
  } else if (nodeType === 'NORMAL_MARKET') {
    candidates.push(createReduceRiskReward(rewardIndex, 8));
    candidates.push(createGainCashReward(rewardIndex, 25));
    candidates.push(createLockProfitReward(state, rewardIndex));
  } else if (nodeType === 'RISK_CONTROL') {
    candidates.push(createRemoveCardReward(state, rng, rewardIndex));
    candidates.push(createUpgradeCardReward(state, rng, rewardIndex));
    candidates.push(createReduceRiskReward(rewardIndex, 15));
    candidates.push(createLockProfitReward(state, rewardIndex));
  } else {
    candidates.push(createAddToolReward(state, rng, rewardIndex));
    candidates.push(createRemoveCardReward(state, rng, rewardIndex));
    candidates.push(createReduceRiskReward(rewardIndex, 15));
    candidates.push(createInitialComboReward(rewardIndex));
  }

  return candidates.filter((item): item is RewardOption => item !== null);
}

function createAddCardReward(
  state: EventGameState,
  rng: Rng,
  rewardIndex: number
): RewardOption | null {
  const availableCards = getTieredRewardCards(state).filter(
    (card) => !getDeckCards(state).some((deckCard) => deckCard.id.startsWith(card.id))
  );

  if (availableCards.length === 0) {
    return null;
  }

  const card = pickRewardCard(state, availableCards, rng);

  return {
    id: `reward-${rewardIndex}-add-card-${card.id}`,
    kind: 'ADD_CARD',
    title: `新牌：${card.name}`,
    description: `将 ${card.name} 加入 drawPile，强化当前构筑方向。`,
    cardId: card.id,
    cardName: card.name,
    cardRole: card.cardRole,
    cardArchetype: card.archetype
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
  const preview = getCardUpgradePreview(card);

  return {
    id: `reward-${rewardIndex}-upgrade-${card.id}`,
    kind: 'UPGRADE_CARD',
    title: preview.title,
    description: preview.description,
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
  const availableTools = getTieredRewardTools(state).filter(
    (tool) => !ownedToolIds.has(tool.id)
  );

  if (availableTools.length === 0) {
    return null;
  }

  const tool = rng.pick(availableTools);

  return {
    id: `reward-${rewardIndex}-add-tool-${tool.id}`,
    kind: 'ADD_TOOL',
    title: `工具：${tool.name}`,
    description: `${tool.description}`,
    toolId: tool.id,
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
    title: `删牌：${card.name}`,
    description: `从牌组移除 ${card.name}，提升抽到关键牌的概率。`,
    cardId: card.id,
    cardName: card.name
  };
}

function createReduceRiskReward(rewardIndex: number, value = 15): RewardOption {
  return {
    id: `reward-${rewardIndex}-reduce-risk`,
    kind: 'REDUCE_RISK',
    title: '风控休息',
    description: `Risk -${value}，为下一轮 combo 腾出风险空间。`,
    value
  };
}

function createGainCashReward(rewardIndex: number, value: number): RewardOption {
  return {
    id: `reward-${rewardIndex}-gain-cash-${value}`,
    kind: 'GAIN_CASH',
    title: '现金奖励',
    description: `获得 ${value} 现金，用于商店和风控室。`,
    value
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
  const template = getCardTemplate(reward.cardId ?? FORMAL_EVENT_CARDS[0].id);
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
  const toolId = reward.toolId ?? FORMAL_EVENT_TOOLS[0].id;
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

function applyGainCashReward(
  state: EventGameState,
  reward: RewardOption
): RewardApplyResult {
  const amount = reward.value ?? 15;
  gainCash(state, amount, '奖励现金');
  state.rewardsTakenCount += 1;

  return {
    message: `奖励生效：现金 +${amount}。`
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

function applySkipReward(state: EventGameState): RewardApplyResult {
  gainCash(state, 15, '跳过奖励补偿');
  state.rewardsTakenCount += 1;

  return {
    message: '跳过奖励：现金 +15，保持牌组纯度。'
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
  return [
    ...state.hand,
    ...state.drawPile,
    ...state.discardPile,
    ...state.playedCardsThisTurn
  ];
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

function getCurrentRewardNodeType(state: EventGameState) {
  const node = state.routeMap.currentNodeId
    ? getRouteNode(state.routeMap, state.routeMap.currentNodeId)
    : null;

  return node?.type ?? 'NORMAL_MARKET';
}

function getCurrentAct(state: EventGameState) {
  return state.routeMap.currentAct;
}

function getTieredRewardCards(state: EventGameState) {
  const act = getCurrentAct(state);

  if (act === 1) {
    return FORMAL_EVENT_CARDS.filter((card) => {
      if (card.cardType === 'COPY' || card.cardType === 'LEVERAGE') return false;
      if (card.cardType === 'FINISHER') return false;
      if (card.rank >= 9) return false;
      return (
        card.cardRole === 'STARTER' ||
        card.cardType === 'BUY' ||
        card.cardType === 'DRAW' ||
        card.cardType === 'CASH_OUT' ||
        card.cardType === 'CHASE' ||
        card.cardType === 'DIP_BUY' ||
        card.cardType === 'SECTOR'
      );
    });
  }

  if (act === 2) {
    return FORMAL_EVENT_CARDS.filter((card) => {
      if (card.cardType === 'FINISHER') return false;
      return (
        card.cardType === 'COPY' ||
        card.cardType === 'LEVERAGE' ||
        card.cardType === 'RISK' ||
        card.cardType === 'CHASE' ||
        card.cardType === 'DRAW' ||
        card.cardType === 'BUY' ||
        card.cardType === 'CASH_OUT' ||
        card.rank >= 7
      );
    });
  }

  return FORMAL_EVENT_CARDS.filter(
    (card) =>
      card.cardType === 'FINISHER' ||
      card.cardType === 'LEVERAGE' ||
      card.rank >= 8 ||
      card.cardRole === 'PAYOFF'
  );
}

function getTieredRewardTools(state: EventGameState) {
  const act = getCurrentAct(state);

  if (act === 1) {
    return FORMAL_EVENT_TOOLS.filter(
      (tool) =>
        tool.trigger.type === 'SECTOR_TRIGGERED' ||
        tool.trigger.type === 'RISK_GAINED' ||
        tool.trigger.type === 'CASH_OUT'
    );
  }

  if (act === 2) {
    return FORMAL_EVENT_TOOLS.filter(
      (tool) =>
        tool.trigger.type === 'LIMIT_UP' ||
        tool.trigger.type === 'LEVERAGE_ADDED' ||
        tool.trigger.type === 'RISK_GAINED' ||
        tool.trigger.type === 'CARD_COPIED' ||
        tool.trigger.type === 'SECTOR_TRIGGERED'
    );
  }

  return FORMAL_EVENT_TOOLS;
}

function pickRewardCard(
  state: EventGameState,
  cards: EventCard[],
  rng: Rng
) {
  const nodeType = getCurrentRewardNodeType(state);

  if (nodeType === 'BOSS') {
    const finisherCards = cards.filter((card) => card.cardType === 'FINISHER');

    if (finisherCards.length > 0) {
      return rng.pick(finisherCards);
    }

    const bossCards = cards.filter(
      (card) => card.cardType === 'FINISHER' || card.rank >= 8
    );

    if (bossCards.length > 0) {
      return rng.pick(bossCards);
    }
  }

  if (nodeType === 'ELITE_MARKET') {
    const eliteCards = cards.filter((card) => card.rank >= 7);

    if (eliteCards.length > 0) {
      return rng.pick(eliteCards);
    }
  }

  const normalCards = cards.filter((card) => card.rank <= 7);
  return rng.pick(normalCards.length > 0 ? normalCards : cards);
}

function getCardTemplate(cardId: string) {
  const card = FORMAL_EVENT_CARDS.find((item) => item.id === cardId);

  if (!card) {
    throw new Error(`Unknown reward card template: ${cardId}`);
  }

  return card;
}

function getToolTemplate(toolId: string) {
  const tool = FORMAL_EVENT_TOOLS.find((item) => item.id === toolId);

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
    triggerEvents: tool.triggerEvents ? [...tool.triggerEvents] : undefined,
    trigger: { ...tool.trigger, meta: tool.trigger.meta ? { ...tool.trigger.meta } : undefined },
    effects: tool.effects.map((effect) => ({ ...effect }))
  };
}

function upgradeCardInDeck(state: EventGameState, cardId: string) {
  const upgrade = (card: EventCard): EventCard => {
    if (card.id !== cardId) {
      return card;
    }

    return upgradeCard(card);
  };

  state.hand = state.hand.map(upgrade);
  state.drawPile = state.drawPile.map(upgrade);
  state.discardPile = state.discardPile.map(upgrade);
  state.playedCardsThisTurn = state.playedCardsThisTurn.map(upgrade);
}

function removeCardFromDeck(state: EventGameState, cardId: string) {
  state.hand = state.hand.filter((card) => card.id !== cardId);
  state.drawPile = state.drawPile.filter((card) => card.id !== cardId);
  state.discardPile = state.discardPile.filter((card) => card.id !== cardId);
  state.playedCardsThisTurn = state.playedCardsThisTurn.filter(
    (card) => card.id !== cardId
  );
}

function roundToTwoDecimals(value: number) {
  return Math.round(value * 100) / 100;
}

export function getRewardPhaseLabel(phase: EventGameState['phase']) {
  if (phase === 'REWARD') {
    return '选择奖励';
  }

  return null;
}
