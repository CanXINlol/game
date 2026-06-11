import { ROUTE_NODE_CONTENT } from '../data/routeNodes';
import { localizeText } from '../game/localization';
import type { RouteMapState, RouteNode } from '../game/routeMap';

export function RouteMap(props: {
  routeMap: RouteMapState;
  onSelectNode: (nodeId: string) => void;
  onCompleteNode: () => void;
}) {
  const currentNode = props.routeMap.currentNodeId
    ? props.routeMap.acts
        .flatMap((act) => act.nodes)
        .find((node) => node.id === props.routeMap.currentNodeId)
    : null;
  const currentAct =
    props.routeMap.acts.find((act) => act.act === props.routeMap.currentAct) ??
    props.routeMap.acts[0];

  return (
    <section className="panel route-map-panel">
      <div className="section-heading">
        <div>
          <p className="section-label">路线图</p>
          <h2>目标：击败第三幕最终首领</h2>
        </div>
        <span className="status-pill">
          第 {props.routeMap.currentAct} 幕
          {currentNode ? ` · 第 ${currentNode.layer} 个节点` : ''}
        </span>
      </div>

      {currentNode ? (
        <CurrentRouteNode node={currentNode} onCompleteNode={props.onCompleteNode} />
      ) : null}

      <div className="route-act-list route-act-list-current">
        <RouteActGraph
          routeMap={props.routeMap}
          act={currentAct.act}
          layers={groupNodesByLayer(currentAct.nodes)}
          onSelectNode={props.onSelectNode}
        />
      </div>
    </section>
  );
}

function RouteActGraph(props: {
  routeMap: RouteMapState;
  act: RouteNode['act'];
  layers: RouteNode[][];
  onSelectNode: (nodeId: string) => void;
}) {
  const nodes = props.layers.flat();

  return (
    <article
      className={`route-act ${
        props.routeMap.currentAct === props.act ? 'route-act-active' : ''
      }`}
    >
      <h3>第 {props.act} 幕</h3>
      <div className="route-map-canvas">
        <svg
          className="route-map-edges"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {nodes.flatMap((node) =>
            node.nextNodeIds
              .map((targetId) => nodes.find((target) => target.id === targetId))
              .filter((target): target is RouteNode => Boolean(target))
              .map((target) => (
                <line
                  key={`${node.id}-${target.id}`}
                  className={
                    isEdgeActive(props.routeMap, node, target)
                      ? 'route-connector-active'
                      : 'route-connector'
                  }
                  x1={node.x}
                  y1={100 - node.y}
                  x2={target.x}
                  y2={100 - target.y}
                />
              ))
          )}
        </svg>
        {nodes.map((node) => (
          <RouteNodeButton
            key={node.id}
            node={node}
            isAvailable={props.routeMap.availableNodeIds.includes(node.id)}
            isCurrent={props.routeMap.currentNodeId === node.id}
            isCompleted={props.routeMap.completedNodeIds.includes(node.id)}
            isLocked={isNodeLocked(props.routeMap, node)}
            onSelectNode={props.onSelectNode}
          />
        ))}
      </div>
    </article>
  );
}

function CurrentRouteNode(props: {
  node: RouteNode;
  onCompleteNode: () => void;
}) {
  const content = ROUTE_NODE_CONTENT[props.node.type];
  const canCompleteWithoutCombat =
    props.node.type === 'SHOP' ||
    props.node.type === 'REST' ||
    props.node.type === 'RISK_CONTROL' ||
    props.node.type === 'EVENT';

  return (
    <div className="current-route-node">
      <strong>当前节点：{props.node.title}</strong>
      <p>{localizeText(props.node.description)}</p>
      <span>{content.label}</span>
      {canCompleteWithoutCombat ? (
        <button className="primary-action" type="button" onClick={props.onCompleteNode}>
          完成节点，继续路线
        </button>
      ) : null}
    </div>
  );
}

function RouteNodeButton(props: {
  node: RouteNode;
  isAvailable: boolean;
  isCurrent: boolean;
  isCompleted: boolean;
  isLocked: boolean;
  onSelectNode: (nodeId: string) => void;
}) {
  const content = ROUTE_NODE_CONTENT[props.node.type];

  return (
    <button
      className={[
        'route-node',
        `route-node-type-${props.node.type.toLowerCase().replace(/_/g, '-')}`,
        props.isAvailable ? 'route-node-available' : '',
        props.isCurrent ? 'route-node-current' : '',
        props.isCompleted ? 'route-node-completed' : '',
        props.isLocked ? 'route-node-locked' : ''
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        left: `${props.node.x}%`,
        bottom: `${props.node.y}%`
      }}
      type="button"
      disabled={!props.isAvailable}
      onClick={() => props.onSelectNode(props.node.id)}
    >
      <span className="route-node-icon">{getNodeIcon(props.node.type)}</span>
      <span className="route-node-title">{props.node.title}</span>
      {props.isCompleted ? <span className="route-node-check">✓</span> : null}
      <span className="route-node-tooltip">
        <strong>{props.node.title}</strong>
        <em>{content.label}</em>
        <small>风险：{props.node.riskText}</small>
        <small>奖励：{props.node.rewardText}</small>
        <span>{localizeText(props.node.description)}</span>
      </span>
    </button>
  );
}

function groupNodesByLayer(nodes: RouteNode[]) {
  const layers = new Map<number, RouteNode[]>();

  for (const node of nodes) {
    layers.set(node.layer, [...(layers.get(node.layer) ?? []), node]);
  }

  return [...layers.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, layerNodes]) => layerNodes);
}

function isNodeLocked(routeMap: RouteMapState, node: RouteNode) {
  if (routeMap.completedNodeIds.includes(node.id)) return false;
  if (routeMap.currentNodeId === node.id) return false;
  if (routeMap.availableNodeIds.includes(node.id)) return false;

  const hasStartedAct =
    routeMap.currentAct > node.act ||
    routeMap.completedNodeIds.some((nodeId) => nodeId.startsWith(`act-${node.act}-`)) ||
    routeMap.currentNodeId?.startsWith(`act-${node.act}-`);

  return hasStartedAct || routeMap.currentAct === node.act;
}

function isEdgeActive(routeMap: RouteMapState, source: RouteNode, target: RouteNode) {
  const sourceOnPath =
    routeMap.completedNodeIds.includes(source.id) || routeMap.currentNodeId === source.id;
  const targetOnPath =
    routeMap.completedNodeIds.includes(target.id) ||
    routeMap.currentNodeId === target.id ||
    routeMap.availableNodeIds.includes(target.id);

  return sourceOnPath && targetOnPath;
}

function getNodeIcon(type: RouteNode['type']) {
  if (type === 'ELITE_MARKET') return '!';
  if (type === 'EVENT') return '?';
  if (type === 'SHOP') return '$';
  if (type === 'REST') return 'R';
  if (type === 'RISK_CONTROL') return 'S';
  if (type === 'BOSS') return 'B';
  return '•';
}
