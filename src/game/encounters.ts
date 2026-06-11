import { STOCK_CARDS } from '../data/stockCards';
import { getTrader } from '../data/traders';
import { createBossEncounter } from './bosses';
import { createRouteMap } from './routeMap';
import { createShop } from './shop';
import { createTelemetry, recordBankruptcy, recordGreedChoice, recordPeakProfit } from './telemetry';
import {
  applyInsuranceOnBankruptcy,
  applyInsuranceOnEncounterEnd,
  applyQuantTerminalCostReduction,
  applyTakeProfitTools,
  getDrawBonusForTurn,
  grantExitAlarmFreeTakeProfit,
  resetTurnToolTriggers,
  shouldInjectBossNoise
} from './tools';
import { NOISE_GLITCH_CARD } from '../data/stockCards';
import { createRng } from './rng';
import { MAX_CHAIN_CARDS, previewTradeChain } from './playCard';
import type { Encounter, GreedChoice, RouteNode, Run, RunStatus } from './types';

export const HAND_SIZE = 5;
export const DEFAULT_MAX_AP = 3;

const ENCOUNTER_PRESETS: Record<string, Partial<Encounter>> = {
  'night-move': { name: '夜盘异动', targetProfit: 450, initialRisk: 0, cashReward: 100 },
  'glass-limit': { name: '玻璃涨停', targetProfit: 520, initialRisk: 5, cashReward: 110 },
  'late-news': { name: '迟到利好', targetProfit: 400, initialRisk: 0, cashReward: 90 },
  'fake-break': { name: '假突破', targetProfit: 480, initialRisk: 8, cashReward: 100 },
  'short-echo': { name: '空头回声', targetProfit: 500, initialRisk: 10, cashReward: 105 },
  'leverage-siege': { name: '杠杆围城', targetProfit: 650, initialRisk: 20, cashReward: 150 },
  'limit-down': { name: '跌停回廊', targetProfit: 700, initialRisk: 25, cashReward: 160 },
  'dragon-tiger': { name: '龙虎榜幽灵', targetProfit: 680, initialRisk: 18, cashReward: 155 },
  'circuit-eve': { name: '熔断前夜', targetProfit: 750, initialRisk: 30, cashReward: 180 }
};

export function createEncounterForNode(node: RouteNode, rewardMultiplier = 1): Encounter {
  if (node.bossId) {
    return createBossEncounter(node.bossId, rewardMultiplier);
  }

  const preset = ENCOUNTER_PRESETS[node.encounterKey ?? 'night-move'] ?? ENCOUNTER_PRESETS['night-move'];
  const isElite = node.type === 'ELITE';

  return {
    id: node.encounterKey ?? node.id,
    name: node.name,
    type: isElite ? 'ELITE' : 'NORMAL',
    targetProfit: preset.targetProfit ?? 500,
    targetProfitBonus: 0,
    floatingProfit: 0,
    lockedProfit: 0,
    cashReward: preset.cashReward ?? 100,
    risk: preset.initialRisk ?? (isElite ? 15 : 0),
    maxRisk: 100,
    rewardMultiplier,
    turnCount: 1,
    marketIntent: {
      title: isElite ? '高危加压' : '常规波动',
      description: isElite
        ? '奖励更好，但初始风险和目标线都更高。'
        : '组成交易链，把浮盈推到目标线。'
    },
    status: 'ACTIVE',
    nextTurnProfitMultiplier: 1,
    initialRisk: preset.initialRisk ?? 0,
    noiseCardsInDiscard: 0,
    handCostPenalty: 0,
    profitBonus: 0,
    riskGainMultiplier: 1
  };
}

export function createNewRun(traderId = 'old-hand', seed = 'redesign-run'): Run {
  const trader = getTrader(traderId);
  const rng = createRng(seed);
  const deck = [...trader.startingDeckCardIds];
  const shuffledDeck = rng.shuffle(deck);

  const run: Run = {
    trader,
    cash: trader.startingCash,
    deck,
    drawPile: shuffledDeck,
    discardPile: [],
    hand: [],
    tools: [...trader.startingToolIds],
    insurances: [],
    currentEncounter: null,
    act: 1,
    nodeIndex: 0,
    status: 'ROUTE_SELECT',
    maxAP: DEFAULT_MAX_AP,
    ap: DEFAULT_MAX_AP,
    tradeChain: emptyChain(),
    lastChainResult: null,
    turnSummary: ['新局开始：选择你的第一条路线。'],
    rngSeed: seed,
    routeMap: createRouteMap(seed),
    shop: createShop(seed),
    currentEvent: null,
    telemetry: createTelemetry(traderId),
    toolTriggers: {},
    encounterScopedToolUses: {},
    nextCardCostReduction: 0,
    apOverdraftAvailable: trader.startingToolIds.includes('redline-margin'),
    freeTakeProfitAvailable: false,
    pendingRewardCash: 0,
    cardsRemovedCount: 0,
    upgradedCardIds: []
  };

  return run;
}

