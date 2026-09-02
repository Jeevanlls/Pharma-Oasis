/**
 * AUTOMATIC CUSTOMER INVITES
 * --------------------------
 * Once a day, give any NEW customer from the inventory app a portal login,
 * without anyone having to remember to do it.
 *
 * The rules that make this safe to leave running:
 *
 *  - Only customers created in the inventory app AFTER automation was switched
 *    on. The backlog that existed on day one is never touched — those go out by
 *    hand, in batches, so nobody wakes up to sixty emails they didn't expect.
 *  - Only customers the inventory app has actually approved. Approval lives
 *    there; this never invents a second gate or bypasses the first.
 *  - Internal and obvious test addresses are skipped, so a scratch record can't
 *    trigger a real email.
 *  - A run is capped. If something upstream goes wrong, the blast radius is
 *    small and visible.
 *  - The run is marked as done BEFORE the invites go out. A crash or a restart
 *    mid-run therefore under-sends rather than double-sends; a customer missed
 *    today is picked up tomorrow, whereas a customer emailed twice cannot be
 *    un-emailed.
 *  - Every run that did something emails a summary, so "automatic" never means
 *    "invisible".
 *
 * Nothing here writes to the inventory database.
 */
import { storage } from "./storage";
import { customerSyncPreview, inviteCustomers, type CustomerSyncRow } from "./customer-sync";

/** Settings keys, stored in site_settings so they survive deploys. */
const KEY_ENABLED = "customer_autoinvite_enabled";
const KEY_SINCE = "customer_autoinvite_since";
const KEY_HOUR = "customer_autoinvite_hour";
const KEY_LAST_RUN_DAY = "customer_autoinvite_last_run_day";
const KEY_LAST_RESULT = "customer_autoinvite_last_result";

/** Most invites one automatic run will send. A normal day is a handful. */
export const MAX_AUTO_INVITES_PER_RUN = 15;

/** Addresses that must never receive an automatic invite. */
const INTERNAL_DOMAINS = ["pharmaoasis.com", "pharmaoasis.co.uk"];
const TEST_MARKERS = ["test", "dummy", "sample", "example"];

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

const log = (msg: string) => console.log(`[auto-invite] ${msg}`);

/** UTC day stamp, the unit the "already ran today" guard counts in. */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface AutoInviteConfig {
  enabled: boolean;
  /** customers created before this are the manual backlog, never automatic */
  since: string | null;
  /** hour of the day (UTC, 0-23) the sweep runs */
  hour: number;
  lastRunDay: string | null;
  lastResult: AutoInviteResult | null;
}

export async function getAutoInviteConfig(): Promise<AutoInviteConfig> {
  const [enabled, since, hour, lastRunDay, lastResult] = await Promise.all([
    storage.getSetting(KEY_ENABLED),
    storage.getSetting(KEY_SINCE),
    storage.getSetting(KEY_HOUR),
    storage.getSetting(KEY_LAST_RUN_DAY),
    storage.getSetting(KEY_LAST_RESULT),
  ]);

  let parsed: AutoInviteResult | null = null;
  if (lastResult) {
    try {
      parsed = JSON.parse(lastResult);
    } catch {
      parsed = null;
    }
  }

  return {
    enabled: enabled === "true",
    since: since ?? null,
    hour: Number.isFinite(Number(hour)) ? Number(hour) : 8,
    lastRunDay: lastRunDay ?? null,
    lastResult: parsed,
  };
}

/**
 * Turn automation on or off.
 *
 * Switching on for the first time stamps "now" as the cutoff, which is what
 * keeps the existing backlog manual. Switching off and on again later does NOT
 * move the cutoff — otherwise anyone created during the gap would be silently
 * skipped forever.
 */
export async function setAutoInvite(opts: { enabled?: boolean; hour?: number }): Promise<AutoInviteConfig> {
  if (opts.enabled !== undefined) {
    await storage.setSetting(
      KEY_ENABLED,
      opts.enabled ? "true" : "false",
      "Automatically invite new inventory customers to the portal",
    );
    const since = await storage.getSetting(KEY_SINCE);
    if (opts.enabled && !since) {
      await storage.setSetting(
        KEY_SINCE,
        new Date().toISOString(),
        "Customers created before this are the manual backlog and are never invited automatically",
      );
    }
  }

  if (opts.hour !== undefined) {
    const h = Math.min(23, Math.max(0, Math.round(opts.hour)));
    await storage.setSetting(KEY_HOUR, String(h), "Hour of day (UTC) the automatic invite sweep runs");
  }

  return getAutoInviteConfig();
}

/** Why a new customer was passed over. Shown in the summary email so a skip is
 *  never silent — most of these are somebody's typo waiting to be fixed. */
export interface AutoInviteSkip {
  company: string | null;
  email: string | null;
  reason: string;
}

export interface AutoInviteResult {
  ranAt: string;
  dryRun: boolean;
  /** new customers considered, i.e. created after the cutoff */
  candidates: number;
  invited: number;
  linked: number;
  failed: number;
  skipped: AutoInviteSkip[];
  invitedList: { company: string | null; email: string | null }[];
  /** set when the run did nothing and why */
  note?: string;
}

