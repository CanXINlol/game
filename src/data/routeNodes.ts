export const ROUTE_NODE_TYPES = [
  'NORMAL_MARKET',
  'ELITE_MARKET',
  'EVENT',
  'RISK_CONTROL',
  'SHOP',
  'REST',
  'BOSS'
] as const;

export type RouteNodeType = (typeof ROUTE_NODE_TYPES)[number];

export interface RouteNodeContent {
  label: string;
  title: string;
  description: string;
  rewardText: string;
  riskText: string;
}

export const ROUTE_NODE_CONTENT: Record<RouteNodeType, RouteNodeContent> = {
  NORMAL_MARKET: {
    label: '普通异动',
    title: '夜盘异动',
    description: '终端闪过一段不完整行情，适合稳定推进构筑。',
    rewardText: '普通牌 / 少量现金 / 降低风险',
    riskText: '压力较低'
  },
  ELITE_MARKET: {
    label: '精英怪谈',
    title: '龙虎榜幽灵',
    description: '更强的怪异行情，奖励明显更好。',
    rewardText: '工具 / 稀有牌 / 大量现金',
    riskText: '高压力'
  },
  EVENT: {
    label: '怪谈事件',
    title: '午夜传闻',
    description: '一条说不清来源的消息，可能改变牌组或现金。',
    rewardText: '特殊收益',
    riskText: '结果不稳定'
  },
  RISK_CONTROL: {
    label: '风控室',
    title: '风控室',
    description: '删牌、降风险、锁定收益的节点。',
    rewardText: '删牌 / 降低风险 / 锁定收益',
    riskText: '低压力'
  },
  SHOP: {
    label: '商店',
    title: '交易商店',
    description: '使用现金购买牌、工具或服务。',
    rewardText: '花现金换构筑',
    riskText: '需要现金'
  },
  REST: {
    label: '休整点',
    title: '休整点',
    description: '升级牌或修整风险。',
    rewardText: '升级 / 降低风险',
    riskText: '安全'
  },
  BOSS: {
    label: '终端噩兆',
    title: '红线审计',
    description: '每一幕末尾的压迫性行情。击穿第三幕噩兆即通关。',
    rewardText: '强力工具 / 关键奖励',
    riskText: '极高压力'
  }
};

export const ACT_LAYER_COUNTS = {
  1: 8,
  2: 9,
  3: 10
} as const;
