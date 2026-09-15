/**
 * RATE CARDS
 * ----------
 * What we charge, held once.
 *
 * Before this, a margin lived on each of sixty price lists. Sixty copies of one
 * commercial decision: to change the house rate you edited sixty rows, and to
 * put one customer on a different rate across the range you built sixty lists
 * for them alone. Neither is a thing anyone does twice.
 *
 * A rate card holds the decision. Every customer sits on exactly one. The price
 * lists are still what the portal reads — that part of the system is unchanged
 * and this does not touch how a price is computed or shown — but they are now
 * GENERATED from a card rather than being the place the number lives.
 *
 * An exception is one brand, for one customer, at its own rate. It gets its own
 * one-customer list and is never touched by a card-wide change. That is the
 * property that matters: putting the house up by five points must not quietly
 * undo a deal someone negotiated.
 *
 * Nothing here recomputes a price itself. Lists are built by pricingV2 and
 * repriced by pricingBulk, both of which go through computePrepared — so a rate
 * card cannot disagree with a hand-edited line about what 20% means.
 */
import { and, eq, inArray, isNull, isNotNull } from "drizzle-orm";
import { db } from "./db";
import {
  customerBrandRates,
  customerPriceLists,
  customerRates,
  priceLists,
  pricingBrands,
  rateCards,
  users,
  type RateCard,
} from "@shared/schema";
import * as pricingV2 from "./pricing-v2";
import * as pricingBulk from "./pricing-bulk";

const num = (v: string | number | null | undefined): number =>
  v === null || v === undefined ? 0 : typeof v === "number" ? v : Number(v);

/** The list name a card's brand list carries, so it reads the same everywhere. */
export const listNameFor = (brand: string, card: string) => `${brand} — ${card}`;
export const exceptionListNameFor = (brand: string, customer: string) => `${brand} — ${customer}`;

// ---------------------------------------------------------------------------
// CARDS
// ---------------------------------------------------------------------------

export async function listRateCards(): Promise<RateCard[]> {
  return db.select().from(rateCards).orderBy(rateCards.isDefault, rateCards.name);
}

export async function getDefaultCard(): Promise<RateCard | null> {
  const [c] = await db.select().from(rateCards).where(eq(rateCards.isDefault, true));
  return c ?? null;
}

export async function createRateCard(data: {
  name: string;
  marginPercent: number;
  roundingMode?: string;
  notes?: string | null;
}): Promise<RateCard> {
  const name = data.name.trim();
  if (!name) throw new Error("A rate card needs a name.");
  const margin = Number(data.marginPercent);
  if (!Number.isFinite(margin) || margin < 0 || margin > 1000) {
    throw new Error("Margin must be a number between 0 and 1000.");
  }
  const [made] = await db
    .insert(rateCards)
    .values({
      name,
      marginPercent: margin.toFixed(2),
      roundingMode: data.roundingMode ?? "none",
      notes: data.notes ?? null,
      isDefault: false,
      isActive: true,
    })
    .returning();
  return made;
}

/**
 * Change a card's rate, and carry it through to every list the card generated.
 *
 * Exception lists are untouched by construction: they carry no rateCardId, so
 * the reprice cannot see them.
 */
export async function setCardMargin(
  cardId: number,
  marginPercent: number,
): Promise<{ card: RateCard; lists: number; repriced: number }> {
  const margin = Number(marginPercent);
  if (!Number.isFinite(margin) || margin < 0 || margin > 1000) {
    throw new Error("Margin must be a number between 0 and 1000.");
  }
  const [card] = await db
    .update(rateCards)
    .set({ marginPercent: margin.toFixed(2), updatedAt: new Date() })
    .where(eq(rateCards.id, cardId))
    .returning();
  if (!card) throw new Error("Rate card not found");

  const owned = await db
    .select({ id: priceLists.id })
    .from(priceLists)
    .where(and(eq(priceLists.rateCardId, cardId), isNull(priceLists.archivedAt)));

  if (!owned.length) return { card, lists: 0, repriced: 0 };

  const r = await pricingBulk.repriceLists({
    marginPercent: margin,
    listIds: owned.map((l) => l.id),
  });
  return { card, lists: r.lists, repriced: r.repriced };
}

