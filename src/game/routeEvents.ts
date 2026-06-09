import { gainCash, spendCash } from './economy';
import type { EventGameState } from './playCard';
import { FORMAL_EVENT_CARDS, FORMAL_EVENT_TOOLS } from './formalContent';
import { addCardToDeck, addToolToRun } from './economy';
import { createRng } from './rng';

export interface RouteEventChoice {
  id: string;
  label: string;
  costText: string;
  rewardText: string;
  disabledReason?: string;
}

export interface RouteEventDefinition {
  id: string;
  title: string;
  description: string;
  choices: RouteEventChoice[];
}

const ROUTE_EVENTS: RouteEventDefinition[] = [
  {
    id: 'midnight-rumor',
    title: '午夜传闻',
    description: '交易终端在收盘后闪烁，一条未经确认的题材消息正在扩散。',
    choices: [
      {
        id: 'chase-rumor',
        label: '追入传闻',
        costText: 'risk +12',
        rewardText: '获得一张追涨牌'
      },
      {
        id: 'sell-rumor',
        label: '卖给别人',
        costText: '失去 20 浮盈',
        rewardText: 'cash +60'
      },
      {
        id: 'ignore-rumor',
        label: '忽略',
        costText: '无',
        rewardText: 'risk -5'
      }
    ]
  },
  {
    id: 'risk-call',
    title: '风控电话',
    description: '券商风控员要求你降低仓位，否则将提高保证金。',
    choices: [
      {
        id: 'pay-margin',
        label: '补保证金',
        costText: 'cash -50',
        rewardText: 'risk -20'
      },
      {
        id: 'hold-through',
        label: '硬扛',
        costText: 'risk +20',
        rewardText: '获得一个工具'
      },
      {
        id: 'cut-position',
        label: '减仓',
        costText: '失去一张随机手牌直到下个节点',
        rewardText: '锁定 30% 浮盈'
      }
    ]
  },
  {
    id: 'orphan-report',
    title: '无人认领的研报',
    description: '一份没有署名的研报躺在终端缓存里，结论鲜红，日期却被抹掉了。',
    choices: [
      {
        id: 'chase-rumor',
        label: '照单追入',
        costText: 'risk +12',
        rewardText: '获得一张追涨牌'
      },
      {
        id: 'sell-rumor',
        label: '转手卖掉',
        costText: '失去 20 浮盈',
        rewardText: 'cash +60'
      },
      {
        id: 'ignore-rumor',
        label: '丢进回收站',
        costText: '无',
        rewardText: 'risk -5'
      }
    ]
  },
  {
    id: 'expired-good-news',
    title: '过期利好',
    description: '公告栏弹出一条旧利好，像隔夜涨停板一样还冒着热气。',
    choices: [
      {
        id: 'chase-rumor',
        label: '假装新鲜',
        costText: 'risk +12',
        rewardText: '获得一张追涨牌'
      },
      {
        id: 'sell-rumor',
        label: '包装转卖',
        costText: '失去 20 浮盈',
        rewardText: 'cash +60'
      },
      {
        id: 'ignore-rumor',
        label: '承认过期',
        costText: '无',
        rewardText: 'risk -5'
      }
    ]
  },
  {
    id: 'black-screen',
    title: '黑屏三分钟',
    description: '交易终端黑屏三分钟，恢复时账户曲线像什么都没发生过一样平静。',
    choices: [
      {
        id: 'pay-margin',
        label: '补保证金',
        costText: 'cash -50',
        rewardText: 'risk -20'
      },
      {
        id: 'hold-through',
        label: '盯住黑屏',
        costText: 'risk +20',
        rewardText: '获得一个工具'
      },
      {
        id: 'cut-position',
        label: '先砍仓位',
        costText: '失去一张随机手牌直到下个节点',
        rewardText: '锁定 30% 浮盈'
      }
    ]
  },
  {
    id: 'old-trader-cup',
    title: '老股民的茶杯',
    description: '一个老股民把茶杯推到你面前，杯底沉着一圈看不懂的 K 线。',
    choices: [
      {
        id: 'pay-margin',
        label: '听完故事',
        costText: 'cash -50',
        rewardText: 'risk -20'
      },
      {
        id: 'hold-through',
        label: '反向理解',
        costText: 'risk +20',
        rewardText: '获得一个工具'
      },
      {
        id: 'cut-position',
        label: '敬茶离席',
        costText: '失去一张随机手牌直到下个节点',
        rewardText: '锁定 30% 浮盈'
      }
    ]
  },
  {
    id: 'red-in-safe',
    title: '保险柜里的红字',
    description: '保险柜自己打开了，里面没有现金，只有一行正在刷新的红字。',
    choices: [
      {
        id: 'pay-margin',
        label: '补上缺口',
        costText: 'cash -50',
        rewardText: 'risk -20'
      },
      {
        id: 'hold-through',
        label: '签下红字',
        costText: 'risk +20',
        rewardText: '获得一个工具'
      },
      {
        id: 'cut-position',
        label: '锁走浮盈',
        costText: '失去一张随机手牌直到下个节点',
        rewardText: '锁定 30% 浮盈'
      }
    ]
  }
];

