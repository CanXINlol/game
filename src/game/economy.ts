import type { EventCard, EventTool } from './effects';
import { aggregateChainSummary, type CashTransaction } from './feedback';
import type { EventGameState } from './playCard';
import { getTraderServicePriceMultiplier } from './traders';
import { upgradeCard } from './upgrades';

export const ECONOMY_PRICES = {
  commonCard: 45,
  advancedCard: 75,
  rareCard: 110,
  tool: 120,
  rareTool: 180,
  epicTool: 260,
  removeCardBase: 75,
  removeCardIncrease: 25,
  upgradeCard: 60,
  reduceRisk: 50,
  shopRefreshBase: 25,
  shopRefreshIncrease: 15,
  liquidationBuffer: 120,
  profitLockInsurance: 80,
  riskHedgeInsurance: 100
} as const;

export interface EconomyResult {
  success: boolean;
  message: string;
}

export function gainCash(
  state: EventGameState,
  amount: number,
  source = '现金收入'
): EconomyResult {
  if (amount <= 0) {
    return { success: false, message: '现金收入必须大于 0。' };
  }

  state.cash = roundToTwoDecimals(state.cash + amount);
  const message = `${source}：现金 +${amount}。`;
  recordCashTransaction(state, {
    amount,
    source,
    type: 'GAIN',
    message,
    turn: state.currentTurn,
    nodeId: state.routeMap.currentNodeId
  });
  state.combo.eventLog.push(message);
  return { success: true, message };
}

export function spendCash(
  state: EventGameState,
  amount: number,
  reason: string
): EconomyResult {
  if (state.cash < amount) {
    return {
      success: false,
      message: `现金不足：需要 ${amount}，当前 ${state.cash}。`
    };
  }

  state.cash = roundToTwoDecimals(state.cash - amount);
  const message = `${reason}：现金 -${amount}。`;
  recordCashTransaction(state, {
    amount,
    source: reason,
    type: 'SPEND',
    message,
    turn: state.currentTurn,
    nodeId: state.routeMap.currentNodeId
  });
  state.combo.eventLog.push(message);
  return { success: true, message };
}

export function cashOutFloatingProfit(
  state: EventGameState,
  ratio: number,
  source = '止盈'
) {
  const amount = roundToTwoDecimals(state.combo.currentChainProfit * ratio);

  if (amount <= 0) {
    return { success: false, message: '没有可转化为现金的浮盈。' };
  }

  state.combo = {
    ...state.combo,
    currentChainProfit: roundToTwoDecimals(state.combo.currentChainProfit - amount)
  };
  state.lockedProfit = roundToTwoDecimals(state.lockedProfit + amount);
  gainCash(state, amount, source);
  state.combo.eventLog.push(`${source}：${amount} 浮盈转为现金。`);
  return { success: true, message: `${source}：获得 ${amount} 现金。` };
}

export function addCardToDeck(state: EventGameState, card: EventCard) {
  state.drawPile.push(cloneCard(card, `${card.id}-owned-${state.cardsPurchasedCount}`));
}

export function addToolToRun(state: EventGameState, tool: EventTool) {
  if (state.tools.some((ownedTool) => ownedTool.id === tool.id)) {
    return { success: false, message: `已经拥有工具：${tool.name}。` };
  }

  state.tools.push(cloneTool(tool));
  return { success: true, message: `获得工具：${tool.name}。` };
}

export function removeCardFromRun(state: EventGameState, cardId: string) {
  const card = getAllDeckCards(state).find((item) => item.id === cardId);

  if (!card) {
    return { success: false, message: '没有找到要删除的牌。' };
  }

  state.hand = state.hand.filter((item) => item.id !== cardId);
  state.drawPile = state.drawPile.filter((item) => item.id !== cardId);
  state.discardPile = state.discardPile.filter((item) => item.id !== cardId);
  state.playedCardsThisTurn = state.playedCardsThisTurn.filter(
    (item) => item.id !== cardId
  );
  state.removedCards.push(card);

  return { success: true, message: `删除牌：${card.name}。` };
}

