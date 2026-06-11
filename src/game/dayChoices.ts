import { getComboMultiplier } from './combo';
import { discardContinuousTurn, drawFromContinuousDeck } from './deck';
import { cashOutFloatingProfit } from './economy';
import { createMarketPressureByIndex } from './marketPressure';
import type { EventGameState } from './playCard';
import { applyRunFailureConditions } from './routeMap';

export type DayChoiceId = 'cashOut' | 'hold' | 'leverage' | 'continueTrading';

export interface DayChoicePreview {
  id: DayChoiceId;
  title: string;
  riskText: string;
  profitText: string;
  nextDayText: string;
  warningText: string;
  possibleLoss: number;
  lossText: string;
}

const CHOICE_LABELS: Record<DayChoiceId, string> = {
  cashOut: '止盈',
  hold: '继续持有',
  leverage: '加杠杆',
  continueTrading: '继续交易'
};

const EVENT_HAND_SIZE = 5;
const CASH_OUT_RATIO = 0.7;
const HOLD_RISK_GAIN = 10;
const HOLD_PROFIT_MULTIPLIER = 1.2;
const LEVERAGE_RISK_GAIN = 25;
const LEVERAGE_PROFIT_MULTIPLIER = 1.6;
const LEVERAGE_AP_BONUS = 1;
const LEVERAGE_MAX_RISK_PENALTY = 10;
const CONTINUE_TRADING_RISK_GAIN = 15;
const CONTINUE_TRADING_PROFIT_BONUS = 0.5;

export function getDayChoiceLabel(choice: string | null) {
  if (choice && choice in CHOICE_LABELS) {
    return CHOICE_LABELS[choice as DayChoiceId];
  }

  return '无';
}

export function getDayChoicePreviews(state: EventGameState): DayChoicePreview[] {
  const floatingProfit = roundToTwoDecimals(state.combo.currentChainProfit);
  const cashOutAmount = roundToTwoDecimals(floatingProfit * CASH_OUT_RATIO);
  const remainingFloating = roundToTwoDecimals(floatingProfit - cashOutAmount);
  const continueMultiplier = roundToTwoDecimals(
    state.profitMultiplier + CONTINUE_TRADING_PROFIT_BONUS
  );

  return [
    {
      id: 'cashOut',
      title: '止盈',
      profitText: `锁定 ${cashOutAmount} 现金，并记入已锁定收益。`,
      riskText: '风险 -20。',
      nextDayText: '下一日正常开始，收益倍率回到 x1.00。',
      warningText: `仍有 ${remainingFloating} 浮盈留在盘中，爆仓会先损失这部分。`,
      possibleLoss: remainingFloating,
      lossText: `选择后可能损失浮盈 ${remainingFloating}。`
    },
    {
      id: 'hold',
      title: '继续持有',
      profitText: `不锁定浮盈，保留 ${floatingProfit} 浮盈继续冒险。`,
      riskText: `风险 +${HOLD_RISK_GAIN}。`,
      nextDayText: `下一日初始 combo +2，收益倍率 x${HOLD_PROFIT_MULTIPLIER.toFixed(2)}。`,
      warningText: '如果下一轮爆仓，当前浮盈会优先归零。',
      possibleLoss: floatingProfit,
      lossText: `当前冒险金额 ${floatingProfit}。`
    },
    {
      id: 'leverage',
      title: '加杠杆',
      profitText: `下一日收益倍率 x${LEVERAGE_PROFIT_MULTIPLIER.toFixed(2)}，初始 AP +${LEVERAGE_AP_BONUS}。`,
      riskText: `风险 +${LEVERAGE_RISK_GAIN}，爆仓线临时 -${LEVERAGE_MAX_RISK_PENALTY}。`,
      nextDayText: '更容易打出爆发，但保险价值明显提高。',
      warningText: `建议先确认保险；当前浮盈 ${floatingProfit} 会在爆仓时优先损失。`,
      possibleLoss: floatingProfit,
      lossText: `当前冒险金额 ${floatingProfit}。`
    },
    {
      id: 'continueTrading',
      title: '继续交易',
      profitText: `立即生成新的市场压力，收益倍率提高到 x${continueMultiplier.toFixed(2)}。`,
      riskText: `额外风险 +${CONTINUE_TRADING_RISK_GAIN}，风险不清空。`,
      nextDayText: '奖励稀有度提高，当前浮盈继续保留。',
      warningText: '最贪婪的选择：钱还在桌上，下一场更肥也更危险。',
      possibleLoss: floatingProfit,
      lossText: `当前冒险金额 ${floatingProfit}。`
    }
  ];
}

