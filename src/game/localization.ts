import type { EncounterStatus, RunStatus, TradeCardArchetype, TradeCardRarity, TradeCardRole } from './types';

export const CARD_RARITY_LABELS = {
  COMMON: '普通',
  UNCOMMON: '优秀',
  RARE: '稀有'
} satisfies Record<TradeCardRarity, string>;

export const CARD_ARCHETYPE_LABELS = {
  STEADY: '稳健',
  MOMENTUM: '追涨',
  LEVERAGE: '杠杆',
  RISK_CONTROL: '风控',
  QUANT: '量化'
} satisfies Record<TradeCardArchetype, string>;

export const CARD_ROLE_LABELS = {
  STARTER: '启动',
  BOOSTER: '放大',
  PAYOFF: '收益',
  DEFENSE: '防守',
  CASH_OUT: '止盈',
  ENGINE: '引擎'
} satisfies Record<TradeCardRole, string>;

export const RUN_STATUS_LABELS = {
  START: '准备开局',
  ROUTE_SELECT: '路线选择',
  PLAYER_TURN: '玩家回合',
  GREED_CHOICE: '贪婪选择',
  REWARD: '行情结束',
  SHOP: '商店',
  REST: '休整',
  RISK_CONTROL: '风控室',
  EVENT: '事件',
  RUN_WON: '胜利',
  RUN_LOST: '爆仓失败'
} satisfies Record<RunStatus, string>;

export const ENCOUNTER_STATUS_LABELS = {
  ACTIVE: '进行中',
  GREED_CHOICE: '已达目标',
  REWARD: '奖励',
  ENDED: '已结束',
  BANKRUPT: '爆仓'
} satisfies Record<EncounterStatus, string>;


