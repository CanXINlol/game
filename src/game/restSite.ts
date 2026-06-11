import type { Run } from './types';

export type RestChoice = 'UPGRADE' | 'REDUCE_RISK' | 'BONUS_AP';

export function applyRestChoice(run: Run, choice: RestChoice, cardId?: string): Run {
  if (run.status !== 'REST') return run;

  if (choice === 'UPGRADE' && cardId) {
    return {
      ...run,
      upgradedCardIds: [...run.upgradedCardIds, cardId],
      turnSummary: [`休整：升级了 ${cardId}。`]
    };
  }

  if (choice === 'REDUCE_RISK' && run.currentEncounter) {
    return {
      ...run,
      currentEncounter: {
        ...run.currentEncounter,
        risk: Math.max(0, run.currentEncounter.risk - 15)
      },
      turnSummary: ['休整：风险 -15。']
    };
  }

  if (choice === 'BONUS_AP') {
    return {
      ...run,
      maxAP: run.maxAP + 1,
      ap: run.ap + 1,
      currentEncounter: run.currentEncounter
        ? { ...run.currentEncounter, risk: run.currentEncounter.risk + 10, initialRisk: run.currentEncounter.initialRisk + 10 }
        : null,
      turnSummary: ['休整：下场行情 AP +1，但初始 风险 +10。']
    };
  }

  return run;
}




