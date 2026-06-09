import {
  ACT_LAYER_COUNTS,
  ROUTE_NODE_CONTENT,
  type RouteNodeType
} from '../data/routeNodes';
import { spendCash } from './economy';
import { createMarketPressureForRouteNode } from './marketPressure';
import type { EventGameState } from './playCard';
import { createRng } from './rng';
import { createShopState } from './shop';

export interface RouteNode {
  id: string;
  act: 1 | 2 | 3;
  layer: number;
  lane: number;
  type: RouteNodeType;
  title: string;
  description: string;
  rewardText: string;
  riskText: string;
  nextNodeIds: string[];
}

export interface RouteAct {
  act: 1 | 2 | 3;
  nodes: RouteNode[];
}

export interface RouteMapState {
  acts: RouteAct[];
  currentAct: 1 | 2 | 3;
  currentNodeId: string | null;
  completedNodeIds: string[];
  availableNodeIds: string[];
}

export interface RouteSelectionResult {
  success: boolean;
  message: string;
}

const ACTS = [1, 2, 3] as const;

const NORMAL_NODE_TITLES = [
  '散户踩踏',
  '夜盘异动',
  '玻璃涨停',
  '灰色研报',
  '迟到利好',
  '空头回声',
  '尾盘拉升',
  '假突破',
  '暗池波纹',
  '旧账重估'
];

const ELITE_NODE_TITLES = [
  '龙虎榜幽灵',
  '杠杆围城',
  '跌停回廊',
  '量化黑箱',
  '熔断前夜',
  '高位接盘局'
];

const EVENT_NODE_TITLES = [
  '午夜传闻',
  '风控电话',
  '无人认领的研报',
  '过期利好',
  '黑屏三分钟',
  '老股民的茶杯',
  '保险柜里的红字'
];

const BOSS_NODE_TITLES = {
  1: '红线审计',
  2: '黑池枯潮',
  3: '最后一根阳线'
} as const;

export function createRouteMap(seed: string): RouteMapState {
  const rng = createRng(`${seed}-route-map`);
  const acts = ACTS.map((act) => createRouteAct(act, rng));
  const firstLayerNodes = getLayerNodes(acts[0].nodes, 1);

  return {
    acts,
    currentAct: 1,
    currentNodeId: null,
    completedNodeIds: [],
    availableNodeIds: firstLayerNodes.map((node) => node.id)
  };
}

export function selectRouteNode(
  state: EventGameState,
  nodeId: string
): RouteSelectionResult {
  const routeMap = state.routeMap;
  const node = getRouteNode(routeMap, nodeId);

  if (!node || !routeMap.availableNodeIds.includes(nodeId)) {
    return {
      success: false,
      message: '该节点当前不可到达。'
    };
  }

  const previousAvailableNodeIds = [...routeMap.availableNodeIds];
  routeMap.currentNodeId = node.id;
  routeMap.currentAct = node.act;
  routeMap.availableNodeIds = [];
  state.day = node.act;
  state.nodeActionUsed = false;
  state.shopRefreshUsed = false;

  if (isEncounterNode(node)) {
    if (node.type === 'ELITE_MARKET') {
      const deposit = spendCash(state, 20, '精英路线保证金');

      if (!deposit.success) {
        routeMap.currentNodeId = null;
        routeMap.availableNodeIds = previousAvailableNodeIds;
        return deposit;
      }
    }

    startRouteEncounter(state, node);
    return {
      success: true,
      message: `进入${ROUTE_NODE_CONTENT[node.type].label}：${node.title}。`
    };
  }

  if (node.type === 'SHOP') {
    state.shopVisitCount += 1;
    state.shop = createShopState(state);
    state.phase = 'SHOP';
  } else if (node.type === 'REST' || node.type === 'RISK_CONTROL') {
    state.phase = 'REST';
  } else {
    state.phase = 'DAY_END';
  }

  state.combo.eventLog.push(`进入路线节点：${node.title}。${node.description}`);
  return {
    success: true,
    message: `进入路线节点：${node.title}。`
  };
}