export function startEncounter(run: Run, encounter: Encounter): Run {
  const started = drawCards(
    {
      ...run,
      status: 'PLAYER_TURN',
      currentEncounter: encounter,
      ap: run.maxAP,
      tradeChain: emptyChain(),
      toolTriggers: {},
      encounterScopedToolUses: {},
      insurances: run.insurances.filter((i) => !i.encounterScoped || !i.used),
      apOverdraftAvailable: run.tools.includes('redline-margin'),
      pendingRewardCash: 0
    },
    HAND_SIZE,
    true
  );
  return applyQuantTerminalCostReduction(started);
}

export function drawCards(run: Run, count: number, isTurnStartDraw = false): Run {
  const hand = [...run.hand];
  let drawPile = [...run.drawPile];
  let discardPile = [...run.discardPile];
  const totalDraw = count + getDrawBonusForTurn(run, isTurnStartDraw);

  for (let index = 0; index < totalDraw; index += 1) {
    if (drawPile.length === 0 && discardPile.length > 0) {
      drawPile = [...discardPile.filter((id) => id !== NOISE_GLITCH_CARD.id)];
      discardPile = discardPile.filter((id) => id === NOISE_GLITCH_CARD.id);
    }
    const cardId = drawPile.shift();
    if (!cardId) break;
    hand.push(cardId);
  }

  return { ...run, hand, drawPile, discardPile };
}

export function endTurn(run: Run): Run {
  if (run.status !== 'PLAYER_TURN' || !run.currentEncounter) return run;

  const encounter = {
    ...run.currentEncounter,
    turnCount: run.currentEncounter.turnCount + 1
  };

  const noiseFreeHand = run.hand.filter((id) => id !== NOISE_GLITCH_CARD.id);

  let emptiedHandRun: Run = resetTurnToolTriggers({
    ...run,
    discardPile: [...run.discardPile, ...noiseFreeHand],
    hand: [],
    currentEncounter: encounter,
    ap: run.maxAP,
    tradeChain: emptyChain(),
    turnSummary: [`第 ${encounter.turnCount} 回合：重新抽牌。`]
  });

  if (shouldInjectBossNoise(emptiedHandRun)) {
    emptiedHandRun = {
      ...emptiedHandRun,
      hand: [NOISE_GLITCH_CARD.id],
      currentEncounter: {
        ...encounter,
        noiseCardsInDiscard: encounter.noiseCardsInDiscard + 1
      }
    };
  }

  const drawn = drawCards(emptiedHandRun, HAND_SIZE, true);
  return applyQuantTerminalCostReduction(drawn);
}

export function applyGreedChoice(run: Run, choice: GreedChoice): Run {
  if (run.status !== 'GREED_CHOICE' || !run.currentEncounter) return run;

  recordGreedChoice(run, choice);

  if (choice === 'TAKE_PROFIT') {
    const takeProfitRatio = run.freeTakeProfitAvailable ? 0.85 : 0.7;
    let cashGain = Math.floor(run.currentEncounter.floatingProfit * takeProfitRatio);
    cashGain = applyTakeProfitTools(run, cashGain);
    const nextRisk = Math.max(0, run.currentEncounter.risk - 15);

    return finishEncounterReward(
      applyInsuranceOnEncounterEnd({
        ...run,
        cash: run.cash + cashGain,
        status: 'REWARD',
        freeTakeProfitAvailable: false,
        currentEncounter: {
          ...run.currentEncounter,
          risk: nextRisk,
          status: 'REWARD'
        },
        turnSummary: [`止盈离场：获得 ${cashGain} 现金，风险 -15。`]
      })
    );
  }

  if (choice === 'HOLD') {
    let rewardDelta = 0.5;
    if (run.tools.includes('greed-compass')) rewardDelta += 0.25;
    const withExitAlarm = grantExitAlarmFreeTakeProfit(run);
    return continueGreedRun(withExitAlarm, {
      riskDelta: 15,
      rewardMultiplierDelta: rewardDelta,
      nextTurnProfitMultiplier: 1,
      summary: `继续持有：奖励倍率 +${Math.round(rewardDelta * 100)}%，风险 +15。你正在拿 ${run.currentEncounter.floatingProfit} 浮盈冒险。`
    });
  }

  return continueGreedRun(run, {
    riskDelta: 30,
    rewardMultiplierDelta: 1,
    nextTurnProfitMultiplier: 2,
    summary: `加杠杆：下回合收益 x2，风险 +30。爆仓将损失 ${run.currentEncounter.floatingProfit} 浮盈。`
  });
}

