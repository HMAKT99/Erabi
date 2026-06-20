import { EventEmitter } from "node:events";

/** Network events consumed by the explorer's live ticker via SSE. */
export type NetworkEventType =
  | "agent.registered"
  | "bid.placed"
  | "intent.received"
  | "auction.cleared"
  | "settlement.confirmed";

export interface NetworkEvent {
  type: NetworkEventType;
  ts: string;
  data: Record<string, unknown>;
}

export type NetworkEventListener = (event: NetworkEvent) => void;

/** How many recent events the bus retains to replay to new subscribers. */
const HISTORY_LIMIT = 30;

export class EventBus {
  private readonly emitter = new EventEmitter();
  /** Ring buffer of the most recent events, oldest first. Lets a freshly
   * connected explorer show recent activity instead of an empty feed between
   * fleet ticks. In-memory; resets on process restart. */
  private readonly history: NetworkEvent[] = [];

  constructor() {
    this.emitter.setMaxListeners(1000);
  }

  emit(type: NetworkEventType, data: Record<string, unknown>): NetworkEvent {
    const event: NetworkEvent = { type, ts: new Date().toISOString(), data };
    this.history.push(event);
    if (this.history.length > HISTORY_LIMIT) this.history.shift();
    this.emitter.emit("event", event);
    return event;
  }

  /** The retained recent events, oldest first. */
  recent(): NetworkEvent[] {
    return [...this.history];
  }

  subscribe(listener: NetworkEventListener): () => void {
    this.emitter.on("event", listener);
    return () => this.emitter.off("event", listener);
  }
}
