import { useMemo, useState } from 'react';
import { getAllDeckCards, isCardUpgraded } from '../game/economy';
import { localizeText } from '../game/localization';
import type { EventGameState } from '../game/playCard';
import { REST_CHOICES, type RestChoiceId } from '../game/restSite';

export function RestPanel(props: {
  state: EventGameState;
  onChoose: (choice: RestChoiceId, cardId?: string) => void;
}) {
  const cards = useMemo(() => getAllDeckCards(props.state), [props.state]);
  const [selectedChoice, setSelectedChoice] = useState<RestChoiceId>('UPGRADE_CARD');
  const [selectedCardId, setSelectedCardId] = useState(cards[0]?.id ?? '');
  const choice = REST_CHOICES.find((item) => item.id === selectedChoice) ?? REST_CHOICES[0];
  const selectedCard = cards.find((card) => card.id === selectedCardId);
  const needsCard = choice.needsCard;
  const cardUpgraded = selectedCard ? isCardUpgraded(selectedCard) : false;
  const disabled =
    props.state.nodeActionUsed ||
    props.state.cash < choice.cashCost ||
    (needsCard && !selectedCard) ||
    (selectedChoice === 'UPGRADE_CARD' && cardUpgraded);
  const reason =
    props.state.nodeActionUsed
      ? '本休整点已经选择过一次'
      : props.state.cash < choice.cashCost
        ? `现金不足：需要 ${choice.cashCost}`
        : needsCard && !selectedCard
          ? '请先选择一张牌'
          : selectedChoice === 'UPGRADE_CARD' && cardUpgraded
            ? '已升级过'
            : '选择后离开休整点';

  return (
    <section className="panel rest-panel">
      <div className="section-heading">
        <div>
          <p className="section-label">休整点</p>
          <h2>选择 1 项，然后继续路线</h2>
        </div>
        <span className="status-pill">现金 {props.state.cash.toFixed(1)}</span>
      </div>
      <div className="risk-control-layout">
        <div className="risk-control-column">
          <h3>休整选择</h3>
          {REST_CHOICES.map((item) => (
            <button
              key={item.id}
              className={`risk-control-option ${selectedChoice === item.id ? 'selected' : ''}`}
              type="button"
              onClick={() => setSelectedChoice(item.id)}
            >
              <strong>{localizeText(item.title)}</strong>
              <span>{localizeText(item.costText)}</span>
              <p>{localizeText(item.description)}</p>
              <em>{localizeText(item.rewardText)}</em>
            </button>
          ))}
        </div>
        <div className="risk-control-column">
          <h3>选择卡牌</h3>
          {needsCard ? (
            <div className="risk-card-list">
              {cards.map((card) => {
                const upgraded = isCardUpgraded(card);
                const disabledCard = selectedChoice === 'UPGRADE_CARD' && upgraded;

                return (
                  <button
                    key={card.id}
                    className={`risk-card-option ${selectedCard?.id === card.id ? 'selected' : ''}`}
                    type="button"
                    disabled={disabledCard}
                    onClick={() => setSelectedCardId(card.id)}
                  >
                    <strong>{card.name}</strong>
                    <span>费用 {card.cost} · 评级 {card.rank}</span>
                    <em>{upgraded ? '已升级' : '可选择'}</em>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="muted">降低风险不需要选择卡牌。</p>
          )}
        </div>
        <div className="risk-control-column">
          <h3>确认</h3>
          <div className="risk-control-detail">
            <strong>{localizeText(choice.title)}</strong>
            <p>{localizeText(choice.description)}</p>
            <p>收益：{localizeText(choice.rewardText)}</p>
            <p>代价：{localizeText(choice.costText)}</p>
            <em>{reason}</em>
            <button
              className="primary-action"
              type="button"
              disabled={disabled}
              onClick={() =>
                props.onChoose(choice.id, needsCard ? selectedCard?.id : undefined)
              }
            >
              确认选择
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
