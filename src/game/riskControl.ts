import { getInsurance } from '../data/insurance';
import { spendCash } from './economy';
import { applyInsurancePurchaseBonus, getRiskControlDiscount } from './tools';
import type { Run } from './types';

export type RiskControlChoice = 'REDUCE_RISK' | 'REMOVE_CARD' | 'LOCK_PROFIT' | 'BUY_INSURANCE';

export function applyRiskControlChoice(
  run: Run,
  choice: RiskControlChoice,
  cardId?: string,
  insuranceId?: string
): Run {
  if (run.status !== 'RISK_CONTROL') return run;

  if (choice === 'REDUCE_RISK') {
    return {
      ...run,
      currentEncounter: run.currentEncounter
        ? { ...run.currentEncounter, risk: Math.max(0, run.currentEncounter.risk - 25) }
        : null,
      turnSummary: ['风控室：风险 -25。']
    };
  }

  if (choice === 'REMOVE_CARD' && cardId) {
    let next = spendCash(run, 80, '风控室删牌');
    const removeOne = (pile: string[]) => {
      const idx = pile.indexOf(cardId);
      if (idx < 0) return pile;
      return [...pile.slice(0, idx), ...pile.slice(idx + 1)];
    };
    return {
      ...next,
      deck: removeOne(next.deck),
      drawPile: removeOne(next.drawPile),
      hand: removeOne(next.hand),
      cardsRemovedCount: next.cardsRemovedCount + 1,
      turnSummary: ['风控室：支付 80 现金删除一张牌。']
    };
  }

  if (choice === 'LOCK_PROFIT' && run.currentEncounter) {
    const locked = Math.floor(run.currentEncounter.floatingProfit * 0.3);
    return {
      ...run,
      currentEncounter: {
        ...run.currentEncounter,
        lockedProfit: run.currentEncounter.lockedProfit + locked
      },
      turnSummary: [`风控室：锁定 ${locked} 浮盈。`]
    };
  }

  if (choice === 'BUY_INSURANCE' && insuranceId) {
    const ins = getInsurance(insuranceId);
    const price = Math.floor(ins.price * getRiskControlDiscount(run));
    let next = spendCash(run, price, `折扣购买 ${ins.name}`);
    next = {
      ...next,
      insurances: [...next.insurances, { insuranceId, encounterScoped: true, used: false }]
    };
    return applyInsurancePurchaseBonus(next);
  }

  return run;
}




