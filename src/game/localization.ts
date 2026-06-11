import type { MarketIntentType } from './encounters';
import type { FormalCardType } from './effects';
import type { GameEventType } from './events';
import type { GamePhase } from './playCard';
import type { RewardKind } from './rewards';
import type { EventCardRole, RiskLevel, Sector } from './types';

export type ToolRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
export type RunResult = 'idle' | 'running' | 'won' | 'lost';

export const GAME_EVENT_TYPE_LABELS = {
  CARD_PLAYED: '打出卡牌',
  PROFIT_GAINED: '收益增加',
  RISK_GAINED: '风险上升',
  RISK_REDUCED: '风险降低',
  SECTOR_TRIGGERED: '板块触发',
  RANK_CHAINED: '评级连锁',
  LIMIT_UP: '涨停',
  LIMIT_DOWN: '跌停',
  TOOL_TRIGGERED: '工具触发',
  COMBO_GAINED: '连击增加',
  MARKET_PRESSURE_DAMAGED: '市场压力受损',
  MARKET_PRESSURE_CLEARED: '击穿市场压力',
  REWARD_DROPPED: '奖励掉落',
  ENEMY_INTENT_RESOLVED: '敌方意图结算',
  BANKRUPTCY_WARNING: '爆仓警告',
  LEVERAGE_ADDED: '杠杆增加',
  CARD_COPIED: '复制卡牌',
  CARD_DRAWN: '抽牌',
  AP_GAINED: '行动点增加',
  CASH_OUT: '止盈',
  LOSS_TAKEN: '承受亏损',
  TRADE_ENDED: '结束交易',
  TURBOTURN_STEP: '快速轮转推进',
  TURBOTURN_COMPLETE: '快速轮转完成',
  EVENT_QUEUE_HALTED: '事件队列中止'
} satisfies Record<GameEventType, string>;

export const CARD_TYPE_LABELS = {
  BUY: '买入',
  CHASE: '追击',
  DIP_BUY: '低吸',
  LEVERAGE: '杠杆',
  CASH_OUT: '止盈',
  DRAW: '抽牌',
  COPY: '复制',
  SECTOR: '板块',
  RISK: '风险',
  FINISHER: '终结'
} satisfies Record<FormalCardType, string>;

export const CARD_ROLE_LABELS = {
  STARTER: '启动',
  EXTENDER: '延展',
  PAYOFF: '回报',
  DEFENSE: '风控',
  FINISHER: '终结'
} satisfies Record<EventCardRole, string>;

export const RISK_LEVEL_LABELS = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
  extreme: '极高风险'
} satisfies Record<RiskLevel, string>;

export const SECTOR_LABELS = {
  TECH: '科技',
  CONSUMER: '消费',
  MEDICAL: '医药',
  ENERGY: '能源',
  FINANCE: '金融'
} satisfies Record<Sector, string>;

export const GAME_PHASE_LABELS = {
  ROUTE_SELECT: '路线选择',
  ENCOUNTER_START: '遭遇开始',
  PLAYER_TURN: '玩家回合',
  RESOLVING_QUEUE: '事件结算',
  ENEMY_INTENT: '敌方意图结算',
  REWARD: '选择奖励',
  SHOP: '商店',
  REST: '休整',
  DAY_END: '日终选择',
  RUN_WON: '通关',
  RUN_LOST: '失败'
} satisfies Record<GamePhase, string>;

export const ENCOUNTER_INTENT_TYPE_LABELS = {
  RISK_ATTACK: '风险打击',
  SHIELD_UP: '加厚护盾',
  WEAKEN_SECTOR: '削弱板块',
  TAX_PROFIT: '浮盈征税',
  LOCK_HAND: '锁手提费',
  VOLATILITY_SPIKE: '波动尖刺',
  SUMMON_NOISE: '噪音入场'
} satisfies Record<MarketIntentType, string>;

