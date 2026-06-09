import type { GameEvent } from './events';

export interface ChainSummary {
  pressureDamage: number;
  riskGained: number;
  riskReduced: number;
  profitGained: number;
  cashGained: number;
  cashSpent: number;
  netCash: number;
  comboGained: number;
  toolTriggers: number;
  keyEvents: string[];
}

export interface CashTransaction {
  amount: number;
  source: string;
  type: 'GAIN' | 'SPEND';
  message: string;
  turn: number;
  nodeId: string | null;
}

const KEY_EVENT_TYPES = new Set([
  'MARKET_PRESSURE_CLEARED',
  'REWARD_DROPPED',
  'BANKRUPTCY_WARNING',
  'ENEMY_INTENT_RESOLVED',
  'TRADE_ENDED',
  'EVENT_QUEUE_HALTED'
]);

export function aggregateChainSummary(
  events: readonly GameEvent[],
  cashTransactions: readonly CashTransaction[] = []
): ChainSummary {
  const summary = events.reduce<ChainSummary>(
    (summary, event) => {
      if (event.type === 'MARKET_PRESSURE_DAMAGED') {
        summary.pressureDamage += event.value ?? 0;
      }

      if (event.type === 'RISK_GAINED') {
        summary.riskGained += event.value ?? 0;
      }

      if (event.type === 'RISK_REDUCED') {
        summary.riskReduced += event.value ?? 0;
      }

      if (event.type === 'PROFIT_GAINED') {
        summary.profitGained += event.value ?? 0;
      }

      if (event.type === 'COMBO_GAINED') {
        summary.comboGained += event.value ?? 0;
      }

      if (event.type === 'TOOL_TRIGGERED') {
        summary.toolTriggers += 1;
      }

      if (isKeyEvent(event)) {
        summary.keyEvents.push(event.message);
      }

      return summary;
    },
    {
      pressureDamage: 0,
      riskGained: 0,
      riskReduced: 0,
      profitGained: 0,
      cashGained: 0,
      cashSpent: 0,
      netCash: 0,
      comboGained: 0,
      toolTriggers: 0,
      keyEvents: []
    }
  );

  for (const transaction of cashTransactions) {
    if (transaction.type === 'GAIN') {
      summary.cashGained += transaction.amount;
      summary.netCash += transaction.amount;
    } else {
      summary.cashSpent += transaction.amount;
      summary.netCash -= transaction.amount;
    }

    summary.keyEvents.push(transaction.message);
  }

  return summary;
}

export function getKeyEventLog(eventLog: readonly string[]) {
  return eventLog
    .filter((message) => {
      if (message.includes('获得 ') && message.includes('收益')) return false;
      if (message.includes('受到 ') && message.includes('压力伤害')) return false;
      if (message.includes('抽 1 张')) return false;
      return true;
    })
    .slice(-5);
}

function isKeyEvent(event: GameEvent) {
  if (KEY_EVENT_TYPES.has(event.type)) {
    return true;
  }

  if (event.type === 'RISK_GAINED' && (event.value ?? 0) >= 10) {
    return true;
  }

  if (event.type === 'TOOL_TRIGGERED') {
    return true;
  }

  return false;
}