export function applyDayChoice(
  state: EventGameState,
  choice: DayChoiceId
): EventGameState {
  state.lastDayChoice = choice;

  if (choice === 'cashOut') {
    const beforeCash = state.cash;
    const lockedAmount = roundToTwoDecimals(
      state.combo.currentChainProfit * CASH_OUT_RATIO
    );
    cashOutFloatingProfit(state, CASH_OUT_RATIO, '日终止盈');
    state.risk = Math.max(0, roundToTwoDecimals(state.risk - 20));
    state.nextInitialCombo = 0;
    state.nextProfitMultiplier = 1;
    state.nextApBonus = 0;
    state.nextMaxRiskPenalty = 0;
    pushHistory(
      state,
      `日终选择：止盈，${lockedAmount} 浮盈转为现金，现金 +${roundToTwoDecimals(
        state.cash - beforeCash
      )}，风险 -20。`
    );
    startNextTradingDay(state, '止盈后进入下一交易日。');
    return state;
  }

  if (choice === 'hold') {
    state.risk = roundToTwoDecimals(state.risk + HOLD_RISK_GAIN);
    state.nextInitialCombo += 2;
    state.nextProfitMultiplier = HOLD_PROFIT_MULTIPLIER;
    state.nextApBonus = 0;
    state.nextMaxRiskPenalty = 0;
    pushHistory(
      state,
      `日终选择：继续持有，下一日初始 combo +2，收益倍率 x${HOLD_PROFIT_MULTIPLIER.toFixed(
        2
      )}，风险 +${HOLD_RISK_GAIN}，浮盈继续暴露。`
    );
    if (applyRunFailureConditions(state)) {
      return state;
    }
    startNextTradingDay(state, '继续持有进入下一交易日。');
    return state;
  }

  if (choice === 'leverage') {
    state.risk = roundToTwoDecimals(state.risk + LEVERAGE_RISK_GAIN);
    state.nextProfitMultiplier = LEVERAGE_PROFIT_MULTIPLIER;
    state.nextApBonus = LEVERAGE_AP_BONUS;
    state.nextMaxRiskPenalty = LEVERAGE_MAX_RISK_PENALTY;
    state.maxRisk = state.baseMaxRisk - state.nextMaxRiskPenalty;
    pushHistory(
      state,
      `日终选择：加杠杆，下一日收益倍率 x${LEVERAGE_PROFIT_MULTIPLIER.toFixed(
        2
      )}，AP +${LEVERAGE_AP_BONUS}，风险 +${LEVERAGE_RISK_GAIN}，爆仓线 -${LEVERAGE_MAX_RISK_PENALTY}。`
    );
    if (applyRunFailureConditions(state)) {
      return state;
    }
    startNextTradingDay(state, '加杠杆进入下一交易日。');
    return state;
  }

  state.risk = roundToTwoDecimals(state.risk + CONTINUE_TRADING_RISK_GAIN);
  state.rewardRarityBonus += 1;
  state.profitMultiplier = roundToTwoDecimals(
    state.profitMultiplier + CONTINUE_TRADING_PROFIT_BONUS
  );
  pushHistory(
    state,
    `日终选择：继续交易，收益倍率提高到 x${state.profitMultiplier.toFixed(
      2
    )}，奖励稀有度 +1（当前 +${state.rewardRarityBonus}），风险 +${CONTINUE_TRADING_RISK_GAIN}，浮盈继续保留。`
  );
  if (applyRunFailureConditions(state)) {
    return state;
  }
  startNextMarketPressureForGreed(state);
  return state;
}

