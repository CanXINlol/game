import type { Run } from './types';
import { getShopServiceDiscount } from './tools';

export function canAfford(run: Run, price: number) {
  return run.cash >= price;
}

export function spendCash(run: Run, amount: number, reason: string): Run {
  if (amount > run.cash) return run;
  return {
    ...run,
    cash: run.cash - amount,
    turnSummary: [...run.turnSummary, `${reason}：支付 ${amount} 现金。`]
  };
}

export function gainCash(run: Run, amount: number, reason: string): Run {
  return {
    ...run,
    cash: run.cash + amount,
    turnSummary: [...run.turnSummary, `${reason}：获得 ${amount} 现金。`]
  };
}

export function getServicePrice(run: Run, basePrice: number) {
  return Math.floor(basePrice * getShopServiceDiscount(run));
}

export function getRemoveCardPrice(run: Run) {
  return getServicePrice(run, 80 + run.cardsRemovedCount * 30);
}

export function getUpgradePrice(run: Run) {
  return getServicePrice(run, 70);
}

export function getReduceRiskPrice(run: Run) {
  return getServicePrice(run, 60);
}

export function getRefreshPrice(run: Run) {
  return getServicePrice(run, 30 + run.shop.refreshCount * 15);
}

export function getCardShopPrice(rarity: string) {
  if (rarity === 'RARE') return 90;
  if (rarity === 'UNCOMMON') return 70;
  return 50;
}

export function getToolShopPrice(rarity: string) {
  if (rarity === 'RARE') return 220;
  if (rarity === 'UNCOMMON') return 180;
  return 150;
}