export function completeCurrentRouteNode(state: EventGameState): RouteSelectionResult {
  const routeMap = state.routeMap;
  const node = routeMap.currentNodeId
    ? getRouteNode(routeMap, routeMap.currentNodeId)
    : null;

  if (!node) {
    return {
      success: false,
      message: '没有正在进行的路线节点。'
    };
  }

  if (!routeMap.completedNodeIds.includes(node.id)) {
    routeMap.completedNodeIds.push(node.id);
  }

  routeMap.currentNodeId = null;

  if (isFinalBossNode(node)) {
    routeMap.availableNodeIds = [];
    state.phase = 'RUN_WON';
    state.encounterStatus = 'CLEARED';
    state.runHistory.push('通关：击败第三幕最终 Boss。');
    state.combo.eventLog.push('最终 Boss 被击败，本局通关。');
    return {
      success: true,
      message: '击败第三幕最终 Boss，通关。'
    };
  }

  if (node.type === 'BOSS') {
    const nextAct = (node.act + 1) as RouteMapState['currentAct'];
    routeMap.currentAct = nextAct;
    routeMap.availableNodeIds = getLayerNodes(getAct(routeMap, nextAct).nodes, 1).map(
      (nextNode) => nextNode.id
    );
  } else {
    routeMap.availableNodeIds = node.nextNodeIds;
  }

  state.phase = 'ROUTE_SELECT';
  state.combo.eventLog.push('路线节点完成，选择下一步路线。');
  return {
    success: true,
    message: '路线节点完成。'
  };
}

export function applyRunFailureConditions(state: EventGameState) {
  if (state.risk >= state.maxRisk) {
    if (consumeLiquidationBuffer(state)) {
      return false;
    }

    if (consumeBossInsurance(state)) {
      return false;
    }

    state.phase = 'RUN_LOST';
    state.encounterStatus = 'LOST';
    state.runHistory.push(`失败：风险达到 ${state.risk}/${state.maxRisk}。`);
    return true;
  }

  const repayableCash = state.cash + state.lockedProfit + state.combo.currentChainProfit;
  if (state.cash < 0 && repayableCash < 0) {
    state.phase = 'RUN_LOST';
    state.encounterStatus = 'LOST';
    state.runHistory.push(`失败：现金 ${state.cash}，且无法偿还。`);
    return true;
  }

  return false;
}

function consumeLiquidationBuffer(state: EventGameState) {
  const buffer = state.consumables.find(
    (item) => item.id === 'insurance-liquidation-buffer'
  );

  if (!buffer) {
    return false;
  }

  state.consumables = state.consumables.filter((item) => item.id !== buffer.id);
  state.hasBossInsurance = false;
  state.bossInsuranceUsed = true;
  state.risk = Math.max(0, state.maxRisk - 10);
  state.phase = 'PLAYER_TURN';
  state.encounterStatus = 'ACTIVE';
  state.combo.eventLog.push('爆仓缓冲触发：risk 降到安全线。');
  return true;
}

export function getBossInsuranceStatus(state: EventGameState) {
  if (state.bossInsuranceUsed) {
    return '已触发';
  }

  if (state.hasBossInsurance) {
    return '已购买';
  }

  return '未购买';
}

export function isFinalBossCleared(state: EventGameState) {
  const node = state.routeMap.currentNodeId
    ? getRouteNode(state.routeMap, state.routeMap.currentNodeId)
    : null;

  return Boolean(node && isFinalBossNode(node) && state.marketPressure.hp <= 0);
}

export function isEncounterNode(node: RouteNode) {
  return (
    node.type === 'NORMAL_MARKET' ||
    node.type === 'ELITE_MARKET' ||
    node.type === 'BOSS'
  );
}

export function getRouteNode(routeMap: RouteMapState, nodeId: string) {
  return routeMap.acts
    .flatMap((act) => act.nodes)
    .find((node) => node.id === nodeId);
}

function createRouteAct(act: 1 | 2 | 3, rng: ReturnType<typeof createRng>): RouteAct {
  const layerCount = ACT_LAYER_COUNTS[act];
  const layers = Array.from({ length: layerCount }, (_, index) => {
    const layer = index + 1;
    const isBossLayer = layer === layerCount;
    const laneCount = isBossLayer ? 1 : rng.nextInt(2, 3);

    return Array.from({ length: laneCount }, (_lane, lane) =>
      createRouteNode(act, layer, lane, isBossLayer ? 'BOSS' : rng.pick(getAllowedNodeTypes(act, layer)))
    );
  });

  for (let layerIndex = 0; layerIndex < layers.length - 1; layerIndex += 1) {
    const currentLayer = layers[layerIndex];
    const nextLayer = layers[layerIndex + 1];

    for (const node of currentLayer) {
      node.nextNodeIds = nextLayer
        .filter((nextNode) => isAdjacentLane(node, nextNode, currentLayer.length))
        .map((nextNode) => nextNode.id);

      if (node.nextNodeIds.length === 0) {
        node.nextNodeIds = [nextLayer[Math.min(node.lane, nextLayer.length - 1)].id];
      }
    }
  }

  return {
    act,
    nodes: layers.flat()
  };
}

