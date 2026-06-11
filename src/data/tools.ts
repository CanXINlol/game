import type { Tool } from '../game/types';

export const TOOLS: Tool[] = [
  { id: 'hot-money-seat', name: '游资席位', rarity: 'RARE', description: '每场行情第一次超过目标线，AP +1，风险 +5。', effectType: 'FIRST_TARGET_AP', value: 1 },
  { id: 'cash-safe', name: '现金保险箱', rarity: 'UNCOMMON', description: '第一次止盈离场时，额外转化 100 现金。', effectType: 'FIRST_TAKE_PROFIT_CASH', value: 100 },
  { id: 'quant-terminal', name: '量化终端', rarity: 'COMMON', description: '每回合第一次抽牌时，下一张牌费用 -1。', effectType: 'FIRST_DRAW_COST_REDUCE', value: 1 },
  { id: 'old-hand-cup', name: '老股民茶杯', rarity: 'COMMON', description: '每场行情第一次 风险超过 70，风险 -15。', effectType: 'FIRST_HIGH_RISK_REDUCE', value: 15 },
  { id: 'redline-margin', name: '红线融资单', rarity: 'RARE', description: '允许每回合透支 1 AP，透支时 风险 +15。', effectType: 'AP_OVERDRAFT', value: 1 },
  { id: 'black-pool-radar', name: '黑池雷达', rarity: 'UNCOMMON', description: '高危节点奖励 +25%，进入高危节点时 风险 +8。', effectType: 'ELITE_REWARD_BONUS', value: 0.25 },
  { id: 'risk-stamp', name: '风控印章', rarity: 'COMMON', description: '购买保险后，风险 -8。', effectType: 'INSURANCE_RISK_REDUCE', value: 8 },
  { id: 'closing-horn', name: '尾盘喇叭', rarity: 'UNCOMMON', description: '交易链最后一张牌获得浮盈 +30%。', effectType: 'LAST_CARD_PROFIT', value: 0.3 },
  { id: 'rebound-model', name: '反弹模型', rarity: 'COMMON', description: '风险 >= 60 时，低吸牌浮盈 +40%。', effectType: 'DIP_BONUS', value: 0.4 },
  { id: 'exit-alarm', name: '清仓闹钟', rarity: 'RARE', description: '达到目标线后，第一次继续持有时获得一次免费止盈机会。', effectType: 'FREE_TAKE_PROFIT', value: 1 },
  { id: 'profit-mirror', name: '盈利镜像', rarity: 'UNCOMMON', description: '交易链第一张收益牌浮盈 +25%。', effectType: 'CHAIN_START_BONUS', value: 0.25 },
  { id: 'dip-scanner', name: '低吸扫描仪', rarity: 'COMMON', description: '风险 >= 50 时，所有收益牌额外 +20 浮盈。', effectType: 'DIP_BONUS', value: 20 },
  { id: 'leverage-coil', name: '杠杆线圈', rarity: 'RARE', description: '杠杆牌风险增长 x1.5，但浮盈 +15%。', effectType: 'LEVERAGE_PROFIT', value: 0.15 },
  { id: 'greed-compass', name: '贪婪罗盘', rarity: 'UNCOMMON', description: '继续持有时，奖励倍率额外 +0.25。', effectType: 'GREED_REWARD', value: 0.25 },
  { id: 'noise-filter', name: '噪音过滤器', rarity: 'COMMON', description: 'Boss 战临时噪音无效。', effectType: 'NOISE_IMMUNE', value: 1 },
  { id: 'sector-bell', name: '板块铃铛', rarity: 'COMMON', description: '每回合第一次抽牌额外抽 1 张。', effectType: 'DRAW_BONUS', value: 1 },
  { id: 'stop-loss-chain', name: '止损链条', rarity: 'UNCOMMON', description: '锁定收益时额外 +15%。', effectType: 'LOCK_BONUS', value: 0.15 },
  { id: 'bull-whistle', name: '牛市哨子', rarity: 'RARE', description: '风险越高，收益牌浮盈越高（风险 x2）。', effectType: 'RISK_PROFIT', value: 2 },
  { id: 'panic-button', name: '恐慌按钮', rarity: 'UNCOMMON', description: 'Boss 战第一次爆仓缓冲生效。', effectType: 'BOSS_SHIELD', value: 1 },
  { id: 'trend-lens', name: '趋势透镜', rarity: 'COMMON', description: '商店服务价格 -15%。', effectType: 'SHOP_DISCOUNT', value: 0.15 }
];

export const TOOL_BY_ID = Object.fromEntries(TOOLS.map((t) => [t.id, t])) as Record<string, Tool>;

export function getTool(id: string): Tool {
  const tool = TOOL_BY_ID[id];
  if (!tool) throw new Error(`Unknown tool: ${id}`);
  return tool;
}




