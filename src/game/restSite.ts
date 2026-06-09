import {
  getAllDeckCards,
  isCardUpgraded,
  removeCardFromRun,
  spendCash,
  upgradeCardInRun,
  type EconomyResult
} from './economy';
import type { EventGameState } from './playCard';

export type RestChoiceId = 'UPGRADE_CARD' | 'REDUCE_RISK' | 'REMOVE_CARD';

export interface RestChoice {
  id: RestChoiceId;
  title: string;
  description: string;
  costText: string;
  rewardText: string;
  cashCost: number;
  needsCard: boolean;
}

export const REST_CHOICES: RestChoice[] = [
  {
    id: 'UPGRADE_CARD',
    title: '升级一张牌',
    description: '选择一张牌，强化其效果或降低费用。',
    costText: '免费，但本节点结束。',
    rewardText: '升级 1 张牌',
    cashCost: 0,
    needsCard: true
  },
  {
    id: 'REDUCE_RISK',
    title: '降低风险',
    description: '休息并重新评估仓位。',
    costText: '免费，但本节点结束。',
    rewardText: '风险 -20',
    cashCost: 0,
    needsCard: false
  },
  {
    id: 'REMOVE_CARD',
    title: '整理牌组',
    description: '支付现金删除一张牌，减少后续抽到噪音牌的概率。',
    costText: '50 现金，本节点结束。',
    rewardText: '删除 1 张牌',
    cashCost: 50,
    needsCard: true
  }
];

export function applyRestChoice(
  state: EventGameState,
  choiceId: RestChoiceId,
  cardId?: string
): EconomyResult {
  if (state.nodeActionUsed) {
    return { success: false, message: '本休整点已经选择过一次。' };
  }

  const choice = REST_CHOICES.find((item) => item.id === choiceId);

  if (!choice) {
    return { success: false, message: '未知休整选项。' };
  }

  if (choice.needsCard && !cardId) {
    return { success: false, message: '请先选择一张牌。' };
  }

  if (choiceId === 'UPGRADE_CARD') {
    const card = getAllDeckCards(state).find((item) => item.id === cardId);

    if (!card) {
      return { success: false, message: '没有找到要升级的牌。' };
    }

    if (isCardUpgraded(card)) {
      return { success: false, message: `${card.name} 已经升级过。` };
    }

    const result = upgradeCardInRun(state, card.id);
    if (result.success) state.nodeActionUsed = true;
    return result;
  }

  if (choiceId === 'REDUCE_RISK') {
    state.risk = Math.max(0, Math.round((state.risk - 20) * 100) / 100);
    state.nodeActionUsed = true;
    return { success: true, message: '休整完成：风险 -20。' };
  }

  const payment = spendCash(state, choice.cashCost, '休整点整理牌组');
  if (!payment.success) return payment;

  const result = removeCardFromRun(state, cardId ?? '');
  if (result.success) state.nodeActionUsed = true;
  return result;
}