function createRouteNode(
  act: 1 | 2 | 3,
  layer: number,
  lane: number,
  type: RouteNodeType
): RouteNode {
  const content = ROUTE_NODE_CONTENT[type];
  const title = getRouteNodeTitle(type, act, layer, lane);

  return {
    id: `act-${act}-layer-${layer}-lane-${lane}-${type}`,
    act,
    layer,
    lane,
    type,
    title,
    description: content.description,
    rewardText: content.rewardText,
    riskText: content.riskText,
    nextNodeIds: []
  };
}

function getRouteNodeTitle(
  type: RouteNodeType,
  act: 1 | 2 | 3,
  layer: number,
  lane: number
) {
  const index = act * 17 + layer * 5 + lane;

  if (type === 'NORMAL_MARKET') {
    return NORMAL_NODE_TITLES[index % NORMAL_NODE_TITLES.length];
  }

  if (type === 'ELITE_MARKET') {
    return ELITE_NODE_TITLES[index % ELITE_NODE_TITLES.length];
  }

  if (type === 'EVENT') {
    return EVENT_NODE_TITLES[index % EVENT_NODE_TITLES.length];
  }

  if (type === 'BOSS') {
    return BOSS_NODE_TITLES[act];
  }

  return ROUTE_NODE_CONTENT[type].title;
}

function getAllowedNodeTypes(act: 1 | 2 | 3, layer: number): RouteNodeType[] {
  if (act === 1 && layer <= 3) {
    return ['NORMAL_MARKET', 'NORMAL_MARKET', 'REST'];
  }

  if (act === 1) {
    return ['NORMAL_MARKET', 'NORMAL_MARKET', 'REST', 'SHOP', 'EVENT'];
  }

  if (act === 2) {
    return [
      'NORMAL_MARKET',
      'ELITE_MARKET',
      'EVENT',
      'RISK_CONTROL',
      'SHOP',
      'REST'
    ];
  }

  return [
    'NORMAL_MARKET',
    'ELITE_MARKET',
    'ELITE_MARKET',
    'EVENT',
    'RISK_CONTROL',
    'SHOP',
    'REST'
  ];
}

function startRouteEncounter(state: EventGameState, node: RouteNode) {
  const pressureIndex = state.routeMap.completedNodeIds.length + node.layer + node.act * 10;

  state.marketPressure = createMarketPressureForRouteNode(
    state.seed,
    pressureIndex,
    node.type,
    node.act
  );
  state.marketPressureIndex = pressureIndex;
  state.encounterTurn = 0;
  state.currentTurn = 1;
  state.currentIntentId = state.marketPressure.intent.id;
  state.lastResolvedIntentId = null;
  state.intentResolvedThisTurn = false;
  state.canResolveIntent = false;
  state.encounterStatus = 'ACTIVE';
  state.phase = 'PLAYER_TURN';
  state.lastTurnSummary = null;
  state.rewardRarityBonus = node.type === 'ELITE_MARKET' ? 1 : node.type === 'BOSS' ? 2 : 0;
  state.combo.eventLog.push(`路线遭遇开始：${node.title}。目标：击穿市场压力。`);
}

function isFinalBossNode(node: RouteNode) {
  return node.act === 3 && node.type === 'BOSS';
}

function consumeBossInsurance(state: EventGameState) {
  const node = state.routeMap.currentNodeId
    ? getRouteNode(state.routeMap, state.routeMap.currentNodeId)
    : null;

  if (node?.type !== 'BOSS' || !state.hasBossInsurance || state.bossInsuranceUsed) {
    return false;
  }

  state.hasBossInsurance = false;
  state.bossInsuranceUsed = true;
  state.risk = Math.max(0, state.maxRisk - 25);
  state.combo = {
    ...state.combo,
    currentChainProfit: Math.round(state.combo.currentChainProfit * 0.5 * 100) / 100
  };

  if (state.cash > 0) {
    spendCash(state, Math.min(50, state.cash), 'Boss 保险理赔手续费');
  }

  state.phase = 'PLAYER_TURN';
  state.encounterStatus = 'ACTIVE';
  state.combo.eventLog.push('Boss 保险触发：避免爆仓，风险降至安全线以下。');
  state.runHistory.push('Boss 保险触发：避免 Boss 战爆仓。');
  return true;
}

function getAct(routeMap: RouteMapState, act: RouteMapState['currentAct']) {
  const routeAct = routeMap.acts.find((item) => item.act === act);

  if (!routeAct) {
    throw new Error(`Missing route act ${act}.`);
  }

  return routeAct;
}

function getLayerNodes(nodes: RouteNode[], layer: number) {
  return nodes.filter((node) => node.layer === layer);
}

function isAdjacentLane(node: RouteNode, nextNode: RouteNode, currentLayerSize: number) {
  if (nextNode.type === 'BOSS') {
    return true;
  }

  if (currentLayerSize === 1) {
    return true;
  }

  return Math.abs(node.lane - nextNode.lane) <= 1;
}
