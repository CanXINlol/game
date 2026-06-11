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
  index: number;
  lane: number;
  type: RouteNodeType;
  title: string;
  description: string;
  rewardText: string;
  riskText: string;
  x: number;
  y: number;
  nextNodeIds: string[];
  previousNodeIds: string[];
  status: RouteNodeStatus;
}

export type RouteNodeStatus = 'locked' | 'available' | 'current' | 'completed';

export interface RouteAct {
  act: 1 | 2 | 3;
  nodes: RouteNode[];
}

export interface RouteMapState {
  seed: string;
  acts: RouteAct[];
  currentAct: 1 | 2 | 3;
  currentNodeId: string | null;
  bossNodeId: string;
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
  const acts = ACTS.map((act) => generateRouteMap(seed, act));
  const firstLayerNodes = getLayerNodes(acts[0].nodes, 1);
  const bossNodeId = getBossNode(acts[0]).id;

  return syncRouteStatuses({
    seed,
    acts,
    currentAct: 1,
    currentNodeId: null,
    bossNodeId,
    completedNodeIds: [],
    availableNodeIds: firstLayerNodes.map((node) => node.id)
  });
}

export function generateRouteMap(seed: string, act: 1 | 2 | 3): RouteAct {
  return createRouteAct(act, createRng(`${seed}-route-map-act-${act}`));
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
  syncRouteStatuses(routeMap);
  state.day = node.act;
  state.nodeActionUsed = false;
  state.shopRefreshUsed = false;

  if (isEncounterNode(node)) {
    if (node.type === 'ELITE_MARKET') {
      const deposit = spendCash(state, 20, '精英路线保证金');

      if (!deposit.success) {
        routeMap.currentNodeId = null;
        routeMap.availableNodeIds = previousAvailableNodeIds;
        syncRouteStatuses(routeMap);
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
    syncRouteStatuses(routeMap);
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
    routeMap.bossNodeId = getBossNode(getAct(routeMap, nextAct)).id;
    routeMap.availableNodeIds = getLayerNodes(getAct(routeMap, nextAct).nodes, 1).map(
      (nextNode) => nextNode.id
    );
  } else {
    routeMap.availableNodeIds = node.nextNodeIds;
  }
  syncRouteStatuses(routeMap);

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
    const lostFloatingProfit = loseFloatingProfitToBankruptcy(state);
    state.runHistory.push(
      `失败：风险达到 ${state.risk}/${state.maxRisk}。爆仓优先损失浮盈 ${lostFloatingProfit}。最后一次选择：${state.lastDayChoice ?? '无'}。`
    );
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

function loseFloatingProfitToBankruptcy(state: EventGameState) {
  const lostFloatingProfit = Math.round(state.combo.currentChainProfit * 100) / 100;

  if (lostFloatingProfit > 0) {
    state.combo = {
      ...state.combo,
      currentChainProfit: 0
    };
    state.combo.eventLog.push(
      `爆仓损失全部未锁定浮盈：-${lostFloatingProfit}。`
    );
  }

  return lostFloatingProfit;
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
  state.combo.eventLog.push('爆仓缓冲触发：阻止本次爆仓，浮盈保留，risk 降到安全线。');
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

export function getAvailableNextNodes(routeMap: RouteMapState) {
  return routeMap.availableNodeIds
    .map((nodeId) => getRouteNode(routeMap, nodeId))
    .filter((node): node is RouteNode => Boolean(node));
}

export function chooseRouteNode(
  routeMap: RouteMapState,
  nodeId: string
): RouteSelectionResult {
  const node = getRouteNode(routeMap, nodeId);

  if (!node || !routeMap.availableNodeIds.includes(nodeId)) {
    return { success: false, message: '该节点当前不可到达。' };
  }

  routeMap.currentNodeId = nodeId;
  routeMap.currentAct = node.act;
  routeMap.availableNodeIds = [];
  syncRouteStatuses(routeMap);
  return { success: true, message: `进入路线节点：${node.title}。` };
}

export function completeCurrentNode(routeMap: RouteMapState): RouteSelectionResult {
  const node = routeMap.currentNodeId
    ? getRouteNode(routeMap, routeMap.currentNodeId)
    : null;

  if (!node) {
    return { success: false, message: '没有正在进行的路线节点。' };
  }

  if (!routeMap.completedNodeIds.includes(node.id)) {
    routeMap.completedNodeIds.push(node.id);
  }

  routeMap.currentNodeId = null;

  if (node.type === 'BOSS') {
    if (node.act === 3) {
      routeMap.availableNodeIds = [];
      syncRouteStatuses(routeMap);
      return { success: true, message: '最终 Boss 已完成。' };
    }

    return advanceToNextAct(routeMap);
  }

  routeMap.availableNodeIds = [...node.nextNodeIds];
  syncRouteStatuses(routeMap);
  return { success: true, message: '路线节点完成。' };
}

export function advanceToNextAct(routeMap: RouteMapState): RouteSelectionResult {
  const nextAct = (routeMap.currentAct + 1) as RouteMapState['currentAct'];
  const act = routeMap.acts.find((item) => item.act === nextAct);

  if (!act) {
    routeMap.availableNodeIds = [];
    syncRouteStatuses(routeMap);
    return { success: false, message: '没有下一幕。' };
  }

  routeMap.currentAct = nextAct;
  routeMap.currentNodeId = null;
  routeMap.bossNodeId = getBossNode(act).id;
  routeMap.availableNodeIds = getLayerNodes(act.nodes, 1).map((node) => node.id);
  syncRouteStatuses(routeMap);
  return { success: true, message: `进入第 ${nextAct} 幕路线图。` };
}

export function validateRouteMap(routeMap: RouteMapState | RouteAct) {
  const acts = 'acts' in routeMap ? routeMap.acts : [routeMap];
  const errors: string[] = [];

  for (const act of acts) {
    const layers = groupActLayers(act);
    const boss = getBossNode(act);
    const reachableFromStart = getReachableNodeIdsFromStarts(act);
    const canReachBoss = getNodeIdsThatCanReachBoss(act, boss.id);

    if (boss.type !== 'BOSS') {
      errors.push(`Act ${act.act} missing Boss.`);
    }

    for (const node of act.nodes) {
      if (!reachableFromStart.has(node.id)) {
        errors.push(`Node ${node.id} cannot be reached from a start.`);
      }

      if (!canReachBoss.has(node.id)) {
        errors.push(`Node ${node.id} cannot reach Boss.`);
      }

      if (node.layer > 1 && node.previousNodeIds.length === 0) {
        errors.push(`Node ${node.id} has no previous edge.`);
      }

      if (node.type !== 'BOSS' && node.nextNodeIds.length === 0) {
        errors.push(`Node ${node.id} has no next edge.`);
      }
    }

    for (const [layer, nodes] of layers) {
      if (layer === 1 && (nodes.length < 2 || nodes.length > 3)) {
        errors.push(`Act ${act.act} first layer must have 2-3 starts.`);
      } else if (layer !== layers.length && (nodes.length < 2 || nodes.length > 5)) {
        errors.push(`Act ${act.act} layer ${layer} must have 2-5 nodes.`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

function syncRouteStatuses<TState extends RouteMapState>(routeMap: TState): TState {
  for (const node of routeMap.acts.flatMap((act) => act.nodes)) {
    if (routeMap.completedNodeIds.includes(node.id)) {
      node.status = 'completed';
    } else if (routeMap.currentNodeId === node.id) {
      node.status = 'current';
    } else if (routeMap.availableNodeIds.includes(node.id)) {
      node.status = 'available';
    } else {
      node.status = 'locked';
    }
  }

  return routeMap;
}

function createRouteAct(act: 1 | 2 | 3, rng: ReturnType<typeof createRng>): RouteAct {
  const layerCount = ACT_LAYER_COUNTS[act];
  const layers = Array.from({ length: layerCount }, (_, index) => {
    const layer = index + 1;
    const isBossLayer = layer === layerCount;
    const laneCount = getLaneCountForLayer(layer, layerCount, rng);

    return Array.from({ length: laneCount }, (_lane, lane) =>
      createRouteNode(
        act,
        layer,
        lane,
        isBossLayer ? 'BOSS' : rng.pick(getAllowedNodeTypes(act, layer)),
        laneCount
      )
    );
  });
  ensureSecondLayerHasEvent(act, layers);
  ensurePreBossSafety(act, layers);
  connectRouteLayers(layers);

  return {
    act,
    nodes: layers.flat()
  };
}

function getLaneCountForLayer(
  layer: number,
  layerCount: number,
  rng: ReturnType<typeof createRng>
) {
  if (layer === layerCount) return 1;
  if (layer === 1) return rng.nextInt(2, 3);
  if (layer === layerCount - 1) return rng.nextInt(2, 3);
  return rng.nextInt(2, 5);
}

function ensureSecondLayerHasEvent(act: 1 | 2 | 3, layers: RouteNode[][]) {
  const secondLayer = layers[1];

  if (!secondLayer || secondLayer.some((node) => node.type === 'EVENT')) {
    return;
  }

  const lane = secondLayer.length - 1;
  secondLayer[lane] = createRouteNode(act, 2, lane, 'EVENT', secondLayer.length);
}

function ensurePreBossSafety(act: 1 | 2 | 3, layers: RouteNode[][]) {
  const preBossLayer = layers[layers.length - 2];

  if (!preBossLayer) return;

  const safeTypes: RouteNodeType[] =
    act === 1 ? ['REST', 'RISK_CONTROL'] : act === 2 ? ['REST', 'SHOP', 'RISK_CONTROL'] : ['REST', 'SHOP'];

  if (preBossLayer.some((node) => safeTypes.includes(node.type))) {
    return;
  }

  preBossLayer[0] = createRouteNode(
    act,
    preBossLayer[0].layer,
    preBossLayer[0].lane,
    safeTypes[0],
    preBossLayer.length
  );
}

function connectRouteLayers(layers: RouteNode[][]) {
  for (let layerIndex = 0; layerIndex < layers.length - 1; layerIndex += 1) {
    const currentLayer = layers[layerIndex];
    const nextLayer = layers[layerIndex + 1];

    for (const node of currentLayer) {
      addRouteEdge(node, nextLayer[getProjectedLaneIndex(node, currentLayer, nextLayer)]);
    }

    for (const target of nextLayer) {
      if (target.previousNodeIds.length > 0) {
        continue;
      }

      const source = currentLayer[getProjectedLaneIndex(target, nextLayer, currentLayer)];
      addRouteEdge(source, target);
    }
  }
}

function getProjectedLaneIndex(
  source: RouteNode,
  sourceLayer: RouteNode[],
  targetLayer: RouteNode[]
) {
  if (targetLayer.length === 1) return 0;

  const sourceRatio =
    sourceLayer.length === 1 ? 0.5 : source.index / Math.max(1, sourceLayer.length - 1);
  return Math.round(sourceRatio * (targetLayer.length - 1));
}

function addRouteEdge(source: RouteNode, target: RouteNode) {
  if (!source.nextNodeIds.includes(target.id)) {
    source.nextNodeIds.push(target.id);
  }

  if (!target.previousNodeIds.includes(source.id)) {
    target.previousNodeIds.push(source.id);
  }
}

function createRouteNode(
  act: 1 | 2 | 3,
  layer: number,
  lane: number,
  type: RouteNodeType,
  layerSize: number
): RouteNode {
  const content = ROUTE_NODE_CONTENT[type];
  const title = getRouteNodeTitle(type, act, layer, lane);

  return {
    id: `act-${act}-layer-${layer}-lane-${lane}-${type}`,
    act,
    layer,
    index: lane,
    lane,
    type,
    title,
    description: content.description,
    rewardText: content.rewardText,
    riskText: content.riskText,
    x: getNodePositionX(lane, layerSize),
    y: getNodePositionY(act, layer),
    nextNodeIds: [],
    previousNodeIds: [],
    status: 'locked'
  };
}

function getNodePositionX(index: number, layerSize: number) {
  if (layerSize <= 1) return 50;
  return Math.round((12 + index * (76 / (layerSize - 1))) * 100) / 100;
}

function getNodePositionY(act: 1 | 2 | 3, layer: number) {
  const layerCount = ACT_LAYER_COUNTS[act];
  return Math.round(((layer - 1) / Math.max(1, layerCount - 1)) * 10000) / 100;
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
  const bossLayer = ACT_LAYER_COUNTS[act];

  if (layer === 1) {
    return ['NORMAL_MARKET', 'NORMAL_MARKET', 'NORMAL_MARKET'];
  }

  if (layer === bossLayer - 1) {
    return ['REST'];
  }

  if (layer === 2) {
    return ['NORMAL_MARKET', 'NORMAL_MARKET', 'EVENT'];
  }

  if (act === 1 && layer <= 3) {
    return ['NORMAL_MARKET', 'NORMAL_MARKET', 'EVENT', 'REST'];
  }

  if (act === 1) {
    return ['NORMAL_MARKET', 'NORMAL_MARKET', 'EVENT', 'SHOP', 'ELITE_MARKET'];
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
  state.ap = state.maxAp;
  state.actionPoints = state.ap;
  state.maxActionPoints = state.maxAp;
  state.bonusApGainsThisTurn = 0;
  state.bonusDrawsThisTurn = 0;
  state.copiesThisTurn = 0;
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

function getBossNode(act: RouteAct) {
  const boss = act.nodes.find((node) => node.type === 'BOSS');

  if (!boss) {
    throw new Error(`Missing Boss node for act ${act.act}.`);
  }

  return boss;
}

function groupActLayers(act: RouteAct) {
  const layers = new Map<number, RouteNode[]>();

  for (const node of act.nodes) {
    layers.set(node.layer, [...(layers.get(node.layer) ?? []), node]);
  }

  return [...layers.entries()].sort(([left], [right]) => left - right);
}

function getReachableNodeIdsFromStarts(act: RouteAct) {
  const starts = getLayerNodes(act.nodes, 1);
  const reachable = new Set<string>();
  const queue = starts.map((node) => node.id);

  while (queue.length > 0) {
    const nodeId = queue.shift();
    if (!nodeId || reachable.has(nodeId)) continue;

    reachable.add(nodeId);
    const node = act.nodes.find((item) => item.id === nodeId);
    if (node) queue.push(...node.nextNodeIds);
  }

  return reachable;
}

function getNodeIdsThatCanReachBoss(act: RouteAct, bossNodeId: string) {
  const reachable = new Set<string>();
  const queue = [bossNodeId];

  while (queue.length > 0) {
    const nodeId = queue.shift();
    if (!nodeId || reachable.has(nodeId)) continue;

    reachable.add(nodeId);
    const node = act.nodes.find((item) => item.id === nodeId);
    if (node) queue.push(...node.previousNodeIds);
  }

  return reachable;
}

function getLayerNodes(nodes: RouteNode[], layer: number) {
  return nodes.filter((node) => node.layer === layer);
}
