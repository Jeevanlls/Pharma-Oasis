/**
 * CUSTOMER SYNC — inventory app → web portal logins
 * -------------------------------------------------
 * The inventory app (app.pharmaoasis.co.uk) is where a customer is created and
 * approved. This module reads that customer list and gives each one a portal
 * login, so nobody is approved twice.
 *
 * It never emails a password. It reuses the invite pattern already used for
 * staff: create the account with a throwaway password, then email a one-time
 * link where the customer sets their own. That keeps passwords out of inboxes
 * and proves the recipient controls the mailbox.
 *
 * Read-only: this module never writes to the inventory database.
 *
 * Connection: INVENTORY_DATABASE_URL (read-only role). Absent -> every entry
 * point fails with a clear message rather than half-running.
 */
import pg from "pg";
import bcrypt from "bcryptjs";
import { eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "./db";
import { users } from "@shared/schema";
import { storage } from "./storage";

const { Pool } = pg;

/** How many invites one call will send, however many are selected. Trade
 *  customers get a real email, so this is deliberately conservative. */
export const MAX_INVITES_PER_RUN = 25;

let invPool: pg.Pool | null = null;

function getInventoryPool(): pg.Pool {
  if (invPool) return invPool;
  let url = process.env.INVENTORY_DATABASE_URL;
  if (!url) {
    throw new Error(
      "INVENTORY_DATABASE_URL is not set. Add the inventory read-only connection string " +
        "in Render → Environment before syncing customers.",
    );
  }
  if (url.startsWith("psql ")) url = url.replace(/^psql\s+'?/, "").replace(/'$/, "");
  url = url.replace(/&?channel_binding=require/, "");
  invPool = new Pool({
    connectionString: url,
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 15_000,
  });
  return invPool;
}

export interface InventoryCustomer {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  contact_person: string | null;
  customer_number: string | null;
  /** when the customer was created in the inventory app — the automation uses
   *  this to tell a genuinely new customer from the existing backlog */
  created_at: Date | string | null;
  /** pending | approved | rejected. Older databases may not have the column,
   *  in which case everything reads as approved. */
  approval_status: string | null;
}

const FULL_SELECT = `select id, name, email, phone, contact_person, customer_number,
                            created_at, coalesce(approval_status, 'approved') as approval_status
                       from customers
                      where is_active is true
                      order by name`;

/** Same query without the newer columns, for a database that predates them. */
const LEGACY_SELECT = `select id, name, email, phone, contact_person, customer_number,
                              null::timestamp as created_at, 'approved' as approval_status
                         from customers
                        where is_active is true
                        order by name`;

export async function readInventoryCustomers(): Promise<InventoryCustomer[]> {
  const client = await getInventoryPool().connect();
  try {
    try {
      const r = await client.query<InventoryCustomer>(FULL_SELECT);
      return r.rows;
    } catch {
      // Missing column, most likely. Fall back rather than fail the whole page.
      const r = await client.query<InventoryCustomer>(LEGACY_SELECT);
      return r.rows;
    }
  } finally {
    client.release();
  }
}

export async function customerSyncHealth(): Promise<{
  configured: boolean;
  reachable: boolean;
  customers?: number;
  error?: string;
}> {
  if (!process.env.INVENTORY_DATABASE_URL) return { configured: false, reachable: false };
  try {
    const rows = await readInventoryCustomers();
    return { configured: true, reachable: true, customers: rows.length };
  } catch (e: any) {
    return { configured: true, reachable: false, error: e?.message || String(e) };
  }
}

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

export type CustomerSyncState =
  /** has an email, no portal account yet — an invite can go out */
  | "ready"
  /** already has a portal login linked to this inventory customer */
  | "linked"
  /** a portal account with this email exists but isn't linked — link it, don't re-invite */
  | "link_only"
  /** no email in the inventory app — nothing we can do from here */
  | "no_email"
  /** still awaiting approval in the inventory app — approval belongs there, not here */
  | "not_approved"
  /** this email is on more than one inventory customer — must be fixed at source */
  | "duplicate_email";

export interface CustomerSyncRow {
  inventoryCustomerId: number;
  company: string | null;
  contact: string | null;
  email: string | null;
  customerNumber: string | null;
  /** ISO date the customer was created in the inventory app, when known */
  createdAt: string | null;
  state: CustomerSyncState;
  /** the portal user this maps to, when there is one */
  portalUserId?: number;
  note?: string;
}

export interface CustomerSyncPreview {
  ranAt: string;
  inventoryCustomers: number;
  ready: number;
  linked: number;
  linkOnly: number;
  noEmail: number;
  duplicateEmail: number;
  notApproved: number;
  rows: CustomerSyncRow[];
}

/** Work out, for every active inventory customer, what (if anything) should happen.
 *  Reads only — nothing is created and no email is sent. */
export async function customerSyncPreview(): Promise<CustomerSyncPreview> {
  const customers = await readInventoryCustomers();

  const portalUsers = await db
    .select({
      id: users.id,
      email: users.email,
      inventoryCustomerId: users.inventoryCustomerId,
      role: users.role,
    })
    .from(users);

  const userByEmail = new Map<string, { id: number; role: string }>();
  const userByInvId = new Map<number, number>();
  for (const u of portalUsers) {
    if (u.email) userByEmail.set(norm(u.email), { id: u.id, role: u.role });
    if (u.inventoryCustomerId != null) userByInvId.set(u.inventoryCustomerId, u.id);
  }

  // Emails appearing on more than one inventory customer can't become logins:
  // the portal keys accounts on a unique email.
  const emailCounts = new Map<string, number>();
  for (const c of customers) {
    const e = norm(c.email);
    if (e) emailCounts.set(e, (emailCounts.get(e) ?? 0) + 1);
  }

  const rows: CustomerSyncRow[] = customers.map((c) => {
    const email = norm(c.email);
    const base = {
      inventoryCustomerId: c.id,
      company: c.name,
      contact: c.contact_person,
      email: email || null,
      customerNumber: c.customer_number,
      createdAt: c.created_at ? new Date(c.created_at).toISOString() : null,
    };

    const linkedUserId = userByInvId.get(c.id);
    if (linkedUserId) {
      return { ...base, state: "linked" as const, portalUserId: linkedUserId };
    }
    // Approval lives in the inventory app. A record still waiting there must not
    // get a login here, however complete the rest of it looks.
    if (norm(c.approval_status) && norm(c.approval_status) !== "approved") {
      return {
        ...base,
        state: "not_approved" as const,
        note: `awaiting approval in the inventory app (${c.approval_status})`,
      };
    }
    if (!email) {
      return { ...base, state: "no_email" as const, note: "no email in the inventory app" };
    }
    if ((emailCounts.get(email) ?? 0) > 1) {
      return {
        ...base,
        state: "duplicate_email" as const,
        note: "this email is on more than one customer — fix it in the inventory app first",
      };
    }
    const existing = userByEmail.get(email);
    if (existing) {
      return {
        ...base,
        state: "link_only" as const,
        portalUserId: existing.id,
        note:
          existing.role === "customer"
            ? "a portal account already uses this email — it will be linked, not re-invited"
            : `an existing ${existing.role} account uses this email — link it manually if that is intended`,
      };
    }
    return { ...base, state: "ready" as const };
  });

  const count = (s: CustomerSyncState) => rows.filter((r) => r.state === s).length;
  return {
    ranAt: new Date().toISOString(),
    inventoryCustomers: customers.length,
    ready: count("ready"),
    linked: count("linked"),
    linkOnly: count("link_only"),
    noEmail: count("no_email"),
    duplicateEmail: count("duplicate_email"),
    notApproved: count("not_approved"),
    rows,
  };
}

export interface InviteOutcome {
  inventoryCustomerId: number;
  company: string | null;
  email: string | null;
  result: "invited" | "linked" | "skipped" | "failed";
  detail?: string;
  portalUserId?: number;
}

/**
 * Create portal logins for the chosen inventory customers and email each one a
 * link to set their own password. Capped at MAX_INVITES_PER_RUN so invites go
 * out in small batches.
 *
 * `link_only` customers are linked to their existing portal account and NOT
 * emailed — they already have a login.
 */
export async function inviteCustomers(
  inventoryCustomerIds: number[],
  opts: { linkOnly?: boolean } = {},
): Promise<{ sent: number; linked: number; failed: number; results: InviteOutcome[] }> {
  const preview = await customerSyncPreview();
  const wanted = new Set(inventoryCustomerIds);
  const targets = preview.rows
    .filter((r) => wanted.has(r.inventoryCustomerId))
    .filter((r) => r.state === "ready" || r.state === "link_only")
    .slice(0, MAX_INVITES_PER_RUN);

  const crypto = await import("node:crypto");
  const { sendCustomerInviteEmail } = await import("./email");
  const SITE_URL = process.env.SITE_URL || "https://pharmaoasis.co.uk";

  const results: InviteOutcome[] = [];

  for (const row of targets) {
    const head = {
      inventoryCustomerId: row.inventoryCustomerId,
      company: row.company,
      email: row.email,
    };

    try {
      // Already has a portal account — just record the link, don't email again.
      if (row.state === "link_only") {
        if (row.portalUserId) {
          await db
            .update(users)
            .set({ inventoryCustomerId: row.inventoryCustomerId, updatedAt: new Date() })
            .where(eq(users.id, row.portalUserId));
        }
        results.push({ ...head, result: "linked", portalUserId: row.portalUserId, detail: "existing account linked" });
        continue;
      }

      if (opts.linkOnly) {
        results.push({ ...head, result: "skipped", detail: "link-only run" });
        continue;
      }

      const passwordHash = await bcrypt.hash(crypto.randomBytes(24).toString("hex"), 12);
      const token = crypto.randomBytes(32).toString("hex");
      const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const user = await storage.createUser({
        email: row.email!,
        passwordHash,
        role: "customer",
        // Approved in the inventory app already — no second approval here.
        status: "active",
        companyName: row.company,
        primaryContactName: row.contact,
        inventoryCustomerId: row.inventoryCustomerId,
        passwordResetToken: token,
        passwordResetExpiry: expiry,
      } as any);

      const emailResult = await sendCustomerInviteEmail({
        email: row.email!,
        contactName: row.contact || "",
        companyName: row.company || "",
        inviteUrl: `${SITE_URL}/reset-password?token=${token}`,
      });

      results.push({
        ...head,
        result: emailResult.success ? "invited" : "failed",
        portalUserId: user.id,
        detail: emailResult.success
          ? undefined
          : `account created but the invite email failed: ${emailResult.error ?? "unknown"}`,
      });
    } catch (e: any) {
      results.push({ ...head, result: "failed", detail: e?.message || String(e) });
    }
  }

  return {
    sent: results.filter((r) => r.result === "invited").length,
    linked: results.filter((r) => r.result === "linked").length,
    failed: results.filter((r) => r.result === "failed").length,
    results,
  };
}

/** Re-send an invite to a customer who already has a portal account but has
 *  never set a password (their token expired, or the mail went astray). */
export async function resendInvite(portalUserId: number): Promise<InviteOutcome> {
  const [user] = await db.select().from(users).where(eq(users.id, portalUserId));
  if (!user) return { inventoryCustomerId: 0, company: null, email: null, result: "failed", detail: "user not found" };

  const crypto = await import("node:crypto");
  const { sendCustomerInviteEmail } = await import("./email");
  const token = crypto.randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db
    .update(users)
    .set({ passwordResetToken: token, passwordResetExpiry: expiry, updatedAt: new Date() })
    .where(eq(users.id, portalUserId));

  const SITE_URL = process.env.SITE_URL || "https://pharmaoasis.co.uk";
  const r = await sendCustomerInviteEmail({
    email: user.email,
    contactName: user.primaryContactName || "",
    companyName: user.companyName || "",
    inviteUrl: `${SITE_URL}/reset-password?token=${token}`,
  });

  return {
    inventoryCustomerId: user.inventoryCustomerId ?? 0,
    company: user.companyName,
    email: user.email,
    result: r.success ? "invited" : "failed",
    portalUserId: user.id,
    detail: r.success ? "invite re-sent" : r.error,
  };
}