export function finishEncounterReward(run: Run): Run {
  if (!run.currentEncounter) return run;
  if (run.pendingRewardCash > 0 && run.currentEncounter.status === 'REWARD') {
    return run;
  }
  const withInsurance = applyInsuranceOnEncounterEnd(run);
  const bonus = Math.floor(withInsurance.currentEncounter!.cashReward * withInsurance.currentEncounter!.rewardMultiplier);
  return {
    ...withInsurance,
    cash: withInsurance.cash + bonus,
    pendingRewardCash: bonus,
    turnSummary: [...withInsurance.turnSummary, `行情奖励：${bonus} 现金。`]
  };
}

export function refreshTradeChainPreview(run: Run, selectedCardIds = run.tradeChain.selectedCardIds): Run {
  if (!run.currentEncounter) return run;
  const previewResult = selectedCardIds.length > 0 ? previewTradeChain(run, selectedCardIds) : null;

  return {
    ...run,
    tradeChain: {
      selectedCardIds,
      maxCards: MAX_CHAIN_CARDS,
      totalCost: previewResult?.totalCost ?? 0,
      previewResult
    }
  };
}

export function handleBankruptcy(run: Run, reason: string): Run {
  const { run: maybeSaved, prevented } = applyInsuranceOnBankruptcy(run);
  if (prevented) {
    recordBankruptcy(maybeSaved, `${reason}（保险生效）`);
    return maybeSaved;
  }
  recordBankruptcy(run, reason);
  return {
    ...run,
    status: 'RUN_LOST',
    currentEncounter: run.currentEncounter
      ? { ...run.currentEncounter, floatingProfit: 0, status: 'BANKRUPT' }
      : null,
    turnSummary: [`爆仓：${reason}，浮盈归零。`]
  };
}

function continueGreedRun(
  run: Run,
  options: {
    riskDelta: number;
    rewardMultiplierDelta: number;
    nextTurnProfitMultiplier: number;
    summary: string;
  }
): Run {
  if (!run.currentEncounter) return run;

  const nextRisk = Math.min(run.currentEncounter.maxRisk, run.currentEncounter.risk + options.riskDelta);
  const bankrupt = nextRisk >= run.currentEncounter.maxRisk;

  if (bankrupt) {
    return handleBankruptcy(
      {
        ...run,
        currentEncounter: {
          ...run.currentEncounter,
          risk: nextRisk,
          floatingProfit: 0,
          status: 'BANKRUPT'
        }
      },
      options.summary
    );
  }

  const nextEncounter: Encounter = {
    ...run.currentEncounter,
    risk: nextRisk,
    rewardMultiplier: run.currentEncounter.rewardMultiplier + options.rewardMultiplierDelta,
    nextTurnProfitMultiplier: options.nextTurnProfitMultiplier,
    status: 'ACTIVE'
  };

  const continuedRun: Run = {
    ...run,
    status: 'PLAYER_TURN',
    currentEncounter: nextEncounter,
    ap: run.maxAP,
    tradeChain: emptyChain(),
    turnSummary: [options.summary]
  };

  const nextTurnRun = endTurn(continuedRun);
  return { ...nextTurnRun, turnSummary: [options.summary, ...nextTurnRun.turnSummary] };
}

function emptyChain() {
  return { selectedCardIds: [], maxCards: MAX_CHAIN_CARDS as 3, totalCost: 0, previewResult: null };
}

export function getCardName(cardId: string) {
  return STOCK_CARDS.find((card) => card.id === cardId)?.name ?? cardId;
}




