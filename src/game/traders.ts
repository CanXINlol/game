import { TRADERS, type TraderDefinition } from '../data/traders';
import { MARKET_NOISE_CARD } from './encounters';
import type { EventCard, EventTool } from './effects';
import { FORMAL_EVENT_CARDS, FORMAL_EVENT_TOOLS } from './formalContent';
import type { GameEvent } from './events';
import type { EventGameState } from './playCard';

export type TraderId = (typeof TRADERS)[number]['id'];

export interface TraderRunConfig {
  trader: TraderDefinition;
  deck: EventCard[];
  tools: EventTool[];
  cash: number;
  maxRiskModifier: number;
  servicePriceMultiplier: number;
}

export function getTrader(traderId: string = 'old-hand'): TraderDefinition {
  return TRADERS.find((trader) => trader.id === traderId) ?? TRADERS[0];
}

export function createTraderRunConfig(traderId: string = 'old-hand'): TraderRunConfig {
  const trader = getTrader(traderId);

  return {
    trader,
    deck: trader.startingDeckIds.map((cardId, index) =>
      cloneCard(getCardTemplate(cardId), `${cardId}-starter-${trader.id}-${index}`)
    ),
    tools: trader.startingToolIds.map((toolId) => cloneTool(getToolTemplate(toolId))),
    cash: trader.startingCash,
    maxRiskModifier: trader.id === 'bankrupt-gambler' ? -10 : 0,
    servicePriceMultiplier: trader.id === 'risk-manager' ? 0.75 : 1
  };
}

export function getTraderProfitMultiplier(
  state: Pick<EventGameState, 'traderId' | 'risk' | 'maxRisk'>,
  event: GameEvent
) {
  const traderId = state.traderId;
  const cardType = event.meta?.cardType;
  const risk = event.meta?.risk;

  if (traderId === 'old-hand' && (risk === 'high' || risk === 'extreme')) {
    return 0.9;
  }

  if (
    traderId === 'hot-money' &&
    (cardType === 'CHASE' || cardType === 'LEVERAGE')
  ) {
    return 1.2;
  }

  if (traderId === 'quant-newbie' && cardType === 'FINISHER') {
    return 0.8;
  }

  if (traderId === 'bankrupt-gambler') {
    return 1 + Math.min(0.45, (state.risk / state.maxRisk) * 0.45);
  }

  if (
    traderId === 'risk-manager' &&
    (cardType === 'CHASE' || cardType === 'LEVERAGE' || cardType === 'FINISHER')
  ) {
    return 0.9;
  }

  return 1;
}

export function getTraderRiskMultiplier(state: Pick<EventGameState, 'traderId'>) {
  if (state.traderId === 'hot-money') {
    return 1.25;
  }

  return 1;
}

export function getCashOutRatioWithTrader(
  state: Pick<EventGameState, 'traderId'>,
  ratio: number
) {
  if (state.traderId === 'old-hand') {
    return Math.min(0.9, ratio + 0.1);
  }

  if (state.traderId === 'risk-manager') {
    return Math.min(0.9, ratio + 0.05);
  }

  return ratio;
}

export function getTraderServicePriceMultiplier(
  state: Pick<EventGameState, 'traderId' | 'servicePriceMultiplier'>
) {
  return state.servicePriceMultiplier ?? (state.traderId === 'risk-manager' ? 0.75 : 1);
}

export function shouldTriggerQuantPassive(state: EventGameState, event: GameEvent) {
  if (state.traderId !== 'quant-newbie') {
    return false;
  }

  if (event.type !== 'CARD_DRAWN' && event.type !== 'CARD_COPIED') {
    return false;
  }

  return (state.traderPassiveUsesThisTurn.quantFirstDrawOrCopy ?? 0) === 0;
}

function getCardTemplate(cardId: string) {
  if (cardId === MARKET_NOISE_CARD.id) {
    return MARKET_NOISE_CARD;
  }

  const card = FORMAL_EVENT_CARDS.find((item) => item.id === cardId);

  if (!card) {
    throw new Error(`Unknown trader starting card: ${cardId}`);
  }

  return card;
}

function getToolTemplate(toolId: string) {
  const tool = FORMAL_EVENT_TOOLS.find((item) => item.id === toolId);

  if (!tool) {
    throw new Error(`Unknown trader starting tool: ${toolId}`);
  }

  return tool;
}

function cloneCard(card: EventCard, id: string): EventCard {
  return {
    ...card,
    id,
    tags: card.tags ? [...card.tags] : undefined,
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
