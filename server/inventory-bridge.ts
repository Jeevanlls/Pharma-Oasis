/**
 * PORTAL → INVENTORY APP BRIDGE
 * -----------------------------
 * When a signed-in customer asks for a price or places an order on
 * pharmaoasis.co.uk, the request has to reach the people who actually work the
 * deal — not sit in an inbox waiting to be retyped.
 *
 * It lands in app.pharmaoasis.co.uk as an ENQUIRY. Never as a sales order, and
 * that is the whole point: a customer approved to log in to the website is not
 * necessarily approved to be invoiced. Approval lives in the inventory app, and
 * only a person there can turn an enquiry into an order.
 *
 * Failure policy: the customer's submission NEVER fails because the inventory
 * app is busy or restarting. The portal saves its own record and answers the
 * customer first; the push happens afterwards with retries. The inventory side
 * is idempotent on `portal_ref`, so a retry — automatic or manual, minutes or
 * days later — can never produce a duplicate enquiry.
 *
 * Config (Render → Environment on the portal service):
 *   INVENTORY_API_URL    e.g. https://app.pharmaoasis.co.uk   (no trailing slash)
 *   INVENTORY_API_TOKEN  same value as CRM_API_TOKEN on the inventory service
 * Either missing = bridge off. It logs that once and stays quiet.
 */

export interface BridgeLine {
  ean?: string | null;
  product_ref?: number | null;
  description?: string | null;
  quantity?: number | null;
  unit_price?: number | null;
  currency?: string | null;
}

export interface BridgePayload {
  portal_ref: string;
  kind: "quote" | "order";
  customer_ref?: number | null;
  company_name?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  currency?: string;
  customer_notes?: string | null;
  total_estimate?: number | null;
  submitted_at?: string;
  lines: BridgeLine[];
}

export interface BridgeResult {
  ok: boolean;
  /** ENQ-00123, when the push landed. */
  enquiryNumber?: string;
  systemRef?: number;
  /** True when the website login matched a customer record in the inventory app. */
  customerMatched?: boolean;
  /** True when that customer is actually cleared to be invoiced. */
  customerCanOrder?: boolean;
  /** Set when the push did not land. Plain English, safe to log or email. */
  error?: string;
  /** True when the bridge is switched off rather than broken. */
  disabled?: boolean;
}

const RETRY_DELAYS_MS = [2_000, 15_000, 60_000];
const REQUEST_TIMEOUT_MS = 15_000;

let warnedNotConfigured = false;

function config(): { url: string; token: string } | null {
  const url = (process.env.INVENTORY_API_URL ?? "").trim().replace(/\/+$/, "");
  const token = (process.env.INVENTORY_API_TOKEN ?? "").trim();
  if (!url || !token) {
    if (!warnedNotConfigured) {
      warnedNotConfigured = true;
      console.warn(
        "[inventory-bridge] INVENTORY_API_URL / INVENTORY_API_TOKEN not set — " +
          "portal quotes and orders will not reach app.pharmaoasis.co.uk.",
      );
    }
    return null;
  }
  return { url, token };
}

export function bridgeEnabled(): boolean {
  return config() != null;
}

/** One attempt. Distinguishes "will never work" from "try again shortly". */
async function attempt(
  payload: BridgePayload,
): Promise<{ result: BridgeResult; retryable: boolean }> {
  const cfg = config();
  if (!cfg) {
    return { result: { ok: false, disabled: true, error: "Bridge not configured." }, retryable: false };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${cfg.url}/api/crm/enquiries`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.token}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const text = await res.text();
    let body: any = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      /* non-JSON: keep the raw text for the error message */
    }

    if (res.ok) {
      return {
        result: {
          ok: true,
          enquiryNumber: body?.enquiry_number,
          systemRef: body?.system_ref,
          customerMatched: body?.customer_matched ?? false,
          customerCanOrder: body?.customer_can_order ?? false,
        },
        retryable: false,
      };
    }

    const message =
      body?.message ??
      body?.error ??
      (text ? text.slice(0, 300) : `The inventory app replied ${res.status}.`);

    // 4xx other than 408/429 means the payload itself is wrong — retrying the
    // same body will fail the same way. 5xx and timeouts are worth another go.
    const retryable = res.status >= 500 || res.status === 408 || res.status === 429;
    return { result: { ok: false, error: message }, retryable };
  } catch (err: any) {
    const reason = err?.name === "AbortError" ? "the inventory app did not answer in time" : err?.message;
    return { result: { ok: false, error: `Could not reach the inventory app: ${reason}` }, retryable: true };
  } finally {
    clearTimeout(timer);
  }
}

/** Single attempt, no retries. Used by the admin "retry now" action. */
export async function pushEnquiryOnce(payload: BridgePayload): Promise<BridgeResult> {
  return (await attempt(payload)).result;
}

/**
 * Push with retries, in the background.
 *
 * Returns immediately; the caller has already answered the customer. `onDone`
 * fires once with the final outcome so the caller can record it. Retries are
 * in-process only — if the portal restarts mid-backoff the push is lost, which
 * is what the admin retry endpoint is for.
 */
export function pushEnquiryInBackground(
  payload: BridgePayload,
  onDone?: (result: BridgeResult) => void | Promise<void>,
): void {
  void (async () => {
    let last: BridgeResult = { ok: false, error: "No attempt made." };
    for (let i = 0; i <= RETRY_DELAYS_MS.length; i++) {
      const { result, retryable } = await attempt(payload);
      last = result;
      if (result.ok || result.disabled || !retryable) break;
      const wait = RETRY_DELAYS_MS[i];
      if (wait == null) break;
      console.warn(
        `[inventory-bridge] ${payload.portal_ref} failed (${result.error}); retrying in ${wait / 1000}s`,
      );
      await new Promise((r) => setTimeout(r, wait));
    }

    if (last.ok) {
      console.log(`[inventory-bridge] ${payload.portal_ref} → enquiry ${last.enquiryNumber}`);
    } else if (!last.disabled) {
      console.error(`[inventory-bridge] ${payload.portal_ref} gave up: ${last.error}`);
    }

    try {
      await onDone?.(last);
    } catch (err) {
      console.error("[inventory-bridge] could not record the push outcome:", err);
    }
  })();
}