export async function renameRateCard(cardId: number, name: string): Promise<RateCard> {
  const [card] = await db
    .update(rateCards)
    .set({ name: name.trim(), updatedAt: new Date() })
    .where(eq(rateCards.id, cardId))
    .returning();
  if (!card) throw new Error("Rate card not found");
  // The lists carry the card's name, so rename those too or the screen lies.
  const owned = await db
    .select({ id: priceLists.id, brandId: priceLists.brandId })
    .from(priceLists)
    .where(eq(priceLists.rateCardId, cardId));
  const brands = await db.select().from(pricingBrands);
  const brandName = new Map(brands.map((b) => [b.id, b.name]));
  for (const l of owned) {
    if (l.brandId == null) continue;
    await db
      .update(priceLists)
      .set({ name: listNameFor(brandName.get(l.brandId) ?? `#${l.brandId}`, card.name), updatedAt: new Date() })
      .where(eq(priceLists.id, l.id));
  }
  return card;
}

/**
 * Delete a card by moving everyone on it somewhere else first.
 *
 * A card cannot simply vanish: its customers would be left seeing nothing. The
 * caller says where they go, and the house rate is the only sensible default.
 */
export async function deleteRateCard(cardId: number, moveToCardId?: number): Promise<{ moved: number }> {
  const [card] = await db.select().from(rateCards).where(eq(rateCards.id, cardId));
  if (!card) throw new Error("Rate card not found");
  if (card.isDefault) throw new Error("The house rate cannot be deleted. Make another card the house rate first.");

  const fallback = moveToCardId ?? (await getDefaultCard())?.id;
  if (!fallback) throw new Error("Nowhere to move these customers to.");

  const on = await db.select().from(customerRates).where(eq(customerRates.rateCardId, cardId));
  for (const r of on) await assignCustomerToCard(r.customerId, fallback);

  await db.update(priceLists).set({ archivedAt: new Date(), status: "archived", updatedAt: new Date() })
    .where(eq(priceLists.rateCardId, cardId));
  await db.delete(rateCards).where(eq(rateCards.id, cardId));
  return { moved: on.length };
}

// ---------------------------------------------------------------------------
// GENERATING THE LISTS A CARD IMPLIES
// ---------------------------------------------------------------------------

/**
 * Make sure this card has a published list for every brand that has live costs,
 * and that every customer on the card is assigned to those lists.
 *
 * Idempotent: run it after creating a card, after adding a brand, after a
 * customer moves. It builds what is missing and leaves what exists alone.
 */
export async function syncRateCard(cardId: number): Promise<{
  built: number;
  assigned: number;
  skippedNoCosts: number;
}> {
  const [card] = await db.select().from(rateCards).where(eq(rateCards.id, cardId));
  if (!card) throw new Error("Rate card not found");
  const margin = num(card.marginPercent);

  const brands = await db.select().from(pricingBrands).where(eq(pricingBrands.isActive, true));
  const existing = await db
    .select({ id: priceLists.id, brandId: priceLists.brandId })
    .from(priceLists)
    .where(and(eq(priceLists.rateCardId, cardId), isNull(priceLists.archivedAt)));
  const haveByBrand = new Map(existing.filter((e) => e.brandId != null).map((e) => [e.brandId as number, e.id]));

  let built = 0;
  let skippedNoCosts = 0;

  for (const b of brands) {
    if (haveByBrand.has(b.id)) continue;
    const base = await pricingV2.getBaseCostForBrand(b.id);
    if (!base || !base.rows.length) {
      skippedNoCosts++;
      continue;
    }
    const { list } = await pricingV2.buildPriceList({
      name: listNameFor(b.name, card.name),
      brandId: b.id,
      defaultMarginPercent: margin,
      roundingMode: (card.roundingMode as pricingV2.RoundingMode) ?? "none",
    });
    await pricingV2.updatePriceListMeta(list.id, { status: "published" });
    await db
      .update(priceLists)
      .set({ rateCardId: cardId, updatedAt: new Date() })
      .where(eq(priceLists.id, list.id));
    haveByBrand.set(b.id, list.id);
    built++;
  }

  const listIds = Array.from(haveByBrand.values());
  const members = await db.select().from(customerRates).where(eq(customerRates.rateCardId, cardId));
  let assigned = 0;
  if (listIds.length && members.length) {
    const r = await assignMembersToLists(members.map((m) => m.customerId), listIds);
    assigned = r;
  }
  return { built, assigned, skippedNoCosts };
}

