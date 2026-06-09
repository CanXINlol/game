import type { CardEffect, EventCard, EventTool } from './effects';
import {
  localizeCardType,
  localizeCardRole,
  localizeSector,
  localizeText
} from './localization';
import type { EventGameState } from './playCard';

export interface CardPreviewInfo {
  cardName: string;
  cardType: string;
  role: string;
  archetype: string;
  mainEffect: string;
  timingHint: string;
  riskText: string;
  cost: number;
  baseProfit: number;
  baseRisk: number;
  estimatedPressureDamage: number;
  possibleEvents: string[];
  possibleTools: string[];
  notes: string[];
  playable: boolean;
  reason?: string;
}

export function createCardPreview(
  card: EventCard,
  state: EventGameState
): CardPreviewInfo {
  const baseProfit = estimateProfit(card, state);
  const baseRisk = estimateRisk(card);
  const estimatedPressureDamage = Math.max(
    0,
    Math.round((baseProfit * state.combo.comboMultiplier - state.marketPressure.shield) * 100) /
      100
  );
  const possibleEvents = getPossibleEventLabels(card, state);
  const possibleTools = getPossibleToolNames(state.tools, possibleEvents);
  const playable = card.cost <= state.actionPoints && state.phase === 'PLAYER_TURN';
  const notes = getPreviewNotes(card, state, estimatedPressureDamage);

  return {
    cardName: card.name,
    cardType: card.cardType ? localizeCardType(card.cardType) : '事件牌',
    role: localizeCardRole(card.cardRole),
    archetype: card.archetype ?? getArchetypeFromCardType(card.cardType),
    mainEffect: getDescriptionLine(card, 0),
    timingHint: getDescriptionLine(card, 1),
    riskText: getDescriptionLine(card, 2) || getRiskText(card),
    cost: card.cost,
    baseProfit,
    baseRisk,
    estimatedPressureDamage,
    possibleEvents,
    possibleTools,
    notes,
    playable,
    reason: playable ? undefined : getUnplayableReason(card, state)
  };
}

function getDescriptionLine(card: EventCard, index: number) {
  return localizeText(card.playEffect ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)[index] ?? '';
}

function getRiskText(card: EventCard) {
  if ((card.baseRisk ?? 0) <= 0) return '无额外风险。';
  return `风险 +${card.baseRisk}。`;
}

function getArchetypeFromCardType(cardType: EventCard['cardType']) {
  if (cardType === 'CHASE') return '追涨';
  if (cardType === 'LEVERAGE' || cardType === 'RISK') return '杠杆';
  if (cardType === 'DIP_BUY') return '低吸';
  if (cardType === 'CASH_OUT') return '止盈';
  if (cardType === 'SECTOR' || cardType === 'BUY' || cardType === 'DRAW') return '板块';
  if (cardType === 'COPY') return '复制';
  if (cardType === 'FINISHER') return '终结';
  return '风控';
}

function estimateProfit(card: EventCard, state: EventGameState) {
  return card.effects.reduce((total, effect) => {
    if (effect.type === 'GAIN_PROFIT') return total + effect.value;
    if (effect.type === 'TRIGGER_LIMIT_UP') return total + (effect.profit ?? 0);
    if (effect.type === 'TRIGGER_LIMIT_UP_IF_PROFIT') {
      return state.combo.currentChainProfit > 0 ? total + effect.profit : total;
    }
    if (effect.type === 'GAIN_PROFIT_FROM_COMBO') {
      return total + state.combo.comboCount * effect.profitPerCombo;
    }
    if (effect.type === 'REBOUND_IF_EVENT') {
      return effect.eventTypes.some((eventType) => state.resolvedEventTypes.includes(eventType))
        ? total + effect.profit
        : total;
    }
    return total;
  }, card.baseReturn ?? 0);
}

