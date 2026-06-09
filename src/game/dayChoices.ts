import { getComboMultiplier } from './combo';
import { createMarketPressureByIndex } from './marketPressure';
import type { EventGameState } from './playCard';

export type DayChoiceId = 'cashOut' | 'hold' | 'leverage' | 'continueTrading';

export interface DayChoicePreview {
  id: DayChoiceId;
  title: string;
  riskText: string;
  profitText: string;
  nextDayText: string;
  warningText: string;
}

const CHOICE_LABELS: Record<DayChoiceId, string> = {
  cashOut: '止盈',
  hold: '继续持有',
  leverage: '加杠杆',
  continueTrading: '继续交易'
};

export function getDayChoiceLabel(choice: string | null) {
  if (choice && choice in CHOICE_LABELS) {
    return CHOICE_LABELS[choice as DayChoiceId];
  }

  return '无';
}

export function getDayChoicePreviews(state: EventGameState): DayChoicePreview[] {
  const floatingProfit = state.combo.currentChainProfit;
  const cashOutAmount = roundToTwoDecimals(floatingProfit * 0.7);

  return [
    {
      id: 'cashOut',
      title: '止盈',
      profitText: `锁定 70% 浮盈：${cashOutAmount}`,
      riskText: 'Risk -20',
      nextDayText: '下一日正常开始，收益倍率 x1.00。',
      warningText: `仍有 ${roundToTwoDecimals(floatingProfit - cashOutAmount)} 浮盈留在盘中。`
    },
    {
      id: 'hold',
      title: '继续持有',
      profitText: '不锁定浮盈，保留当前浮盈。',
      riskText: 'Risk +10',
      nextDayText: '下一日初始 combo +2，收益倍率 x1.20。',
      warningText: '浮盈继续暴露在下一日风险里。'
    },
    {
      id: 'leverage',
      title: '加杠杆',
      profitText: '下一日收益倍率 x1.60。',
      riskText: 'Risk +25，maxRisk 临时 -10',
      nextDayText: '下一日初始 AP +1，出牌更爽。',
      warningText: `有效爆仓线会降到 ${state.baseMaxRisk - 10}。`
    },
    {
      id: 'continueTrading',
      title: '继续交易',
      profitText: '立即生成新的 MarketPressure，当前浮盈继续保留。',
      riskText: 'Risk 不清空',
      nextDayText: '奖励稀有度提高，继续压榨这一日。',
      warningText: '最贪婪的选择：不结日，继续把风险留在桌上。'
    }
  ];
}

export function applyDayChoice(
  state: EventGameState,
  choice: DayChoiceId
): EventGameState {
  state.lastDayChoice = choice;

  if (choice === 'cashOut') {
    const lockedAmount = roundToTwoDecimals(state.combo.currentChainProfit * 0.7);
    state.lockedProfit = roundToTwoDecimals(state.lockedProfit + lockedAmount);
    state.combo = {
      ...state.combo,
      currentChainProfit: roundToTwoDecimals(
        state.combo.currentChainProfit - lockedAmount
      )
    };
    state.risk = Math.max(0, roundToTwoDecimals(state.risk - 20));
    state.nextInitialCombo = 0;
    state.nextProfitMultiplier = 1;
    state.nextApBonus = 0;
    state.nextMaxRiskPenalty = 0;
    pushHistory(state, `日终选择：止盈，锁定 ${lockedAmount} 浮盈，Risk -20。`);
    startNextTradingDay(state, '止盈后进入下一交易日。');
    return state;
  }

  if (choice === 'hold') {
    state.risk = roundToTwoDecimals(state.risk + 10);
    state.nextInitialCombo += 2;
    state.nextProfitMultiplier = 1.2;
    state.nextApBonus = 0;
    state.nextMaxRiskPenalty = 0;
    pushHistory(state, '日终选择：继续持有，下一日初始 combo +2，收益倍率 x1.20，Risk +10。');
    if (markBankruptIfNeeded(state)) {
      return state;
    }
    startNextTradingDay(state, '继续持有进入下一交易日。');
    return state;
  }

  if (choice === 'leverage') {
    state.risk = roundToTwoDecimals(state.risk + 25);
    state.nextProfitMultiplier = 1.6;
    state.nextApBonus = 1;
    state.nextMaxRiskPenalty = 10;
    pushHistory(state, '日终选择：加杠杆，下一日收益倍率 x1.60，AP +1，Risk +25，maxRisk -10。');
    if (markBankruptIfNeeded(state, state.baseMaxRisk - state.nextMaxRiskPenalty)) {
      return state;
    }
    startNextTradingDay(state, '加杠杆进入下一交易日。');
    return state;
  }

  state.rewardRarityBonus += 1;
  pushHistory(
    state,
    `日终选择：继续交易，奖励稀有度 +1（当前 +${state.rewardRarityBonus}），浮盈继续保留。`
  );
  startNextMarketPressureForGreed(state);
  return state;
}

function startNextTradingDay(state: EventGameState, message: string) {
  state.day += 1;
  state.profitMultiplier = state.nextProfitMultiplier;
  state.maxAp = state.baseMaxAp + state.nextApBonus;
  state.ap = state.maxAp;
  state.maxRisk = state.baseMaxRisk - state.nextMaxRiskPenalty;
  state.nextProfitMultiplier = 1;
  state.nextApBonus = 0;
  state.nextMaxRiskPenalty = 0;
  state.marketPressureIndex += 1;
  state.marketPressure = createMarketPressureByIndex(
    state.seed,
    state.marketPressureIndex
  );
  state.phase = 'playing';
  state.rewardChoices = [];
  state.playedCardsThisTurn = [];
  state.lastPlayedCard = null;
  state.resolvedEventTypes = [];
  state.toolUseCounts = {};
  state.triggeredComboMilestones = {};
  applyNextDayCombo(state);
  state.combo.eventLog.push(message);
}

function startNextMarketPressureForGreed(state: EventGameState) {
  state.marketPressureIndex += 1;
  state.marketPressure = {
    ...createMarketPressureByIndex(state.seed, state.marketPressureIndex),
    reward: `稀有度 +${state.rewardRarityBonus} 的测试奖励`
  };
  state.phase = 'playing';
  state.rewardChoices = [];
  state.ap = state.maxAp;
  state.playedCardsThisTurn = [];
  state.lastPlayedCard = null;
  state.resolvedEventTypes = [];
  state.toolUseCounts = {};
  state.triggeredComboMilestones = {};
  state.combo.eventLog.push(
    `继续交易：新的 MarketPressure 已生成，奖励稀有度 +${state.rewardRarityBonus}。`
  );
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

function markBankruptIfNeeded(state: EventGameState, effectiveMaxRisk = state.maxRisk) {
  if (state.risk < effectiveMaxRisk) {
    return false;
  }

  state.maxRisk = effectiveMaxRisk;
  state.phase = 'bankrupt';
  state.runHistory.push(
    `爆仓：Risk ${state.risk}/${effectiveMaxRisk}，最后一次选择 ${getDayChoiceLabel(state.lastDayChoice)}。`
  );
  state.combo.eventLog.push(
    `Risk 达到 ${state.risk}/${effectiveMaxRisk}，最后一次选择：${getDayChoiceLabel(state.lastDayChoice)}。`
  );
  return true;
}

function pushHistory(state: EventGameState, message: string) {
  state.runHistory.push(message);
  state.combo.eventLog.push(message);
}

function roundToTwoDecimals(value: number) {
  return Math.round(value * 100) / 100;
}
