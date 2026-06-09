import type { Tool } from '../game/types';

export const TOOLS: Tool[] = [
  {
    id: 'tool-limit-up-calculator',
    name: '涨停板计算器',
    category: 'GREED',
    description: '每次选择继续持有时，下一日浮盈延续倍率额外 +0.2。',
    effects: [{ type: 'HOLD_CARRY_BONUS', bonus: 0.2 }]
  },
  {
    id: 'tool-red-candle-stamp',
    name: '红烛印章',
    category: 'GREED',
    description: '每次结算时，工具收益倍率 x1.08。',
    effects: [{ type: 'TOOL_RETURN_MULTIPLIER', multiplier: 1.08 }]
  },
  {
    id: 'tool-hot-money-compass',
    name: '游资罗盘',
    category: 'GREED',
    description: '每有 1 张热门板块牌，工具收益倍率 +0.04。',
    effects: [{ type: 'HOT_SECTOR_RETURN_BONUS', bonusPerCard: 0.04 }]
  },
  {
    id: 'tool-bubble-loupe',
    name: '泡沫放大镜',
    category: 'GREED',
    description: '牛市时工具收益倍率 +0.15。',
    effects: [{ type: 'MOOD_RETURN_BONUS', mood: 'BULL', bonus: 0.15 }]
  },
  {
    id: 'tool-old-trader-cup',
    name: '老股民茶杯',
    category: 'RISK_CONTROL',
    description: '每局第一次亏损时，自动锁定 30% 当前浮盈。',
    effects: [{ type: 'FIRST_LOSS_LOCK_FLOATING_PROFIT', ratio: 0.3 }]
  },
  {
    id: 'tool-broker-insurance',
    name: '券商保险单',
    category: 'RISK_CONTROL',
    description: '第一次爆仓时不会退市，本金变为 1，清空浮盈。',
    effects: [{ type: 'PREVENT_FIRST_BANKRUPTCY', principalAfterSave: 1 }]
  },
  {
    id: 'tool-stop-loss-ruler',
    name: '止损尺',
    category: 'RISK_CONTROL',
    description: '每次结算风险 -5。',
    effects: [{ type: 'RISK_GAIN_FLAT', amount: -5 }]
  },
  {
    id: 'tool-calm-bell',
    name: '冷静铃',
    category: 'RISK_CONTROL',
    description: '高波动日风险 -8。',
    effects: [{ type: 'VOLATILITY_RISK_REDUCTION', threshold: 1.15, amount: 8 }]
  },
  {
    id: 'tool-industry-reports',
    name: '行业研报库',
    category: 'SECTOR',
    description: '同板块组合的牌型倍率 +0.5。',
    effects: [{ type: 'SAME_SECTOR_COMBO_BONUS', bonus: 0.5 }]
  },
  {
    id: 'tool-sector-thermometer',
    name: '板块温度计',
    category: 'SECTOR',
    description: '每有 1 张热门板块牌，工具收益倍率 +0.03。',
    effects: [{ type: 'HOT_SECTOR_RETURN_BONUS', bonusPerCard: 0.03 }]
  },
  {
    id: 'tool-weak-sector-umbrella',
    name: '弱势板块雨伞',
    category: 'SECTOR',
    description: '每有 1 张弱势板块牌，结算风险 -2。',
    effects: [{ type: 'WEAK_SECTOR_RISK_REDUCTION', amountPerCard: 2 }]
  },
  {
    id: 'tool-blue-chip-ledger',
    name: '蓝筹账本',
    category: 'SECTOR',
    description: '如果 5 张牌都是低风险牌，工具收益倍率 +0.12。',
    effects: [{ type: 'LOW_RISK_RETURN_BONUS', bonus: 0.12 }]
  },
  {
    id: 'tool-chive-notebook',
    name: '韭菜笔记本',
    category: 'LOSS_REBOUND',
    description: '每次亏损后，下一次结算收益 +25%。',
    effects: [{ type: 'AFTER_LOSS_NEXT_PROFIT_MULTIPLIER', multiplier: 1.25 }]
  },
  {
    id: 'tool-rebound-spring',
    name: '反弹弹簧',
    category: 'LOSS_REBOUND',
    description: '熊市时工具收益倍率 +0.1。',
    effects: [{ type: 'MOOD_RETURN_BONUS', mood: 'BEAR', bonus: 0.1 }]
  },
  {
    id: 'tool-bargain-basket',
    name: '抄底菜篮',
    category: 'LOSS_REBOUND',
    description: '如果 5 张牌都是高风险牌，工具收益倍率 +0.18。',
    effects: [{ type: 'HIGH_RISK_RETURN_BONUS', bonus: 0.18 }]
  },
  {
    id: 'tool-paper-hands-gloves',
    name: '纸手套',
    category: 'LOSS_REBOUND',
    description: '每次结算风险 -3。',
    effects: [{ type: 'RISK_GAIN_FLAT', amount: -3 }]
  },
  {
    id: 'tool-margin-stamp',
    name: '融资印章',
    category: 'LEVERAGE',
    description: '有杠杆时工具收益倍率 +0.2。',
    effects: [{ type: 'LEVERAGE_RETURN_BONUS', bonus: 0.2 }]
  },
  {
    id: 'tool-margin-seatbelt',
    name: '杠杆安全带',
    category: 'LEVERAGE',
    description: '有杠杆时结算风险 -10。',
    effects: [{ type: 'LEVERAGE_RISK_REDUCTION', amount: 10 }]
  },
  {
    id: 'tool-double-or-nothing-coin',
    name: '梭哈硬币',
    category: 'LEVERAGE',
    description: '每次结算工具收益倍率 x1.15。',
    effects: [{ type: 'TOOL_RETURN_MULTIPLIER', multiplier: 1.15 }]
  },
  {
    id: 'tool-liquidation-helmet',
    name: '爆仓头盔',
    category: 'LEVERAGE',
    description: '高波动日风险 -6。',
    effects: [{ type: 'VOLATILITY_RISK_REDUCTION', threshold: 1.1, amount: 6 }]
  }
];