function estimateRisk(card: EventCard) {
  return card.effects.reduce((total, effect) => {
    if (effect.type === 'GAIN_RISK') return total + effect.value;
    if (effect.type === 'CASH_OUT') return Math.max(0, total - effect.riskReduction);
    if (effect.type === 'REDUCE_RISK') return Math.max(0, total - effect.value);
    return total;
  }, card.baseRisk ?? 0);
}

function getPossibleEventLabels(card: EventCard, state: EventGameState) {
  const events = new Set<string>();

  for (const effect of card.effects) {
    collectEffectEvent(effect, events, state);
  }

  return [...events].map((event) => localizeText(event));
}

function collectEffectEvent(
  effect: CardEffect,
  events: Set<string>,
  state: EventGameState
) {
  if (effect.type === 'GAIN_PROFIT') events.add('收益增加');
  if (effect.type === 'GAIN_RISK') events.add('风险上升');
  if (effect.type === 'REDUCE_RISK') events.add('风险降低');
  if (effect.type === 'GAIN_COMBO') events.add('连击增加');
  if (effect.type === 'TRIGGER_SECTOR') events.add(`${localizeSector(effect.sector)}板块触发`);
  if (effect.type === 'TRIGGER_HOT_SECTOR') {
    events.add(`${localizeSector(state.hotSector)}板块触发`);
  }
  if (effect.type === 'TRIGGER_LIMIT_UP') events.add('涨停');
  if (effect.type === 'TRIGGER_LIMIT_UP_IF_PROFIT') {
    events.add(state.combo.currentChainProfit > 0 ? '涨停' : '跌停');
  }
  if (effect.type === 'COPY_PREVIOUS_CARD') events.add('复制卡牌');
  if (effect.type === 'DRAW_CARD') events.add('抽牌');
  if (effect.type === 'CASH_OUT') events.add('止盈');
  if (effect.type === 'END_TRADE') events.add('结束交易');
}

function getPossibleToolNames(tools: EventTool[], possibleEvents: string[]) {
  const eventText = possibleEvents.join(' ');
  const matched = tools.filter((tool) => {
    if (tool.trigger.type === 'LIMIT_UP') return eventText.includes('涨停');
    if (tool.trigger.type === 'LIMIT_DOWN') return eventText.includes('跌停');
    if (tool.trigger.type === 'RISK_GAINED') return eventText.includes('风险上升');
    if (tool.trigger.type === 'RISK_REDUCED') return eventText.includes('风险降低');
    if (tool.trigger.type === 'CASH_OUT') return eventText.includes('止盈');
    if (tool.trigger.type === 'CARD_COPIED') return eventText.includes('复制卡牌');
    if (tool.trigger.type === 'SECTOR_TRIGGERED') return eventText.includes('板块触发');
    if (tool.trigger.type === 'COMBO_GAINED') return eventText.includes('连击增加');
    return false;
  });

  if (matched.length === 0 && possibleEvents.length > 0 && tools.length > 0) {
    return ['可能触发若干工具'];
  }

  return matched.map((tool) => tool.name);
}

function getPreviewNotes(
  card: EventCard,
  state: EventGameState,
  estimatedPressureDamage: number
) {
  const notes: string[] = [];
  const previousCost = state.lastPlayedCost;

  if (
    (previousCost === null && card.cost === 0) ||
    (previousCost !== null && card.cost === previousCost + 1) ||
    (previousCost !== null && card.cost === 0)
  ) {
    notes.push('可推进极速连锁');
  } else if (previousCost !== null) {
    notes.push('会中断极速连锁');
  }

  if (state.risk >= state.maxRisk * 0.7 || estimateRisk(card) >= 15) {
    notes.push('高风险');
  }

  if (estimatedPressureDamage >= state.marketPressure.hp) {
    notes.push('可能击穿市场压力');
  }

  return notes;
}

function getUnplayableReason(card: EventCard, state: EventGameState) {
  if (state.phase !== 'PLAYER_TURN') {
    return '当前不是玩家回合。';
  }

  if (card.cost > state.actionPoints) {
    return `行动点不足：需要 ${card.cost}，当前 ${state.actionPoints}。`;
  }

  return '暂时不能打出。';
}
