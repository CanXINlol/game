import type { RouteEvent } from '../game/types';

export const ROUTE_EVENTS: RouteEvent[] = [
  {
    id: 'midnight-rumor',
    title: '午夜传闻',
    description: '群里流传一条未证实利好。你可以追，也可以装没看见。',
    choices: [
      { id: 'chase', label: '追传闻', description: '获得 60 floatingProfit，风险 +12。', riskDelta: 12, cashDelta: 0 },
      { id: 'ignore', label: '无视', description: '风险 -5，不得收益。', riskDelta: -5 },
      { id: 'hedge', label: '小仓位试探', description: '支付 30 cash，获得 40 floatingProfit。', cost: 30, cashDelta: -30 }
    ]
  },
  {
    id: 'risk-call',
    title: '风控电话',
    description: '风控部门来电，语气很客气，意思很明白。',
    choices: [
      { id: 'comply', label: '配合降杠杆', description: '风险 -20，失去 80 floatingProfit。', riskDelta: -20 },
      { id: 'argue', label: '口头争辩', description: '风险 -8，支付 20 cash。', cost: 20, cashDelta: -20, riskDelta: -8 },
      { id: 'ignore-call', label: '直接挂断', description: '风险 +15，下回合收益 x1.2。', riskDelta: 15 }
    ]
  },
  {
    id: 'orphan-report',
    title: '无人认领的研报',
    description: '一份匿名研报躺在桌上，数字写得很大。',
    choices: [
      { id: 'believe', label: '相信研报', description: '获得 90 floatingProfit，风险 +10。', riskDelta: 10 },
      { id: 'sell', label: '卖掉情报', description: '获得 50 cash。', cashDelta: 50 },
      { id: 'verify', label: '花cash核实', description: '支付 40 cash，风险 -10，获得 50 floatingProfit。', cost: 40, cashDelta: -40, riskDelta: -10 }
    ]
  },
  {
    id: 'blackout',
    title: '黑屏三分钟',
    description: '行情终端黑屏。重启后，有人暴富，有人爆仓。',
    choices: [
      { id: 'wait', label: '等待恢复', description: '风险 -5。', riskDelta: -5 },
      { id: 'panic', label: '恐慌抛售', description: '失去 100 floatingProfit，获得 40 cash。', cashDelta: 40 },
      { id: 'gamble', label: '赌反弹', description: '风险 +20，获得 120 floatingProfit。', riskDelta: 20 }
    ]
  },
  {
    id: 'insider-tip',
    title: '内线纸条',
    description: '一张皱巴巴的纸条写着“尾盘拉升”。',
    choices: [
      { id: 'act', label: '照做', description: '获得 70 floatingProfit，风险 +8。', riskDelta: 8 },
      { id: 'burn', label: '烧掉纸条', description: '风险 -3。', riskDelta: -3 },
      { id: 'share', label: '分发给群友', description: '支付 25 cash，风险 +5，获得 55 floatingProfit。', cost: 25, cashDelta: -25, riskDelta: 5 }
    ]
  },
  {
    id: 'margin-warning',
    title: '追保短信',
    description: '券商短信：您的账户接近警戒线。',
    choices: [
      { id: 'pay', label: '补缴保证金', description: '支付 60 cash，风险 -18。', cost: 60, cashDelta: -60, riskDelta: -18 },
      { id: 'roll', label: '展期', description: '风险 +5，获得 40 floatingProfit。', riskDelta: 5 },
      { id: 'cut', label: '砍仓', description: '失去 60 floatingProfit，风险 -25。', riskDelta: -25 }
    ]
  },
  {
    id: 'hot-sector',
    title: '板块轮动',
    description: '热点板块突然切换，旧龙头失宠。',
    choices: [
      { id: 'switch', label: '换赛道', description: '支付 35 cash，获得一张随机牌。', cost: 35, cashDelta: -35, cardId: 'random' },
      { id: 'hold-sector', label: '死守', description: '风险 +10，floatingProfit +30。', riskDelta: 10 },
      { id: 'hedge-sector', label: '对冲', description: '风险 -12，不得收益。', riskDelta: -12 }
    ]
  },
  {
    id: 'fake-news',
    title: '假新闻冲击',
    description: '一条假新闻刷屏，市场剧烈波动。',
    choices: [
      { id: 'buy-dip', label: '低吸', description: '风险 +12，获得 80 floatingProfit。', riskDelta: 12 },
      { id: 'wait-out', label: '观望', description: '风险 -8。', riskDelta: -8 },
      { id: 'short', label: '反向操作', description: '风险 +18，获得 110 floatingProfit。', riskDelta: 18 }
    ]
  },
  {
    id: 'bonus-day',
    title: '意外分红',
    description: '持仓公司突然宣布特别分红。',
    choices: [
      { id: 'take', label: '落袋', description: '获得 80 cash。', cashDelta: 80 },
      { id: 'reinvest', label: '再投入', description: '获得 50 floatingProfit，风险 +6。', riskDelta: 6 },
      { id: 'donate', label: '请客吃饭', description: '支付 40 cash，风险 -10。', cost: 40, cashDelta: -40, riskDelta: -10 }
    ]
  },
  {
    id: 'audit-knock',
    title: '突击审计',
    description: '审计组突然到访，所有杠杆账户被重点关注。',
    choices: [
      { id: 'cooperate', label: '配合检查', description: '风险 -15，支付 50 cash。', cost: 50, cashDelta: -50, riskDelta: -15 },
      { id: 'hide', label: '转移仓位', description: '风险 +8，锁定 60 floatingProfit。', riskDelta: 8 },
      { id: 'lawyer', label: '请律师', description: '支付 70 cash，风险 -20。', cost: 70, cashDelta: -70, riskDelta: -20 }
    ]
  },
  {
    id: 'whale-move',
    title: '大户异动',
    description: '龙虎榜出现神秘席位，市场议论纷纷。',
    choices: [
      { id: 'follow', label: '跟庄', description: '风险 +14，获得 95 floatingProfit。', riskDelta: 14 },
      { id: 'fade', label: '反向', description: '风险 +8，获得 45 floatingProfit。', riskDelta: 8 },
      { id: 'watch', label: '只看不动', description: '风险 -5，获得 25 cash。', riskDelta: -5, cashDelta: 25 }
    ]
  },
  {
    id: 'system-glitch',
    title: '系统故障',
    description: '交易软件卡顿，部分订单状态不明。',
    choices: [
      { id: 'retry', label: '重试下单', description: '风险 +6，获得 55 floatingProfit。', riskDelta: 6 },
      { id: 'cancel', label: '全部撤单', description: '风险 -10，失去 40 floatingProfit。', riskDelta: -10 },
      { id: 'manual', label: '电话委托', description: '支付 30 cash，获得 70 floatingProfit，风险 +4。', cost: 30, cashDelta: -30, riskDelta: 4 }
    ]
  }
];

export const EVENT_BY_ID = Object.fromEntries(ROUTE_EVENTS.map((e) => [e.id, e])) as Record<string, RouteEvent>;

export function getRouteEvent(id: string): RouteEvent {
  const event = EVENT_BY_ID[id];
  if (!event) throw new Error(`Unknown event: ${id}`);
  return event;
}




