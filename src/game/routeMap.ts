import { buildRouteMap } from '../data/routeNodes';
import { createEncounterForNode, startEncounter } from './encounters';
import { loadEventForRun } from './routeEvents';
import { createShop } from './shop';
import { modifyEncounterForTools } from './tools';
import type { RouteMapState, RouteNode, Run } from './types';

export function createRouteMap(seed: string): RouteMapState {
  const nodes = buildRouteMap(seed);
  const starts = nodes.filter((node) => node.act === 1 && node.layer === 0);

  return {
    act: 1,
    nodes,
    currentNodeId: null,
    availableNodeIds: starts.map((node) => node.id),
    completedNodeIds: []
  };
}

export function getRouteNode(map: RouteMapState, nodeId: string): RouteNode | undefined {
  return map.nodes.find((n) => n.id === nodeId);
}

export function getAvailableNodes(map: RouteMapState): RouteNode[] {
  return map.availableNodeIds
    .map((id) => getRouteNode(map, id))
    .filter((n): n is RouteNode => n !== undefined);
}

export function enterNode(run: Run, node: RouteNode): Run {
  if (node.type === 'SHOP') {
    return {
      ...run,
      status: 'SHOP',
      shop: createShop(`${run.rngSeed}-${node.id}`),
      turnSummary: [`进入商店：${node.name}。`]
    };
  }

  if (node.type === 'REST') {
    return { ...run, status: 'REST', turnSummary: [`进入休整点：${node.name}。`] };
  }

  if (node.type === 'RISK_CONTROL') {
    return { ...run, status: 'RISK_CONTROL', turnSummary: [`进入风控室：${node.name}。`] };
  }

  if (node.type === 'EVENT' && node.eventId) {
    return loadEventForRun({ ...run, turnSummary: [`进入事件：${node.name}。`] }, node.eventId);
  }

  const baseEncounter = createEncounterForNode(node, 1);
  const encounter = modifyEncounterForTools(run, baseEncounter, baseEncounter.type);
  const started = startEncounter(run, encounter);

  return {
    ...started,
    turnSummary: [`进入行情：${node.name}。抽 5 张牌，组成交易链。`]
  };
}

export function selectRouteNode(run: Run, nodeId: string): Run {
  if (run.status !== 'ROUTE_SELECT' && run.status !== 'START') {
    return run;
  }

  if (!run.routeMap.availableNodeIds.includes(nodeId)) {
    return run;
  }

  const node = getRouteNode(run.routeMap, nodeId);
  if (!node) return run;

  const nextMap: RouteMapState = {
    ...run.routeMap,
    act: node.act,
    currentNodeId: nodeId,
    availableNodeIds: []
  };

  return enterNode({ ...run, routeMap: nextMap, act: node.act, nodeIndex: node.layer }, node);
}

export function completeRouteNode(run: Run): Run {
  const nodeId = run.routeMap.currentNodeId;
  if (!nodeId) {
    if (run.status === 'REWARD' || run.status === 'SHOP' || run.status === 'REST' || run.status === 'RISK_CONTROL' || run.status === 'EVENT') {
      const lastCompleted = run.routeMap.completedNodeIds[run.routeMap.completedNodeIds.length - 1];
      const node = lastCompleted ? getRouteNode(run.routeMap, lastCompleted) : null;
      if (!node) return { ...run, status: 'ROUTE_SELECT', currentEncounter: null };
      const nextAvailable = node.nextNodeIds;
      return {
        ...run,
        status: 'ROUTE_SELECT',
        currentEncounter: null,
        routeMap: {
          ...run.routeMap,
          availableNodeIds: nextAvailable,
          currentNodeId: null
        }
      };
    }
    return run;
  }

  const node = getRouteNode(run.routeMap, nodeId);
  if (!node) return run;

  const completedNodeIds = [...run.routeMap.completedNodeIds, nodeId];
  const nextAvailable = node.nextNodeIds.filter((id) => !completedNodeIds.includes(id));
  const nextNode = nextAvailable[0] ? getRouteNode(run.routeMap, nextAvailable[0]) : null;
  const isRunWon = node.type === 'BOSS' && node.act === 3;

  if (isRunWon) {
    return {
      ...run,
      status: 'RUN_WON',
      routeMap: { ...run.routeMap, completedNodeIds, availableNodeIds: [], currentNodeId: null },
      turnSummary: ['通关！最后一根阳线被你拿下。']
    };
  }

  return {
    ...run,
    status: 'ROUTE_SELECT',
    currentEncounter: null,
    routeMap: {
      ...run.routeMap,
      act: nextNode?.act ?? run.routeMap.act,
      completedNodeIds,
      availableNodeIds: nextAvailable,
      currentNodeId: null
    },
    turnSummary: [`完成节点：${node.name}。选择下一路线。`]
  };
}

export { createEncounterForNode };