/**
 * Put these customers onto these lists, replacing whatever they were on for the
 * same brand.
 *
 * Replacing is right HERE and nowhere else: a customer's card is the statement
 * of what they pay, so moving them to a card must actually move them. Brand
 * exceptions are re-applied afterwards by syncExceptions, which is what keeps a
 * deal from being lost to a card change.
 */
async function assignMembersToLists(customerIds: number[], listIds: number[]): Promise<number> {
  let n = 0;
  for (const listId of listIds) {
    const r = await pricingV2.assignCustomers(listId, customerIds, { replace: true });
    n += r.assigned;
  }
  return n;
}

// ---------------------------------------------------------------------------
// WHO IS ON WHAT
// ---------------------------------------------------------------------------

export async function assignCustomerToCard(
  customerId: number,
  cardId: number,
  assignedBy?: number | null,
): Promise<void> {
  const [card] = await db.select().from(rateCards).where(eq(rateCards.id, cardId));
  if (!card) throw new Error("Rate card not found");

  await db
    .insert(customerRates)
    .values({ customerId, rateCardId: cardId, assignedBy: assignedBy ?? null })
    .onConflictDoUpdate({
      target: customerRates.customerId,
      set: { rateCardId: cardId, assignedBy: assignedBy ?? null, assignedAt: new Date() },
    });

  const lists = await db
    .select({ id: priceLists.id })
    .from(priceLists)
    .where(and(eq(priceLists.rateCardId, cardId), isNull(priceLists.archivedAt)));
  if (lists.length) await assignMembersToLists([customerId], lists.map((l) => l.id));

  // Their negotiated brands go back on top.
  await syncExceptions(customerId);
}

/** Everyone with no card yet goes on the house rate. Safe to run at any time. */
export async function placeUnassignedCustomers(): Promise<number> {
  const house = await getDefaultCard();
  if (!house) return 0;
  const all = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "customer"), eq(users.status, "active")));
  const placed = await db.select({ customerId: customerRates.customerId }).from(customerRates);
  const have = new Set(placed.map((p) => p.customerId));
  let n = 0;
  for (const u of all) {
    if (have.has(u.id)) continue;
    await assignCustomerToCard(u.id, house.id);
    n++;
  }
  return n;
}

// ---------------------------------------------------------------------------
// EXCEPTIONS — one brand, one customer, its own rate
// ---------------------------------------------------------------------------

export async function setBrandException(input: {
  customerId: number;
  brandId: number;
  marginPercent: number;
  note?: string | null;
  createdBy?: number | null;
}): Promise<void> {
  const margin = Number(input.marginPercent);
  if (!Number.isFinite(margin) || margin < 0 || margin > 1000) {
    throw new Error("Margin must be a number between 0 and 1000.");
  }
  await db
    .insert(customerBrandRates)
    .values({
      customerId: input.customerId,
      brandId: input.brandId,
      marginPercent: margin.toFixed(2),
      note: input.note ?? null,
      createdBy: input.createdBy ?? null,
    })
    .onConflictDoUpdate({
      target: [customerBrandRates.customerId, customerBrandRates.brandId],
      set: { marginPercent: margin.toFixed(2), note: input.note ?? null, updatedAt: new Date() },
    });
  await syncExceptions(input.customerId);
}

/** Drop the deal; the customer falls back to their card for that brand. */
export async function removeBrandException(customerId: number, brandId: number): Promise<void> {
  await db
    .delete(customerBrandRates)
    .where(and(eq(customerBrandRates.customerId, customerId), eq(customerBrandRates.brandId, brandId)));

  // Archive the one-customer list and put them back on their card's list.
  const deals = await db
    .select({ id: priceLists.id })
    .from(priceLists)
    .where(
      and(
        eq(priceLists.exceptionCustomerId, customerId),
        eq(priceLists.brandId, brandId),
        isNull(priceLists.archivedAt),
      ),
    );
  for (const d of deals) await pricingV2.archivePriceListV2(d.id);

  const [on] = await db.select().from(customerRates).where(eq(customerRates.customerId, customerId));
  if (!on) return;
  const [cardList] = await db
    .select({ id: priceLists.id })
    .from(priceLists)
    .where(
      and(
        eq(priceLists.rateCardId, on.rateCardId),
        eq(priceLists.brandId, brandId),
        isNull(priceLists.archivedAt),
      ),
    );
  if (cardList) await pricingV2.assignCustomers(cardList.id, [customerId], { replace: true });
}

