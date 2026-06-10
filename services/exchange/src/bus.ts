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

export class EventBus {
  private readonly emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(1000);
  }

  emit(type: NetworkEventType, data: Record<string, unknown>): NetworkEvent {
    const event: NetworkEvent = { type, ts: new Date().toISOString(), data };
    this.emitter.emit("event", event);
    return event;
  }

  subscribe(listener: NetworkEventListener): () => void {
    this.emitter.on("event", listener);
    return () => this.emitter.off("event", listener);
  }
}
