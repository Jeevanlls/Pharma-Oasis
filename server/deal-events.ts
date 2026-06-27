// ============================================================
// E5 — Deal events. A lightweight activity/comms log for quotes and
// orders. Writes are best-effort: a logging failure must never break
// the action it describes, so logDealEvent swallows its own errors.
// ============================================================
import { db } from "./db";
import { dealEvents, type DealEvent } from "@shared/schema";
import { and, asc, eq } from "drizzle-orm";

export type DealKind = "quote" | "order";

export interface LogDealEventInput {
  dealKind: DealKind;
  dealId: number;
  type: string;
  actorId?: number | null;
  message?: string | null;
}

/** Record an event. Fire-and-forget — never throws. */
export async function logDealEvent(input: LogDealEventInput): Promise<void> {
  try {
    await db.insert(dealEvents).values({
      dealKind: input.dealKind,
      dealId: input.dealId,
      type: input.type,
      actorId: input.actorId ?? null,
      message: input.message ?? null,
    });
  } catch (err: any) {
    console.warn(`deal-event log failed (${input.dealKind} ${input.dealId} ${input.type}):`, err?.message);
  }
}

/** All events for a deal, oldest first (for the workspace timeline). */
export async function listDealEvents(dealKind: DealKind, dealId: number): Promise<DealEvent[]> {
  try {
    return await db
      .select()
      .from(dealEvents)
      .where(and(eq(dealEvents.dealKind, dealKind), eq(dealEvents.dealId, dealId)))
      .orderBy(asc(dealEvents.createdAt));
  } catch (err: any) {
    console.warn(`deal-event list failed (${dealKind} ${dealId}):`, err?.message);
    return [];
  }
}
