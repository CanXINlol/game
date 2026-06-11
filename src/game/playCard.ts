import { getStockCard, NOISE_GLITCH_CARD, STOCK_CARD_BY_ID } from '../data/stockCards';
import { applyBossPhaseModifiers, getEffectiveTargetProfit, updateBossPhase } from './bosses';
import { finishEncounterReward, handleBankruptcy } from './encounters';
import { recordPeakProfit } from './telemetry';
import {
  applyApOverdraft,
  applyFinalStopIfNeeded,
  applyLockBonus,
  applyOldHandCup,
  applyToolOnChainResult,
  applyTraderAndToolRiskModifier,
  canOverdraftAp,
  getToolProfitBonus,
  getTraderProfitMultiplier,
  markInsuranceUsed
} from './tools';
import type { Encounter, Run, TradeCard, TradeChainResult, TradeChainStep } from './types';

export const MAX_CHAIN_CARDS = 3;

interface ChainContext {
  run: Run;
  encounter: Encounter;
  cardIds: string[];
}

interface MutableChainState {
  floatingProfit: number;
  lockedProfit: number;
  cash: number;
  risk: number;
  drawDelta: number;
  apDelta: number;
  subsequentProfitMultiplier: number;
  nextProfitMultiplier: number;
  nextCostReduction: number;
  endedEncounter: boolean;
}

export function canAddCardToChain(cardIds: string[]) {
  return cardIds.length < MAX_CHAIN_CARDS;
}

export function getTradeChainTotalCost(
  cardIds: string[],
  cards = STOCK_CARD_BY_ID,
  handCostPenalty = 0,
  nextCardCostReduction = 0
) {
  let costReduction = nextCardCostReduction;

  return cardIds.reduce((total, cardId) => {
    const card = cards[cardId] ?? getStockCard(cardId);
    const cost = Math.max(0, card.cost + handCostPenalty - costReduction);
    costReduction = card.numericEffects.nextCostReduction ?? 0;
    return total + cost;
  }, 0);
}

export function previewTradeChain(run: Run, cardIds = run.tradeChain.selectedCardIds) {
  if (!run.currentEncounter) {
    throw new Error('No active encounter.');
  }
  return resolveTradeChain({ run, encounter: run.currentEncounter, cardIds });
}

export function executeTradeChain(run: Run): Run {
  const selectedCardIds = run.tradeChain.selectedCardIds;
  if (selectedCardIds.length === 0 || run.status !== 'PLAYER_TURN' || !run.currentEncounter) {
    return run;
  }

  const result = previewTradeChain(run, selectedCardIds);
  if (result.totalCost > run.ap && !canOverdraftAp(run, result.totalCost)) {
    return { ...run, turnSummary: ['AP 不足，无法执行这条交易链。'] };
  }

  const played = [...selectedCardIds];
  const persistentPlayed = played.filter((cardId) => cardId !== NOISE_GLITCH_CARD.id);
  const handAfterPlay = removePlayedCards(run.hand, played);
  const drawn = drawCards(
    { drawPile: run.drawPile, discardPile: run.discardPile, hand: handAfterPlay },
    result.drawDelta
  );

  let nextEncounter: Encounter = {
    ...run.currentEncounter,
    floatingProfit: result.bankrupt ? 0 : result.floatingProfitAfter,
    lockedProfit: result.lockedProfitAfter,
    risk: result.riskAfter,
    status: getPostChainEncounterStatus(run.currentEncounter, result),
    nextTurnProfitMultiplier: 1
  };

  const finalStop = applyFinalStopIfNeeded(run, nextEncounter.risk, nextEncounter.floatingProfit);
  if (finalStop.insuranceUsed) {
    nextEncounter = {
      ...nextEncounter,
      lockedProfit: nextEncounter.lockedProfit + finalStop.lockedDelta
    };
  }

  if (nextEncounter.boss) {
    nextEncounter = updateBossPhase(nextEncounter);
    nextEncounter = applyBossPhaseModifiers(run, nextEncounter);
  }

  recordPeakProfit(run, nextEncounter.floatingProfit);

  const usedOverdraft = result.totalCost > run.ap;
  let nextRun: Run = {
    ...run,
    cash: result.bankrupt ? run.cash : run.cash + result.cashDelta,
    hand: drawn.hand,
    drawPile: drawn.drawPile,
    discardPile: [...drawn.discardPile, ...persistentPlayed],
    currentEncounter: nextEncounter,
    status: getPostChainRunStatus(run.currentEncounter, result),
    ap: Math.max(0, run.ap - result.totalCost + result.apDelta),
    tradeChain: { selectedCardIds: [], maxCards: MAX_CHAIN_CARDS, totalCost: 0, previewResult: null },
    lastChainResult: result,
    turnSummary: createChainSummary(result)
  };

  if (usedOverdraft) {
    nextRun = applyApOverdraft(nextRun);
  }

  nextRun = applyOldHandCup(nextRun, nextEncounter.risk);
  nextRun = applyToolOnChainResult(nextRun, result, selectedCardIds);

  if (finalStop.insuranceUsed) {
    nextRun = markInsuranceUsed(nextRun, 'final-stop');
  }

  if (result.bankrupt) {
    return handleBankruptcy(nextRun, '风险触顶');
  }

  if (nextRun.status === 'REWARD') {
    return finishEncounterReward(nextRun);
  }

  return nextRun;
}

