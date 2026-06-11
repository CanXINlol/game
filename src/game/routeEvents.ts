import { getRouteEvent } from '../data/events';
import { STOCK_CARDS } from '../data/stockCards';
import { gainCash, spendCash } from './economy';
import { createRng } from './rng';
import type { Run } from './types';

export function applyEventChoice(run: Run, choiceId: string): Run {
  if (run.status !== 'EVENT' || !run.currentEvent) return run;

  const choice = run.currentEvent.choices.find((c) => c.id === choiceId);
  if (!choice) return run;

  if (choice.cost && run.cash < choice.cost) return run;

  let next = run;
  if (choice.cost) {
    next = spendCash(next, choice.cost, run.currentEvent.title);
  }
  if (choice.cashDelta) {
    if (choice.cashDelta > 0) next = gainCash(next, choice.cashDelta, run.currentEvent.title);
    else next = spendCash(next, -choice.cashDelta, run.currentEvent.title);
  }

  if (choice.riskDelta && next.currentEncounter) {
    next = {
      ...next,
      currentEncounter: {
        ...next.currentEncounter,
        risk: Math.max(0, Math.min(100, next.currentEncounter.risk + choice.riskDelta))
      }
    };
  }

  if (choice.cardId === 'random') {
    const rng = createRng(`${next.rngSeed}-event`);
    const card = rng.pick(STOCK_CARDS);
    next = { ...next, deck: [...next.deck, card.id], drawPile: [...next.drawPile, card.id] };
  }

  return {
    ...next,
    currentEvent: null,
    turnSummary: [`事件「${run.currentEvent.title}」：${choice.label}。`]
  };
}

export function loadEventForRun(run: Run, eventId: string): Run {
  const event = getRouteEvent(eventId);
  return { ...run, currentEvent: event, status: 'EVENT' };
}