function isInternalOrTest(row: CustomerSyncRow): string | null {
  const email = norm(row.email);
  const domain = email.split("@")[1] ?? "";
  if (INTERNAL_DOMAINS.includes(domain)) {
    return "internal address — invite it by hand if that is really intended";
  }
  const haystack = `${norm(row.company)} ${email}`;
  if (TEST_MARKERS.some((m) => haystack.includes(m))) {
    return "looks like a test record";
  }
  return null;
}

/**
 * One sweep. Safe to call at any time: with dryRun it reports what would happen
 * and sends nothing.
 */
export async function runAutoInvite(opts: { dryRun?: boolean } = {}): Promise<AutoInviteResult> {
  const dryRun = opts.dryRun ?? false;
  const cfg = await getAutoInviteConfig();
  const base: AutoInviteResult = {
    ranAt: new Date().toISOString(),
    dryRun,
    candidates: 0,
    invited: 0,
    linked: 0,
    failed: 0,
    skipped: [],
    invitedList: [],
  };

  if (!cfg.since) {
    return { ...base, note: "automation has never been switched on, so there is no cutoff yet" };
  }
  const cutoff = new Date(cfg.since).getTime();

  const preview = await customerSyncPreview();

  // Anything created before the cutoff is the manual backlog. A customer with no
  // creation date at all predates the column and is therefore backlog too.
  const fresh = preview.rows.filter((r) => {
    if (r.state !== "ready" && r.state !== "link_only") return false;
    if (!r.createdAt) return false;
    return new Date(r.createdAt).getTime() > cutoff;
  });

  const skipped: AutoInviteSkip[] = [];
  const eligible: CustomerSyncRow[] = [];
  for (const row of fresh) {
    const reason = isInternalOrTest(row);
    if (reason) skipped.push({ company: row.company, email: row.email, reason });
    else eligible.push(row);
  }

  const batch = eligible.slice(0, MAX_AUTO_INVITES_PER_RUN);
  for (const row of eligible.slice(MAX_AUTO_INVITES_PER_RUN)) {
    skipped.push({
      company: row.company,
      email: row.email,
      reason: `over the ${MAX_AUTO_INVITES_PER_RUN}-per-run cap — will go out on the next run`,
    });
  }

  const result: AutoInviteResult = { ...base, candidates: fresh.length, skipped };

  if (!batch.length) {
    return { ...result, note: fresh.length ? "nothing eligible to send" : "no new customers since the last run" };
  }
  if (dryRun) {
    return {
      ...result,
      invited: batch.filter((r) => r.state === "ready").length,
      linked: batch.filter((r) => r.state === "link_only").length,
      invitedList: batch.map((r) => ({ company: r.company, email: r.email })),
    };
  }

  const sent = await inviteCustomers(batch.map((r) => r.inventoryCustomerId));

  return {
    ...result,
    invited: sent.sent,
    linked: sent.linked,
    failed: sent.failed,
    invitedList: sent.results
      .filter((r) => r.result === "invited" || r.result === "linked")
      .map((r) => ({ company: r.company, email: r.email })),
    skipped: [
      ...skipped,
      ...sent.results
        .filter((r) => r.result === "failed")
        .map((r) => ({ company: r.company, email: r.email, reason: r.detail || "failed" })),
    ],
  };
}

/** A run worth telling somebody about. A quiet day sends no email. */
function worthReporting(r: AutoInviteResult): boolean {
  return r.invited > 0 || r.linked > 0 || r.failed > 0 || r.skipped.length > 0;
}

async function runAndReport(): Promise<void> {
  const result = await runAutoInvite();
  await storage.setSetting(KEY_LAST_RESULT, JSON.stringify(result), "Result of the last automatic invite run");
  log(
    `${result.invited} invited, ${result.linked} linked, ` +
      `${result.failed} failed, ${result.skipped.length} skipped`,
  );
  if (!worthReporting(result)) return;
  try {
    const { sendCustomerInviteSummary } = await import("./email");
    await sendCustomerInviteSummary(result);
  } catch (e: any) {
    log(`summary email failed: ${e?.message || e}`);
  }
}

let timer: NodeJS.Timeout | null = null;
let running = false;

/** How often we wake up to check whether the daily run is due. */
const TICK_MS = 15 * 60 * 1000;

async function tick(): Promise<void> {
  if (running) return;
  const cfg = await getAutoInviteConfig();
  if (!cfg.enabled) return;

  const now = new Date();
  if (now.getUTCHours() < cfg.hour) return;
  const day = today();
  if (cfg.lastRunDay === day) return;

  running = true;
  try {
    // Claim the day BEFORE sending. If this process dies mid-run, the worst
    // outcome is a few customers waiting until tomorrow — not a second email.
    await storage.setSetting(KEY_LAST_RUN_DAY, day, "Last day the automatic invite sweep ran (UTC)");
    await runAndReport();
  } catch (e: any) {
    log(`run failed: ${e?.message || e}`);
  } finally {
    running = false;
  }
}

export function startAutoInviteScheduler(): void {
  if (timer) return;
  // First check shortly after boot, so a deploy during the run window still
  // catches the day rather than waiting for the next tick.
  setTimeout(() => void tick(), 60_000);
  timer = setInterval(() => void tick(), TICK_MS);
}

export function stopAutoInviteScheduler(): void {
  if (timer) clearInterval(timer);
  timer = null;
}