export function resolveTradeChain(context: ChainContext): TradeChainResult {
  if (context.cardIds.length > MAX_CHAIN_CARDS) {
    throw new Error(`Trade chain cannot contain more than ${MAX_CHAIN_CARDS} cards.`);
  }

  const encounter = context.encounter;
  const mutable: MutableChainState = {
    floatingProfit: encounter.floatingProfit,
    lockedProfit: encounter.lockedProfit,
    cash: context.run.cash,
    risk: encounter.risk,
    drawDelta: 0,
    apDelta: 0,
    subsequentProfitMultiplier: encounter.nextTurnProfitMultiplier,
    nextProfitMultiplier: 1,
    nextCostReduction: context.run.nextCardCostReduction,
    endedEncounter: false
  };
  const steps: TradeChainStep[] = [];
  let sawProfitCard = false;

  for (const [index, cardId] of context.cardIds.entries()) {
    const card = getStockCard(cardId);
    const isLastCard = index === context.cardIds.length - 1;
    const isFirstProfitCard = !sawProfitCard && (card.numericEffects.floatingProfit ?? 0) > 0;
    const step = resolveCardStep(context.run, card, mutable, encounter, isLastCard, isFirstProfitCard);
    if ((card.numericEffects.floatingProfit ?? 0) > 0) sawProfitCard = true;
    steps.push(step);
  }

  if (encounter.profitBonus > 0) {
    mutable.floatingProfit += encounter.profitBonus;
  }

  const riskAfter = clamp(Math.floor(mutable.risk), 0, encounter.maxRisk);
  const bankrupt = riskAfter >= encounter.maxRisk;
  const floatingProfitAfter = bankrupt ? 0 : Math.floor(mutable.floatingProfit);
  const target = getEffectiveTargetProfit(encounter);

  return {
    steps,
    totalCost: getTradeChainTotalCost(
      context.cardIds,
      STOCK_CARD_BY_ID,
      encounter.handCostPenalty,
      context.run.nextCardCostReduction
    ),
    floatingProfitBefore: encounter.floatingProfit,
    floatingProfitAfter,
    floatingProfitDelta: floatingProfitAfter - encounter.floatingProfit,
    lockedProfitBefore: encounter.lockedProfit,
    lockedProfitAfter: Math.floor(mutable.lockedProfit),
    lockedProfitDelta: Math.floor(mutable.lockedProfit) - encounter.lockedProfit,
    cashDelta: Math.floor(mutable.cash - context.run.cash),
    riskBefore: encounter.risk,
    riskAfter,
    riskDelta: riskAfter - encounter.risk,
    drawDelta: mutable.drawDelta,
    apDelta: mutable.apDelta,
    reachedTarget: floatingProfitAfter >= target,
    bankrupt,
    endedEncounter: mutable.endedEncounter
  };
}

