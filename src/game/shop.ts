import { FORMAL_EVENT_CARDS, FORMAL_EVENT_TOOLS } from './formalContent';
import {
  ECONOMY_PRICES,
  addCardToDeck,
  addToolToRun,
  gainCash,
  getAllDeckCards,
  getCardShopPrice,
  getInsurancePrice,
  getRemoveCardCost,
  getReduceRiskCost,
  getShopRefreshCost,
  getToolShopPrice,
  getUpgradeCardCost,
  isCardUpgraded,
  reduceRiskWithCash,
  removeCardFromRun,
  spendCash,
  upgradeCardInRun,
  type EconomyResult
} from './economy';
import type { EventCard, EventTool } from './effects';
import type { EventGameState } from './playCard';
import { createRng } from './rng';

export type ShopItemType = 'CARD' | 'TOOL' | 'INSURANCE' | 'SERVICE';
export type ShopServiceType =
  | 'REMOVE_CARD'
  | 'UPGRADE_CARD'
  | 'REDUCE_RISK';

export type InsuranceType = 'LIQUIDATION_BUFFER' | 'PROFIT_LOCK' | 'RISK_HEDGE';

export interface ShopItem {
  id: string;
  type: ShopItemType;
  title: string;
  description: string;
  price: number;
  sold: boolean;
  cardId?: string;
  toolId?: string;
  insuranceType?: InsuranceType;
  serviceType?: ShopServiceType;
}

export interface ShopState {
  id: string;
  sections: {
    cards: ShopItem[];
    tools: ShopItem[];
    insurance: ShopItem[];
    services: ShopItem[];
  };
  items: ShopItem[];
  refreshCount: number;
}

export type RiskControlAction =
  | 'REMOVE_CARD'
  | 'UPGRADE_CARD'
  | 'REDUCE_RISK'
  | 'LOCK_PROFIT';

export interface RiskControlOption {
  id: RiskControlAction;
  title: string;
  description: string;
  price: number;
}

export function createShopState(state: EventGameState): ShopState {
  const rng = createRng(`${state.seed}-shop-${state.routeMap.currentNodeId ?? 'free'}-${state.shopVisitCount}`);
  const cards = rng.shuffle(getAvailableShopCards(state)).slice(0, 3);
  const tools = rng.shuffle(getAvailableShopTools(state)).slice(0, 2);
  const sections = {
    cards: cards.map((card) => createCardItem(card)),
    tools: tools.map((tool) => createToolItem(tool)),
    insurance: createInsuranceItems(state),
    services: createServiceItems(state)
  };
  const items = [
    ...sections.cards,
    ...sections.tools,
    ...sections.insurance,
    ...sections.services
  ];

  return {
    id: `shop-${state.shopVisitCount}`,
    sections,
    items,
    refreshCount: 0
  };
}

function createServiceItems(state: EventGameState): ShopItem[] {
  return [
    {
      id: 'service-remove-card',
      type: 'SERVICE',
      serviceType: 'REMOVE_CARD',
      title: '删除牌',
      description: '移除牌组中的第一张可删牌。',
      price: getRemoveCardCost(state),
      sold: false
    },
    {
      id: 'service-upgrade-card',
      type: 'SERVICE',
      serviceType: 'UPGRADE_CARD',
      title: '升级牌',
      description: '升级牌组中的第一张可升级牌。',
      price: getUpgradeCardCost(state),
      sold: false
    },
    {
      id: 'service-reduce-risk',
      type: 'SERVICE',
      serviceType: 'REDUCE_RISK',
      title: '降低风险',
      description: '支付现金，风险 -15。',
      price: getReduceRiskCost(state),
      sold: false
    }
  ];
}