/**
 * Build and assign the one-customer list behind every exception.
 *
 * Runs for one customer, or for everybody when called with no argument — after
 * a card change, say, which will have reassigned people to the card's lists and
 * needs the deals put back on top.
 */
export async function syncExceptions(customerId?: number): Promise<{ built: number; assigned: number }> {
  const rows = customerId
    ? await db.select().from(customerBrandRates).where(eq(customerBrandRates.customerId, customerId))
    : await db.select().from(customerBrandRates);
  if (!rows.length) return { built: 0, assigned: 0 };

  const brands = await db.select().from(pricingBrands);
  const brandName = new Map(brands.map((b) => [b.id, b.name]));
  const people = await db.select({ id: users.id, company: users.companyName, email: users.email }).from(users);
  const who = new Map(people.map((p) => [p.id, (p.company ?? "").trim() || p.email]));

  let built = 0;
  let assigned = 0;

  for (const r of rows) {
    const margin = num(r.marginPercent);
    const [existing] = await db
      .select({ id: priceLists.id })
      .from(priceLists)
      .where(
        and(
          eq(priceLists.exceptionCustomerId, r.customerId),
          eq(priceLists.brandId, r.brandId),
          isNull(priceLists.archivedAt),
        ),
      );

    let listId = existing?.id;
    if (!listId) {
      const base = await pricingV2.getBaseCostForBrand(r.brandId);
      if (!base || !base.rows.length) continue;
      const { list: made } = await pricingV2.buildPriceList({
        name: exceptionListNameFor(brandName.get(r.brandId) ?? `#${r.brandId}`, who.get(r.customerId) ?? `#${r.customerId}`),
        brandId: r.brandId,
        defaultMarginPercent: margin,
        roundingMode: "none",
      });
      await pricingV2.updatePriceListMeta(made.id, { status: "published" });
      await db
        .update(priceLists)
        .set({ exceptionCustomerId: r.customerId, updatedAt: new Date() })
        .where(eq(priceLists.id, made.id));
      listId = made.id;
      built++;
    } else {
      // Rate may have been renegotiated — carry it through.
      await pricingBulk.repriceLists({ marginPercent: margin, listIds: [listId] });
    }

    const res = await pricingV2.assignCustomers(listId, [r.customerId], { replace: true });
    assigned += res.assigned;
  }

  return { built, assigned };
}

// ---------------------------------------------------------------------------
// THE OVERVIEW — what do we charge, and who is on what
// ---------------------------------------------------------------------------

export interface RateCardSummary {
  id: number;
  name: string;
  marginPercent: string;
  isDefault: boolean;
  customers: number;
  /** brand lists generated from this card */
  lists: number;
  /** brands with live costs that this card has no list for yet */
  missingLists: number;
}

export interface ExceptionSummary {
  customerId: number;
  customer: string;
  brandId: number;
  brand: string;
  marginPercent: string;
  /** what they would pay without the deal */
  cardMarginPercent: string | null;
  cardName: string | null;
  note: string | null;
}