function resolveCardStep(
  run: Run,
  card: TradeCard,
  mutable: MutableChainState,
  encounter: Encounter,
  isLastCard: boolean,
  isFirstProfitCard: boolean
): TradeChainStep {
  const cost = Math.max(0, card.cost + encounter.handCostPenalty - mutable.nextCostReduction);
  let baseFloatingProfit = card.numericEffects.floatingProfit ?? 0;
  baseFloatingProfit += getToolProfitBonus(run, card, mutable.risk, isFirstProfitCard);

  if (card.numericEffects.profitFromRisk) {
    baseFloatingProfit = Math.floor(mutable.risk * card.numericEffects.profitFromRisk);
  }

  const extraFloatingProfit = getConditionalExtraProfit(card, mutable, encounter, isLastCard);
  const profitBeforeMultiplier = baseFloatingProfit + extraFloatingProfit;
  const traderMult = getTraderProfitMultiplier(run, card);
  const multiplier = mutable.subsequentProfitMultiplier * mutable.nextProfitMultiplier * traderMult;
  const floatingProfitGained = Math.floor(profitBeforeMultiplier * multiplier);
  const lockedProfitGained = applyLockBonus(
    run,
    getLockedProfit(card, mutable.floatingProfit + floatingProfitGained, encounter)
  );
  const cashGained = getCashGain(card, mutable.floatingProfit + floatingProfitGained, encounter);

  mutable.floatingProfit += floatingProfitGained;
  mutable.lockedProfit += lockedProfitGained;
  mutable.cash += cashGained;
  const appliedRiskDelta = applyTraderAndToolRiskModifier(run, card.riskDelta, card, encounter);
  mutable.risk += appliedRiskDelta;
  mutable.drawDelta += card.drawDelta;
  mutable.apDelta += card.apDelta;
  mutable.subsequentProfitMultiplier *= card.numericEffects.subsequentProfitMultiplier ?? 1;
  mutable.nextProfitMultiplier = card.numericEffects.nextProfitMultiplier ?? 1;
  mutable.nextCostReduction = card.numericEffects.nextCostReduction ?? 0;
  mutable.endedEncounter = mutable.endedEncounter || card.numericEffects.endsEncounter === true;

  return {
    cardId: card.id,
    cardName: card.name,
    cost,
    baseFloatingProfit,
    multiplier,
    extraFloatingProfit,
    floatingProfitGained,
    cashGained,
    lockedProfitGained,
    riskDelta: appliedRiskDelta,
    note: createStepNote(card, floatingProfitGained, extraFloatingProfit, multiplier)
  };
}

function getConditionalExtraProfit(
  card: TradeCard,
  mutable: MutableChainState,
  encounter: Encounter,
  isLastCard: boolean
) {
  const extraProfit = card.numericEffects.extraProfit ?? 0;
  const target = getEffectiveTargetProfit(encounter);

  if (extraProfit === 0 && card.id !== 'theme-ignite') return 0;

  if (card.id === 'chase-limit' || card.id === 'dragon-follow') {
    return mutable.floatingProfit > target * 0.5 ? extraProfit : 0;
  }

  if (card.id === 'theme-ignite') {
    return mutable.floatingProfit < target ? extraProfit : 0;
  }

  if (card.id === 'dip-rebound' || card.id === 'limit-dip') {
    const threshold = card.id === 'limit-dip' ? 40 : 50;
    return mutable.risk >= threshold ? extraProfit : 0;
  }

  if (card.id === 'late-ignite' || card.id === 'closing-sweep') {
    return isLastCard ? extraProfit : 0;
  }

  if (card.id === 'short-cover') {
    return mutable.risk >= 70 ? extraProfit : 0;
  }

  return 0;
}