function createInsuranceItems(state: EventGameState): ShopItem[] {
  const owned = new Set(state.consumables.map((item) => item.id));
  const items: ShopItem[] = [
    {
      id: 'insurance-liquidation-buffer',
      type: 'INSURANCE',
      insuranceType: 'LIQUIDATION_BUFFER',
      title: '爆仓缓冲',
      description: '本节点第一次爆仓时，risk 降到 maxRisk - 10。',
      price: getInsurancePrice(state, ECONOMY_PRICES.liquidationBuffer),
      sold: false
    },
    {
      id: 'insurance-profit-lock',
      type: 'INSURANCE',
      insuranceType: 'PROFIT_LOCK',
      title: '收益锁',
      description: '下个节点结束时自动锁定 40% floatingProfit。',
      price: getInsurancePrice(state, ECONOMY_PRICES.profitLockInsurance),
      sold: false
    },
    {
      id: 'insurance-risk-hedge',
      type: 'INSURANCE',
      insuranceType: 'RISK_HEDGE',
      title: '风险对冲',
      description: '下个节点 risk_GAINED 降低 30%。',
      price: getInsurancePrice(state, ECONOMY_PRICES.riskHedgeInsurance),
      sold: false
    }
  ];

  return items.filter((item) => !owned.has(item.id));
}

export function buyShopItem(state: EventGameState, itemId: string): EconomyResult {
  const item = state.shop.items.find((shopItem) => shopItem.id === itemId);

  if (!item) {
    return { success: false, message: '没有找到该商品。' };
  }

  if (item.sold) {
    return { success: false, message: '该商品已经售出。' };
  }

  const payment = spendCash(state, item.price, `购买${item.title}`);

  if (!payment.success) {
    return payment;
  }

  const result = applyShopItem(state, item);

  if (!result.success) {
    gainCash(state, item.price, '购买失败退款');
    return result;
  }

  item.sold = true;
  return {
    success: true,
    message: `${result.message} 花费 ${item.price} 现金。`
  };
}

export function refreshShop(state: EventGameState): EconomyResult {
  const refreshCost = getShopRefreshCost(state);
  const payment = spendCash(state, refreshCost, '刷新商店');

  if (!payment.success) {
    return payment;
  }

  const nextRefreshCount = state.shop.refreshCount + 1;
  state.shopVisitCount += 1;
  state.shop = createShopState(state);
  state.shop.refreshCount = nextRefreshCount;
  return { success: true, message: '商店已刷新。' };
}

export function getRiskControlOptions(state: EventGameState): RiskControlOption[] {
  return [
    {
      id: 'REMOVE_CARD',
      title: '删除牌',
      description: '移除 1 张牌，之后价格逐次提高。',
      price: getRemoveCardCost(state)
    },
    {
      id: 'UPGRADE_CARD',
      title: '升级牌',
      description: '升级 1 张牌，让牌面更强。',
      price: getUpgradeCardCost(state)
    },
    {
      id: 'REDUCE_RISK',
      title: '降低风险',
      description: '风险 -15。',
      price: getReduceRiskCost(state)
    },
    {
      id: 'LOCK_PROFIT',
      title: '锁定浮盈',
      description: '将 30% 当前浮盈转为现金。',
      price: 0
    }
  ];
}

export function applyRiskControlAction(
  state: EventGameState,
  action: RiskControlAction,
  cardId?: string
): EconomyResult {
  if (state.nodeActionUsed) {
    return { success: false, message: '本节点已经完成过一次操作。' };
  }

  if (action === 'REMOVE_CARD') {
    const targetCardId = cardId ?? getAllDeckCards(state)[0]?.id;

    if (!targetCardId) {
      return { success: false, message: '没有可删除的牌。' };
    }

    const payment = spendCash(state, getRemoveCardCost(state), '删除牌');
    if (!payment.success) return payment;

    const result = removeCardFromRun(state, targetCardId);
    if (result.success) {
      state.cardsRemovedCount += 1;
      state.nodeActionUsed = true;
    }
    return result;
  }

  if (action === 'UPGRADE_CARD') {
    const targetCardId = cardId ?? getAllDeckCards(state)[0]?.id;

    if (!targetCardId) {
      return { success: false, message: '没有可升级的牌。' };
    }

    const targetCard = getAllDeckCards(state).find((card) => card.id === targetCardId);
    if (!targetCard || isCardUpgraded(targetCard)) {
      return { success: false, message: '这张牌已经升级过，不能重复升级。' };
    }

    const payment = spendCash(state, getUpgradeCardCost(state), '升级牌');
    if (!payment.success) return payment;

    const result = upgradeCardInRun(state, targetCardId);
    if (result.success) {
      state.nodeActionUsed = true;
    }
    return result;
  }

  if (action === 'REDUCE_RISK') {
    const payment = spendCash(state, getReduceRiskCost(state), '降低风险');
    if (!payment.success) return payment;

    const result = reduceRiskWithCash(state);
    if (result.success) {
      state.nodeActionUsed = true;
    }
    return result;
  }

  const amount = Math.round(state.combo.currentChainProfit * 0.3 * 100) / 100;

  if (amount <= 0) {
    return { success: false, message: '没有可锁定的浮盈。' };
  }

  state.combo.currentChainProfit = Math.round(
    (state.combo.currentChainProfit - amount) * 100
  ) / 100;
  state.lockedProfit = Math.round((state.lockedProfit + amount) * 100) / 100;
  gainCash(state, amount, '风控室锁定浮盈');
  state.nodeActionUsed = true;
  return { success: true, message: `锁定 ${amount} 浮盈并转为现金。` };
}

