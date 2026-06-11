import { INSURANCES } from '../data/insurance';
import { STOCK_CARDS } from '../data/stockCards';
import { TOOLS } from '../data/tools';
import {
  getCardShopPrice,
  getRefreshPrice,
  getRemoveCardPrice,
  getReduceRiskPrice,
  getToolShopPrice,
  getUpgradePrice,
  spendCash
} from './economy';
import { recordShopPurchase } from './telemetry';
import { applyInsurancePurchaseBonus } from './tools';
import { createRng } from './rng';
import type { Run, ShopItem, ShopState } from './types';

export function createShop(seed: string): ShopState {
  const rng = createRng(`${seed}-shop`);
  const cards = rng.shuffle(STOCK_CARDS.filter((c) => c.rarity !== 'COMMON')).slice(0, 3);
  const tools = rng.shuffle(TOOLS).slice(0, 2);
  const insurance = rng.shuffle(INSURANCES).slice(0, 2);

  const items: ShopItem[] = [
    ...cards.map((card, i) => ({
      id: `shop-card-${i}`,
      section: 'cards' as const,
      name: card.name,
      description: card.shortText,
      price: getCardShopPrice(card.rarity),
      cardId: card.id,
      sold: false
    })),
    ...tools.map((tool, i) => ({
      id: `shop-tool-${i}`,
      section: 'tools' as const,
      name: tool.name,
      description: tool.description,
      price: getToolShopPrice(tool.rarity),
      toolId: tool.id,
      sold: false
    })),
    ...insurance.map((ins, i) => ({
      id: `shop-ins-${i}`,
      section: 'insurance' as const,
      name: ins.name,
      description: ins.description,
      price: ins.price,
      insuranceId: ins.id,
      sold: false
    })),
    {
      id: 'service-remove',
      section: 'services',
      name: '删牌',
      description: '支付递增费用，从牌组删除一张牌。',
      price: 80,
      serviceType: 'REMOVE_CARD',
      sold: false
    },
    {
      id: 'service-upgrade',
      section: 'services',
      name: '升级卡牌',
      description: '升级一张牌的效果。',
      price: 70,
      serviceType: 'UPGRADE_CARD',
      sold: false
    },
    {
      id: 'service-risk',
      section: 'services',
      name: '降风险',
      description: '风险 -15。',
      price: 60,
      serviceType: 'REDUCE_RISK',
      sold: false
    },
    {
      id: 'service-refresh',
      section: 'services',
      name: '刷新商店',
      description: '重新生成商品，费用递增。',
      price: 30,
      serviceType: 'REFRESH',
      sold: false
    }
  ];

  return { items, removeCardCount: 0, refreshCount: 0 };
}

export function buyShopItem(run: Run, itemId: string, cardToRemove?: string): Run {
  const item = run.shop.items.find((i) => i.id === itemId);
  if (!item || item.sold) return run;

  const price =
    item.serviceType === 'REMOVE_CARD'
      ? getRemoveCardPrice(run)
      : item.serviceType === 'REFRESH'
        ? getRefreshPrice(run)
        : item.serviceType === 'UPGRADE_CARD'
          ? getUpgradePrice(run)
          : item.serviceType === 'REDUCE_RISK'
            ? getReduceRiskPrice(run)
            : item.price;

  if (run.cash < price) return run;

  let next = spendCash(run, price, `购买 ${item.name}`);
  recordShopPurchase(next, item.name);

  if (item.cardId) {
    next = { ...next, deck: [...next.deck, item.cardId], drawPile: [...next.drawPile, item.cardId] };
  }

  if (item.toolId && !next.tools.includes(item.toolId)) {
    next = { ...next, tools: [...next.tools, item.toolId] };
  }

  if (item.insuranceId) {
    next = {
      ...next,
      insurances: [
        ...next.insurances,
        { insuranceId: item.insuranceId, encounterScoped: true, used: false }
      ]
    };
    next = applyInsurancePurchaseBonus(next);
  }

  if (item.serviceType === 'REMOVE_CARD' && cardToRemove) {
    next = removeCardFromDeck(next, cardToRemove);
    next = { ...next, cardsRemovedCount: next.cardsRemovedCount + 1 };
  }

  if (item.serviceType === 'REDUCE_RISK' && next.currentEncounter) {
    next = {
      ...next,
      currentEncounter: {
        ...next.currentEncounter,
        risk: Math.max(0, next.currentEncounter.risk - 15)
      }
    };
  }

  if (item.serviceType === 'REFRESH') {
    const newShop = createShop(`${next.rngSeed}-${next.shop.refreshCount + 1}`);
    next = { ...next, shop: { ...newShop, refreshCount: next.shop.refreshCount + 1 } };
    return next;
  }

  const items = next.shop.items.map((i) => (i.id === itemId ? { ...i, sold: true } : i));
  return { ...next, shop: { ...next.shop, items } };
}

function removeCardFromDeck(run: Run, cardId: string): Run {
  const removeOne = (pile: string[]) => {
    const idx = pile.indexOf(cardId);
    if (idx < 0) return pile;
    return [...pile.slice(0, idx), ...pile.slice(idx + 1)];
  };

  return {
    ...run,
    deck: removeOne(run.deck),
    drawPile: removeOne(run.drawPile),
    hand: removeOne(run.hand),
    discardPile: removeOne(run.discardPile)
  };
}




