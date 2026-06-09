export type GameEventType =
  | 'CARD_PLAYED'
  | 'PROFIT_GAINED'
  | 'RISK_GAINED'
  | 'RISK_REDUCED'
  | 'SECTOR_TRIGGERED'
  | 'RANK_CHAINED'
  | 'LIMIT_UP'
  | 'LIMIT_DOWN'
  | 'TOOL_TRIGGERED'
  | 'COMBO_GAINED'
  | 'MARKET_PRESSURE_DAMAGED'
  | 'MARKET_PRESSURE_CLEARED'
  | 'REWARD_DROPPED'
  | 'ENEMY_INTENT_RESOLVED'
  | 'BANKRUPTCY_WARNING'
  | 'LEVERAGE_ADDED'
  | 'CARD_COPIED'
  | 'CARD_DRAWN'
  | 'CASH_OUT'
  | 'LOSS_TAKEN'
  | 'TRADE_ENDED'
  | 'TURBOTURN_STEP'
  | 'TURBOTURN_COMPLETE'
  | 'EVENT_QUEUE_HALTED';

export interface GameEvent {
  id: string;
  type: GameEventType;
  sourceId: string;
  sourceName: string;
  message: string;
  value?: number;
  meta?: Record<string, unknown>;
  depth: number;
}

export interface ComboState {
  comboCount: number;
  comboMultiplier: number;
  chainDepth: number;
  currentChainProfit: number;
  currentChainRisk: number;
  highestComboToday: number;
  highestComboThisRun: number;
  eventLog: string[];
}

export function createInitialComboState(): ComboState {
  return {
    comboCount: 0,
    comboMultiplier: 1,
    chainDepth: 0,
    currentChainProfit: 0,
    currentChainRisk: 0,
    highestComboToday: 0,
    highestComboThisRun: 0,
    eventLog: []
  };
}

export function createGameEvent(input: {
  id: string;
  type: GameEventType;
  sourceId: string;
  sourceName: string;
  message: string;
  value?: number;
  meta?: Record<string, unknown>;
  depth?: number;
}): GameEvent {
  return {
    ...input,
    depth: input.depth ?? 0
  };
}

export function resetComboForNewDay(combo: ComboState): ComboState {
  return {
    ...createInitialComboState(),
    highestComboThisRun: combo.highestComboThisRun,
    eventLog: combo.eventLog
  };
}
