import { useMemo, useState } from 'react';
import { CardPreview } from './CardPreview';
import type { EventCard } from '../game/effects';
import {
  localizeCardRole,
  localizeCardType,
  localizeSector,
  localizeText
} from '../game/localization';
import type { EventGameState } from '../game/playCard';
import { createCardPreview } from '../game/preview';

export function HandArea(props: {
  hand: EventCard[];
  state: EventGameState;
  canPlay: boolean;
  onPlayCard: (cardId: string) => void;
}) {
  const [selectedCardId, setSelectedCardId] = useState(props.hand[0]?.id ?? null);
  const selectedCard =
    props.hand.find((card) => card.id === selectedCardId) ?? props.hand[0] ?? null;
  const preview = useMemo(
    () => (selectedCard ? createCardPreview(selectedCard, props.state) : null),
    [selectedCard, props.state]
  );

  return (
    <section className="panel hand-area">
      <div className="section-heading">
        <div>
          <p className="section-label">手牌</p>
          <h2>当前手牌</h2>
        </div>
        <span className="status-pill">{props.hand.length} 张</span>
      </div>
      <div className="hand-with-preview">
        <div className="event-card-grid">
          {props.hand.map((card) => (
            <article
              key={card.id}
              data-card-id={card.id}
              className={`event-card ${selectedCard?.id === card.id ? 'selected' : ''}`}
              onMouseEnter={() => setSelectedCardId(card.id)}
              onClick={() => setSelectedCardId(card.id)}
            >
              <strong>{card.name}</strong>
              <span>
                cost {card.cost} · 角色 {localizeCardRole(card.cardRole)} · 流派{' '}
                {card.archetype ?? (card.cardType ? localizeCardType(card.cardType) : '事件')}
              </span>
              <small>
                {localizeSector(card.sector)} · 评级 {card.rank}
              </small>
              <p>{getCardLine(card, 0)}</p>
              <p className="card-hint">{getCardLine(card, 1)}</p>
              <em>{getCardLine(card, 2) || getFallbackRisk(card)}</em>
              <button
                className="ghost-button"
                type="button"
                disabled={!props.canPlay || card.cost > props.state.actionPoints}
                onClick={(event) => {
                  event.stopPropagation();
                  props.onPlayCard(card.id);
                }}
              >
                打出
              </button>
            </article>
          ))}
        </div>
        <CardPreview preview={preview} />
      </div>
    </section>
  );
}

function getCardLine(card: EventCard, index: number) {
  return localizeText(card.playEffect ?? describeCard(card.id))
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)[index] ?? '';
}

function getFallbackRisk(card: EventCard) {
  return (card.baseRisk ?? 0) > 0 ? `风险 +${card.baseRisk}。` : '无额外风险。';
}

function describeCard(cardId: string) {
  const descriptions: Record<string, string> = {
    'test-card-tech-buy': '获得 20 收益，并触发科技板块。',
    'test-card-limit-chase': '已有收益时触发涨停，获得收益并增加连击。',
    'test-card-margin-add': '获得 40 收益，但增加 20 风险。',
    'test-card-quant-copy': '复制上一张牌的基础效果。',
    'test-card-hot-rotation': '触发当前 hotSector，并抽 1 张牌。',
    'test-card-cash-insurance': '锁定部分浮盈，风险 -10，触发止盈。',
    'test-card-hot-stock-ignite': '触发涨停，连击 +2，风险 +15。',
    'test-card-dip-rebound': '发生过风险或亏损事件后，获得收益并风险 -5。',
    'test-card-short-cover': '市场压力低于 50% 时，造成额外压力伤害。',
    'test-card-closeout': '根据连击数获得爆发收益，并结束交易。'
  };

  return descriptions[cardId] ?? '测试牌。';
}