export async function pricingSummary(): Promise<{
  houseMargin: string | null;
  cards: RateCardSummary[];
  exceptions: ExceptionSummary[];
  customersWithoutCard: number;
  brandsPriced: number;
}> {
  const cards = await listRateCards();
  const placements = await db.select().from(customerRates);
  const lists = await db
    .select({ id: priceLists.id, rateCardId: priceLists.rateCardId, brandId: priceLists.brandId })
    .from(priceLists)
    .where(and(isNull(priceLists.archivedAt), isNotNull(priceLists.brandId)));

  const brandsWithCosts = new Set(
    lists.filter((l) => l.brandId != null).map((l) => l.brandId as number),
  );

  const byCard = new Map<number, number>();
  for (const p of placements) byCard.set(p.rateCardId, (byCard.get(p.rateCardId) ?? 0) + 1);
  const listsByCard = new Map<number, number>();
  for (const l of lists) {
    if (l.rateCardId == null) continue;
    listsByCard.set(l.rateCardId, (listsByCard.get(l.rateCardId) ?? 0) + 1);
  }

  const activeCustomers = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "customer"), eq(users.status, "active")));
  const placedIds = new Set(placements.map((p) => p.customerId));

  const exRows = await db.select().from(customerBrandRates);
  const brands = await db.select().from(pricingBrands);
  const brandName = new Map(brands.map((b) => [b.id, b.name]));
  const people = await db.select({ id: users.id, company: users.companyName, email: users.email }).from(users);
  const who = new Map(people.map((p) => [p.id, (p.company ?? "").trim() || p.email]));
  const cardById = new Map(cards.map((c) => [c.id, c]));
  const cardOf = new Map(placements.map((p) => [p.customerId, cardById.get(p.rateCardId) ?? null]));

  const exceptions: ExceptionSummary[] = exRows
    .map((r) => {
      const card = cardOf.get(r.customerId) ?? null;
      return {
        customerId: r.customerId,
        customer: who.get(r.customerId) ?? `#${r.customerId}`,
        brandId: r.brandId,
        brand: brandName.get(r.brandId) ?? `#${r.brandId}`,
        marginPercent: r.marginPercent,
        cardMarginPercent: card?.marginPercent ?? null,
        cardName: card?.name ?? null,
        note: r.note,
      };
    })
    .sort((a, b) => a.customer.localeCompare(b.customer) || a.brand.localeCompare(b.brand));

  return {
    houseMargin: cards.find((c) => c.isDefault)?.marginPercent ?? null,
    cards: cards.map((c) => ({
      id: c.id,
      name: c.name,
      marginPercent: c.marginPercent,
      isDefault: !!c.isDefault,
      customers: byCard.get(c.id) ?? 0,
      lists: listsByCard.get(c.id) ?? 0,
      missingLists: Math.max(0, brandsWithCosts.size - (listsByCard.get(c.id) ?? 0)),
    })),
    exceptions,
    customersWithoutCard: activeCustomers.filter((u) => !placedIds.has(u.id)).length,
    brandsPriced: brandsWithCosts.size,
  };
}

/**
 * Give today's state a name.
 *
 * Every brand list was built at one margin and assigned to everybody, which is
 * exactly a rate card — it just had no name and no home. This adopts those
 * lists into a card rather than rebuilding anything, so no customer's price
 * moves by a penny.
 */
export async function adoptExistingLists(cardName = "Standard"): Promise<{
  created: boolean;
  adopted: number;
  placed: number;
  margin: string | null;
}> {
  let house = await getDefaultCard();

  if (!house) {
    const live = await db
      .select({ margin: priceLists.defaultMarginPercent })
      .from(priceLists)
      .where(and(eq(priceLists.scope, "brand"), isNull(priceLists.archivedAt), isNotNull(priceLists.brandId)));
    const counts = new Map<string, number>();
    for (const l of live) {
      const k = l.margin ?? "20.00";
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    const commonest = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "20.00";

    const [made] = await db
      .insert(rateCards)
      .values({
        name: cardName,
        marginPercent: commonest,
        roundingMode: "none",
        isDefault: true,
        isActive: true,
        notes: "The rate every customer was on before rate cards existed.",
      })
      .returning();
    house = made;
  }

  const orphans = await db
    .select({ id: priceLists.id })
    .from(priceLists)
    .where(
      and(
        eq(priceLists.scope, "brand"),
        isNull(priceLists.archivedAt),
        isNull(priceLists.rateCardId),
        isNull(priceLists.exceptionCustomerId),
        eq(priceLists.defaultMarginPercent, house.marginPercent),
      ),
    );
  if (orphans.length) {
    await db
      .update(priceLists)
      .set({ rateCardId: house.id, updatedAt: new Date() })
      .where(inArray(priceLists.id, orphans.map((o) => o.id)));
  }

  const placed = await placeUnassignedCustomers();
  return { created: true, adopted: orphans.length, placed, margin: house.marginPercent };
}