function getLockedProfit(card: TradeCard, currentFloatingProfit: number, encounter: Encounter) {
  if (card.numericEffects.lockRatio) {
    return Math.floor(currentFloatingProfit * card.numericEffects.lockRatio);
  }
  if (card.numericEffects.cashLock) {
    return Math.min(card.numericEffects.cashLock, Math.floor(currentFloatingProfit));
  }
  if (card.id === 'capital-return') {
    return Math.floor(encounter.lockedProfit * 0.5);
  }
  return 0;
}

function getCashGain(card: TradeCard, currentFloatingProfit: number, encounter: Encounter) {
  if (card.numericEffects.cashLock) {
    return Math.min(card.numericEffects.cashLock, Math.floor(currentFloatingProfit));
  }
  if (card.numericEffects.cashRatio) {
    if (card.id === 'capital-return') {
      return Math.floor(encounter.lockedProfit * 0.5);
    }
    return Math.floor(currentFloatingProfit * card.numericEffects.cashRatio);
  }
  return 0;
}

function getPostChainEncounterStatus(encounter: Encounter, result: TradeChainResult) {
  if (result.bankrupt) return 'BANKRUPT';
  if (result.endedEncounter) return 'REWARD';
  if (result.reachedTarget || encounter.status === 'GREED_CHOICE') return 'GREED_CHOICE';
  return 'ACTIVE';
}

function getPostChainRunStatus(encounter: Encounter, result: TradeChainResult) {
  if (result.bankrupt) return 'RUN_LOST';
  if (result.endedEncounter) return 'REWARD';
  if (result.reachedTarget || encounter.status === 'GREED_CHOICE') return 'GREED_CHOICE';
  return 'PLAYER_TURN';
}

function drawCards(piles: { drawPile: string[]; discardPile: string[]; hand: string[] }, count: number) {
  const hand = [...piles.hand];
  let drawPile = [...piles.drawPile];
  let discardPile = [...piles.discardPile];

  for (let index = 0; index < count; index += 1) {
    if (drawPile.length === 0 && discardPile.length > 0) {
      drawPile = [...discardPile];
      discardPile = [];
    }
    const drawnCard = drawPile.shift();
    if (!drawnCard) break;
    hand.push(drawnCard);
  }

  return { drawPile, discardPile, hand };
}

function removePlayedCards(hand: string[], played: string[]) {
  const remaining = [...hand];
  for (const cardId of played) {
    const index = remaining.indexOf(cardId);
    if (index >= 0) remaining.splice(index, 1);
  }
  return remaining;
}

function createChainSummary(result: TradeChainResult) {
  const targetText = result.reachedTarget ? '已达到目标线。' : '尚未达到目标线。';
  const finalText = result.bankrupt ? '风险触顶，爆仓。' : targetText;
  return [
    `本次浮盈 ${formatDelta(result.floatingProfitDelta)}。`,
    `风险 ${formatDelta(result.riskDelta)}。`,
    finalText
  ];
}

function createStepNote(card: TradeCard, floatingProfitGained: number, extraFloatingProfit: number, multiplier: number) {
  const fragments = [`${card.name} 带来 ${floatingProfitGained} 浮盈`];
  if (extraFloatingProfit > 0) fragments.push(`额外 +${extraFloatingProfit}`);
  if (multiplier !== 1) fragments.push(`倍率 x${formatMultiplier(multiplier)}`);
  return `${fragments.join('，')}。`;
}

function formatDelta(value: number) {
  return value >= 0 ? `+${value}` : `${value}`;
}

function formatMultiplier(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}