export function getRouteEventDefinitions() {
  return ROUTE_EVENTS.map((event) => ({
    ...event,
    choices: event.choices.map((choice) => ({ ...choice }))
  }));
}

export function getRouteEvent(state: EventGameState): RouteEventDefinition {
  const rng = createRng(`${state.seed}-event-${state.routeMap.currentNodeId ?? 'none'}`);
  const event = rng.pick(ROUTE_EVENTS);

  return {
    ...event,
    choices: event.choices.map((choice) => ({
      ...choice,
      disabledReason: getChoiceDisabledReason(state, choice.id)
    }))
  };
}

export function applyRouteEventChoice(state: EventGameState, choiceId: string) {
  if (state.nodeActionUsed) {
    return { success: false, message: '本事件已经选择过一次。' };
  }

  const event = getRouteEvent(state);
  const choice = event.choices.find((item) => item.id === choiceId);

  if (!choice) {
    return { success: false, message: '未知事件选择。' };
  }

  if (choice.disabledReason) {
    return { success: false, message: choice.disabledReason };
  }

  const result = applyChoiceEffect(state, choice.id);

  if (result.success) {
    state.nodeActionUsed = true;
    state.combo.eventLog.push(`事件选择：${event.title} / ${choice.label}。`);
  }

  return result;
}

function applyChoiceEffect(state: EventGameState, choiceId: string) {
  if (choiceId === 'chase-rumor') {
    const chaseCard =
      FORMAL_EVENT_CARDS.find((card) => card.cardType === 'CHASE') ??
      FORMAL_EVENT_CARDS[0];
    addCardToDeck(state, chaseCard);
    state.risk = Math.round((state.risk + 12) * 100) / 100;
    return { success: true, message: `追入传闻：获得 ${chaseCard.name}，risk +12。` };
  }

  if (choiceId === 'sell-rumor') {
    state.combo.currentChainProfit = Math.max(
      0,
      Math.round((state.combo.currentChainProfit - 20) * 100) / 100
    );
    gainCash(state, 60, '卖出传闻');
    return { success: true, message: '卖给别人：现金 +60，浮盈 -20。' };
  }

  if (choiceId === 'ignore-rumor') {
    state.risk = Math.max(0, Math.round((state.risk - 5) * 100) / 100);
    return { success: true, message: '忽略传闻：risk -5。' };
  }

  if (choiceId === 'pay-margin') {
    const payment = spendCash(state, 50, '补保证金');
    if (!payment.success) return payment;
    state.risk = Math.max(0, Math.round((state.risk - 20) * 100) / 100);
    return { success: true, message: '补保证金：现金 -50，risk -20。' };
  }

  if (choiceId === 'hold-through') {
    const tool = FORMAL_EVENT_TOOLS.find(
      (candidate) => !state.tools.some((owned) => owned.id === candidate.id)
    );
    state.risk = Math.round((state.risk + 20) * 100) / 100;
    if (tool) addToolToRun(state, tool);
    return {
      success: true,
      message: tool ? `硬扛：获得 ${tool.name}，risk +20。` : '硬扛：risk +20。'
    };
  }

  if (choiceId === 'cut-position') {
    const locked = Math.round(state.combo.currentChainProfit * 0.3 * 100) / 100;
    state.combo.currentChainProfit = Math.round(
      (state.combo.currentChainProfit - locked) * 100
    ) / 100;
    state.lockedProfit = Math.round((state.lockedProfit + locked) * 100) / 100;
    state.hand = state.hand.slice(1);
    return { success: true, message: `减仓：锁定 ${locked} 浮盈，失去 1 张手牌。` };
  }

  return { success: false, message: '未知事件选择。' };
}

function getChoiceDisabledReason(state: EventGameState, choiceId: string) {
  if (choiceId === 'pay-margin' && state.cash < 50) {
    return `现金不足：需要 50，当前 ${state.cash}。`;
  }

  if (choiceId === 'cut-position' && state.hand.length === 0) {
    return '没有可失去的手牌。';
  }

  return undefined;
}