export const REWARD_TYPE_LABELS = {
  ADD_CARD: '新牌',
  UPGRADE_CARD: '升级',
  ADD_TOOL: '工具',
  REMOVE_CARD: '删牌',
  REDUCE_RISK: '风控',
  LOCK_PROFIT: '止盈',
  GAIN_CASH: '现金',
  INITIAL_COMBO: '连击',
  SKIP: '跳过'
} satisfies Record<RewardKind, string>;

export const TOOL_RARITY_LABELS = {
  COMMON: '普通',
  UNCOMMON: '优秀',
  RARE: '稀有',
  EPIC: '史诗',
  LEGENDARY: '传说'
} satisfies Record<ToolRarity, string>;

export const RUN_RESULT_LABELS = {
  idle: '未开始',
  running: '进行中',
  won: '胜利',
  lost: '失败'
} satisfies Record<RunResult, string>;

const DIRECT_TEXT_REPLACEMENTS = {
  MarketPressure: '市场压力',
  MaxHP: '最大生命',
  HP: '生命',
  Shield: '护盾',
  Weakness: '弱点',
  Resistance: '抗性',
  Risk: '风险',
  risk: '风险',
  risk_GAINED: '风险上升',
  maxRisk: '最大风险',
  cash: '现金',
  Cash: '现金',
  Boss: '首领',
  AP: '行动点',
  combo: '连击',
  Combo: '连击',
  Turboturn: '快速轮转',
  hotSector: '热点板块',
  cost: '费用'
} satisfies Record<string, string>;

const TOKEN_LABELS: Record<string, string> = {
  ...GAME_EVENT_TYPE_LABELS,
  ...CARD_TYPE_LABELS,
  ...CARD_ROLE_LABELS,
  ...RISK_LEVEL_LABELS,
  ...SECTOR_LABELS,
  ...GAME_PHASE_LABELS,
  ...ENCOUNTER_INTENT_TYPE_LABELS,
  ...REWARD_TYPE_LABELS,
  ...TOOL_RARITY_LABELS,
  ...RUN_RESULT_LABELS,
  ...DIRECT_TEXT_REPLACEMENTS
};

export function localizeGameEventType(value: GameEventType) {
  return translate(GAME_EVENT_TYPE_LABELS, value);
}

export function localizeCardType(value: FormalCardType) {
  return translate(CARD_TYPE_LABELS, value);
}

export function localizeCardRole(value: EventCardRole) {
  return translate(CARD_ROLE_LABELS, value);
}

export function localizeRiskLevel(value: RiskLevel) {
  return translate(RISK_LEVEL_LABELS, value);
}

export function localizeSector(value: string) {
  return translate(SECTOR_LABELS, value);
}

export function localizeGamePhase(value: GamePhase | 'start') {
  if (value === 'start') {
    return '等待开局';
  }

  return translate(GAME_PHASE_LABELS, value);
}

export function localizeEncounterIntentType(value: MarketIntentType) {
  return translate(ENCOUNTER_INTENT_TYPE_LABELS, value);
}

export function localizeRewardType(value: RewardKind) {
  return translate(REWARD_TYPE_LABELS, value);
}

export function localizeToolRarity(value: ToolRarity) {
  return translate(TOOL_RARITY_LABELS, value);
}

export function localizeRunResult(value: RunResult) {
  return translate(RUN_RESULT_LABELS, value);
}

export function localizeText(text: string) {
  return Object.entries(TOKEN_LABELS)
    .sort(([left], [right]) => right.length - left.length)
    .reduce((result, [token, label]) => {
      return result.replace(new RegExp(`\\b${escapeRegExp(token)}\\b`, 'g'), label);
    }, text);
}

function translate<T extends Record<string, string>>(labels: T, key: string) {
  return labels[key] ?? getMissingTranslationLabel(key);
}

function getMissingTranslationLabel(key: string) {
  return isProductionLikeBrowser() ? '未知' : `未翻译：${key}`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isProductionLikeBrowser() {
  if (typeof window === 'undefined') {
    return false;
  }

  return !['localhost', '127.0.0.1'].includes(window.location.hostname);
}