export function upgradeCardInRun(state: EventGameState, cardId: string) {
  const card = getAllDeckCards(state).find((item) => item.id === cardId);

  if (!card) {
    return { success: false, message: '没有找到要升级的牌。' };
  }

  if (isCardUpgraded(card)) {
    return { success: false, message: `${card.name} 已经升级过。` };
  }

  const upgrade = (item: EventCard) => (item.id === cardId ? upgradeCard(item) : item);

  state.hand = state.hand.map(upgrade);
  state.drawPile = state.drawPile.map(upgrade);
  state.discardPile = state.discardPile.map(upgrade);
  state.playedCardsThisTurn = state.playedCardsThisTurn.map(upgrade);

  return { success: true, message: `升级牌：${card.name}。` };
}

export function reduceRiskWithCash(state: EventGameState, amount = 15) {
  state.risk = Math.max(0, roundToTwoDecimals(state.risk - amount));
  return { success: true, message: `风险 -${amount}。` };
}

export function getRemoveCardCost(state: EventGameState) {
  return Math.round(
    (ECONOMY_PRICES.removeCardBase +
      state.cardsRemovedCount * ECONOMY_PRICES.removeCardIncrease) *
      getTraderServicePriceMultiplier(state)
  );
}

export function getAllDeckCards(state: EventGameState) {
  return [
    ...state.hand,
    ...state.drawPile,
    ...state.discardPile,
    ...state.playedCardsThisTurn
  ];
}

export function isRareCard(card: EventCard) {
  return card.rank >= 8 || card.cardType === 'FINISHER' || card.cardType === 'LEVERAGE';
}

export function getCardShopPrice(card: EventCard) {
  if (isRareCard(card)) return ECONOMY_PRICES.rareCard;
  if (card.rank >= 6 || card.cardRole === 'PAYOFF') return ECONOMY_PRICES.advancedCard;
  return ECONOMY_PRICES.commonCard;
}

export function getToolShopPrice(tool: EventTool) {
  if (tool.trigger.comboThresholds || tool.limitPerTurn) return ECONOMY_PRICES.epicTool;
  if (tool.trigger.type === 'LIMIT_UP' || tool.trigger.type === 'LEVERAGE_ADDED') {
    return ECONOMY_PRICES.rareTool;
  }
  return ECONOMY_PRICES.tool;
}

export function getShopRefreshCost(state: EventGameState) {
  return Math.round(
    (ECONOMY_PRICES.shopRefreshBase +
      state.shop.refreshCount * ECONOMY_PRICES.shopRefreshIncrease) *
      getTraderServicePriceMultiplier(state)
  );
}

export function getUpgradeCardCost(state: EventGameState) {
  return Math.round(
    ECONOMY_PRICES.upgradeCard * getTraderServicePriceMultiplier(state)
  );
}

export function getReduceRiskCost(state: EventGameState) {
  return Math.round(
    ECONOMY_PRICES.reduceRisk * getTraderServicePriceMultiplier(state)
  );
}

export function getInsurancePrice(state: EventGameState, basePrice: number) {
  return Math.round(basePrice * getTraderServicePriceMultiplier(state));
}

export function isCardUpgraded(card: EventCard) {
  return Boolean(card.playEffect?.includes('升级：'));
}

function cloneCard(card: EventCard, id: string): EventCard {
  return {
    ...card,
    id,
    tags: card.tags ? [...card.tags] : undefined,
    archetype: card.archetype,
    effects: card.effects.map((effect) => ({ ...effect }))
  };
}

function cloneTool(tool: EventTool): EventTool {
  return {
    ...tool,
    triggerEvents: tool.triggerEvents ? [...tool.triggerEvents] : undefined,
    trigger: {
      ...tool.trigger,
      meta: tool.trigger.meta ? { ...tool.trigger.meta } : undefined,
      comboThresholds: tool.trigger.comboThresholds
        ? [...tool.trigger.comboThresholds]
        : undefined
    },
    effects: tool.effects.map((effect) => ({ ...effect }))
  };
}

function roundToTwoDecimals(value: number) {
  return Math.round(value * 100) / 100;
}

export function recordCashTransaction(
  state: EventGameState,
  transaction: CashTransaction
) {
  state.cashTransactions.push(transaction);
  state.cashTransactionsThisAction.push(transaction);
  state.lastChainSummary = aggregateChainSummary(
    state.resolvedEventsThisAction,
    state.cashTransactionsThisAction
  );
}