function startNextTradingDay(state: EventGameState, message: string) {
  const preparedState = discardContinuousTurn(state);
  state.hand = preparedState.hand;
  state.discardPile = preparedState.discardPile;
  state.playedCardsThisTurn = preparedState.playedCardsThisTurn;
  state.cardsDrawnThisTurn = preparedState.cardsDrawnThisTurn;

  state.day += 1;
  state.profitMultiplier = state.nextProfitMultiplier;
  state.maxAp = state.baseMaxAp + state.nextApBonus;
  state.ap = state.maxAp;
  state.maxActionPoints = state.maxAp;
  state.actionPoints = state.ap;
  state.maxRisk = state.baseMaxRisk - state.nextMaxRiskPenalty;
  state.nextProfitMultiplier = 1;
  state.nextApBonus = 0;
  state.nextMaxRiskPenalty = 0;
  state.marketPressureIndex += 1;
  state.marketPressure = createMarketPressureByIndex(
    state.seed,
    state.marketPressureIndex
  );
  resetEncounterState(state);
  drawOpeningHand(state);
  applyNextDayCombo(state);
  state.combo.eventLog.push(message);
}

function startNextMarketPressureForGreed(state: EventGameState) {
  const preparedState = discardContinuousTurn(state);
  state.hand = preparedState.hand;
  state.discardPile = preparedState.discardPile;
  state.playedCardsThisTurn = preparedState.playedCardsThisTurn;
  state.cardsDrawnThisTurn = preparedState.cardsDrawnThisTurn;

  state.marketPressureIndex += 1;
  state.marketPressure = {
    ...createMarketPressureByIndex(state.seed, state.marketPressureIndex),
    reward: `稀有度 +${state.rewardRarityBonus} 的贪婪奖励`
  };
  resetEncounterState(state);
  state.ap = state.maxAp;
  state.maxActionPoints = state.maxAp;
  state.actionPoints = state.ap;
  drawOpeningHand(state);
  state.combo.eventLog.push(
    `继续交易：新的市场压力已生成，收益倍率 x${state.profitMultiplier.toFixed(
      2
    )}，奖励稀有度 +${state.rewardRarityBonus}。`
  );
}

function resetEncounterState(state: EventGameState) {
  state.encounterTurn = 0;
  state.currentTurn = 1;
  state.currentIntentId = state.marketPressure.intent.id;
  state.lastResolvedIntentId = null;
  state.intentResolvedThisTurn = false;
  state.canResolveIntent = false;
  state.encounterStatus = 'ACTIVE';
  state.phase = 'PLAYER_TURN';
  state.rewardChoices = [];
  state.playedCardsThisTurn = [];
  state.lastPlayedCard = null;
  state.lastPlayedCost = null;
  state.turboturnStep = 0;
  state.turboturnMultiplier = 1;
  state.bonusApGainsThisTurn = 0;
  state.bonusDrawsThisTurn = 0;
  state.copiesThisTurn = 0;
  state.intentProfitMultiplier = 1;
  state.intentRiskMultiplier = 1;
  state.weakenedSector = null;
  state.resolvedEventTypes = [];
  state.toolUseCounts = {};
  state.triggeredComboMilestones = {};
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

function applyNextDayCombo(state: EventGameState) {
  const currentChainProfit = state.combo.currentChainProfit;
  const highestComboThisRun = state.combo.highestComboThisRun;
  const eventLog = state.combo.eventLog;
  const comboCount = state.nextInitialCombo;

  state.combo = {
    comboCount,
    comboMultiplier: getComboMultiplier(comboCount),
    chainDepth: 0,
    currentChainProfit,
    currentChainRisk: 0,
    highestComboToday: comboCount,
    highestComboThisRun: Math.max(highestComboThisRun, comboCount),
    eventLog
  };

  if (comboCount > 0) {
    state.combo.eventLog.push(`下一日开盘惯性：初始 combo +${comboCount}。`);
  }

  state.nextInitialCombo = 0;
}

function pushHistory(state: EventGameState, message: string) {
  state.runHistory.push(message);
  state.combo.eventLog.push(message);
}

function roundToTwoDecimals(value: number) {
  return Math.round(value * 100) / 100;
}
