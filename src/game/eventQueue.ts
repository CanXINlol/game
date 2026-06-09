import type { GameEvent } from './events';
import { resolveGameEvent } from './effects';
import type { EventGameState } from './playCard';

export interface EventQueueResult {
  processed: number;
  stopped: boolean;
}

export class EventQueue {
  private readonly events: GameEvent[] = [];

  constructor(private readonly maxEvents = 100) {}

  enqueue(event: GameEvent) {
    this.events.push(event);
  }

  size() {
    return this.events.length;
  }

  resolveAll(context: EventGameState): EventQueueResult {
    let processed = 0;

    while (this.events.length > 0 && processed < this.maxEvents) {
      const event = this.events.shift();

      if (!event) {
        break;
      }

      const nextEvents = resolveGameEvent(context, event);
      processed += 1;

      for (const nextEvent of nextEvents) {
        this.enqueue({
          ...nextEvent,
          depth: event.depth + 1
        });
      }
    }

    const stopped = this.events.length > 0;

    if (stopped) {
      this.events.length = 0;
      context.combo.eventLog.push(
        `事件队列达到 ${this.maxEvents} 个事件上限，已停止继续解析。`
      );
    }

    return { processed, stopped };
  }
}
