import { useMemo, useState } from 'react';
import type { EventCard, FormalCardType } from '../game/effects';
import type { EventCardCost } from '../game/types';
import type { EventGameState } from '../game/playCard';
import {
  localizeCardRole,
  localizeCardType,
  localizeSector,
  localizeText
} from '../game/localization';
import { ViewOverlay } from './ViewOverlay';

type DeckTab = 'all' | 'draw' | 'discard' | 'removed';
type CostFilter = 'all' | EventCardCost;

export function DeckViewer(props: {
  open: boolean;
  state: EventGameState;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<DeckTab>('all');
  const [cost, setCost] = useState<CostFilter>('all');
  const [cardType, setCardType] = useState<'all' | FormalCardType>('all');
  const [archetype, setArchetype] = useState('all');

  const cardsByTab = getCardsByTab(props.state, tab);
  const archetypes = useMemo(
    () => Array.from(new Set(getCardsByTab(props.state, 'all').map(getArchetypeLabel))).sort(),
    [props.state]
  );
  const cards = cardsByTab.filter((card) => {
    if (cost !== 'all' && card.cost !== cost) return false;
    if (cardType !== 'all' && card.cardType !== cardType) return false;
    if (archetype !== 'all' && getArchetypeLabel(card) !== archetype) return false;
    return true;
  });

  return (
    <ViewOverlay
      open={props.open}
      title="牌组查看器"
      hint="快捷键 D。可查看完整牌组、抽牌堆、弃牌堆和已移除牌。"
      onClose={props.onClose}
    >
      <div className="viewer-tabs">
        {[
          ['all', '完整牌组'],
          ['draw', '抽牌堆'],
          ['discard', '弃牌堆'],
          ['removed', '已移除牌']
        ].map(([id, label]) => (
          <button
            key={id}
            className={tab === id ? 'selected' : ''}
            type="button"
            onClick={() => setTab(id as DeckTab)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="viewer-filters">
        <label>
          费用
          <select value={cost} onChange={(event) => setCost(parseCost(event.target.value))}>
            <option value="all">全部</option>
            <option value="0">0</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
          </select>
        </label>
        <label>
          类型
          <select
            value={cardType}
            onChange={(event) => setCardType(event.target.value as 'all' | FormalCardType)}
          >
            <option value="all">全部</option>
            {CARD_TYPES.map((type) => (
              <option key={type} value={type}>
                {localizeCardType(type)}
              </option>
            ))}
          </select>
        </label>
        <label>
          流派
          <select value={archetype} onChange={(event) => setArchetype(event.target.value)}>
            <option value="all">全部</option>
            {archetypes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="viewer-card-grid">
        {cards.map((card) => (
          <ViewerCard key={card.id} card={card} />
        ))}
        {cards.length === 0 ? <p className="viewer-empty">没有符合筛选的牌。</p> : null}
      </div>
    </ViewOverlay>
  );
}

function ViewerCard(props: { card: EventCard }) {
  return (
    <article className="viewer-card">
      <strong>{props.card.name}</strong>
      <span>
        费用 {props.card.cost} · {localizeCardRole(props.card.cardRole)} ·{' '}
        {props.card.cardType ? localizeCardType(props.card.cardType) : '事件'}
      </span>
      <small>
        {localizeSector(props.card.sector)} · 评级 {props.card.rank} · {getArchetypeLabel(props.card)}
      </small>
      <p>{getDescriptionLine(props.card)}</p>
    </article>
  );
}

function getCardsByTab(state: EventGameState, tab: DeckTab) {
  if (tab === 'draw') return state.drawPile;
  if (tab === 'discard') return state.discardPile;
  if (tab === 'removed') return state.removedCards;
  return [
    ...state.hand,
    ...state.drawPile,
    ...state.discardPile,
    ...state.playedCardsThisTurn
  ];
}

function getDescriptionLine(card: EventCard) {
  return localizeText(card.playEffect ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)[0] ?? '暂无说明。';
}

function getArchetypeLabel(card: EventCard) {
  return localizeText(card.archetype ?? (card.cardType ? localizeCardType(card.cardType) : '事件'));
}

function parseCost(value: string): CostFilter {
  if (value === 'all') return 'all';
  return Number(value) as EventCardCost;
}

const CARD_TYPES: FormalCardType[] = [
  'BUY',
  'CHASE',
  'DIP_BUY',
  'LEVERAGE',
  'CASH_OUT',
  'DRAW',
  'COPY',
  'SECTOR',
  'RISK',
  'FINISHER'
];
