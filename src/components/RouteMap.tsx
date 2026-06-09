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

  return (
    <section className="panel route-map-panel">
      <div className="section-heading">
        <div>
          <p className="section-label">路线图</p>
          <h2>目标：击败第三幕最终 Boss</h2>
        </div>
        <span className="status-pill">
          第 {props.routeMap.currentAct} 幕
          {currentNode ? ` · 第 ${currentNode.layer} 个节点` : ''}
        </span>
      </div>

      {currentNode ? (
        <CurrentRouteNode node={currentNode} onCompleteNode={props.onCompleteNode} />
      ) : null}

      <div className="route-act-list">
        {props.routeMap.acts.map((act) => (
          <article key={act.act} className="route-act">
            <h3>第 {act.act} 幕</h3>
            <div className="route-layer-list">
              {groupNodesByLayer(act.nodes).map((layer) => (
                <div key={`${act.act}-${layer[0]?.layer}`} className="route-layer">
                  <span className="route-layer-label">第 {layer[0]?.layer} 层</span>
                  <div className="route-node-row">
                    {layer.map((node) => (
                      <RouteNodeButton
                        key={node.id}
                        node={node}
                        isAvailable={props.routeMap.availableNodeIds.includes(node.id)}
                        isCurrent={props.routeMap.currentNodeId === node.id}
                        isCompleted={props.routeMap.completedNodeIds.includes(node.id)}
                        onSelectNode={props.onSelectNode}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
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
  onSelectNode: (nodeId: string) => void;
}) {
  const content = ROUTE_NODE_CONTENT[props.node.type];

  return (
    <button
      className={[
        'route-node',
        props.isAvailable ? 'route-node-available' : '',
        props.isCurrent ? 'route-node-current' : '',
        props.isCompleted ? 'route-node-completed' : ''
      ]
        .filter(Boolean)
        .join(' ')}
      type="button"
      disabled={!props.isAvailable}
      onClick={() => props.onSelectNode(props.node.id)}
    >
      <strong>{content.label}</strong>
      <span>{props.node.title}</span>
      <small>{props.node.rewardText}</small>
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