function applyShopItem(state: EventGameState, item: ShopItem): EconomyResult {
  if (item.type === 'CARD') {
    const card = FORMAL_EVENT_CARDS.find((candidate) => candidate.id === item.cardId);

    if (!card) {
      return { success: false, message: '商品牌不存在。' };
    }

    addCardToDeck(state, card);
    state.cardsPurchasedCount += 1;
    return { success: true, message: `获得牌：${card.name}。` };
  }

  if (item.type === 'TOOL') {
    const tool = FORMAL_EVENT_TOOLS.find((candidate) => candidate.id === item.toolId);

    if (!tool) {
      return { success: false, message: '商品工具不存在。' };
    }

    const result = addToolToRun(state, tool);
    if (result.success) state.toolsPurchasedCount += 1;
    return result;
  }

  if (item.type === 'INSURANCE') {
    return buyInsurance(state, item);
  }

  if (item.serviceType === 'REMOVE_CARD') {
    const targetCard = getAllDeckCards(state)[0];
    if (!targetCard) return { success: false, message: '没有可删除的牌。' };
    const result = removeCardFromRun(state, targetCard.id);
    if (result.success) state.cardsRemovedCount += 1;
    return result;
  }

  if (item.serviceType === 'UPGRADE_CARD') {
    const targetCard = getAllDeckCards(state).find((card) => !isCardUpgraded(card));
    if (!targetCard) return { success: false, message: '没有可升级的牌。' };
    return upgradeCardInRun(state, targetCard.id);
  }

  if (item.serviceType === 'REDUCE_RISK') {
    return reduceRiskWithCash(state);
  }

  return { success: false, message: '暂不支持该服务。' };
}

function buyInsurance(state: EventGameState, item: ShopItem): EconomyResult {
  state.consumables.push({
    id: item.id,
    name: item.title,
    description: item.description
  });

  if (item.insuranceType === 'LIQUIDATION_BUFFER') {
    state.hasBossInsurance = true;
    state.bossInsuranceUsed = false;
  }

  return { success: true, message: `购买保险：${item.title}。` };
}

function createCardItem(card: EventCard): ShopItem {
  return {
    id: `card-${card.id}`,
    type: 'CARD',
    title: card.name,
    description: card.playEffect ?? '加入 1 张牌。',
    price: getCardShopPrice(card),
    sold: false,
    cardId: card.id
  };
}

function createToolItem(tool: EventTool): ShopItem {
  return {
    id: `tool-${tool.id}`,
    type: 'TOOL',
    title: tool.name,
    description: tool.description,
    price: getToolShopPrice(tool),
    sold: false,
    toolId: tool.id
  };
}

function getAvailableShopCards(state: EventGameState) {
  const ownedCardTemplateIds = new Set(
    getAllDeckCards(state).map((card) => card.id.split('-owned-')[0])
  );

  return FORMAL_EVENT_CARDS.filter((card) => !ownedCardTemplateIds.has(card.id));
}

function getAvailableShopTools(state: EventGameState) {
  const ownedToolIds = new Set(state.tools.map((tool) => tool.id));
  return FORMAL_EVENT_TOOLS.filter((tool) => !ownedToolIds.has(tool.id));
}
