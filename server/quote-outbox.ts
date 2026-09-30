import { pool } from "./db";
import { storage } from "./storage";
import { logDealEvent } from "./deal-events";
import { sendQuoteSubmissionNotification, sendQuoteConfirmationToCustomer } from "./email";
import { quoteTotalLabel } from "@shared/quote-lines";
import { quoteOutboxDdl, claimQuoteEmailSql, completeQuoteEmailSql, exhaustQuoteEmailSql, retrySalesQuoteEmailSql, quoteEmailOutcome } from "./quote-outbox-sql";

export async function ensureQuoteOutbox() {
  await pool.query(quoteOutboxDdl);
}

export async function quoteNotificationStatus(quoteId: number) {
  return (await pool.query(`SELECT audience,status,attempts,next_attempt_at,last_error,sent_at
    FROM quote_email_outbox WHERE quote_id=$1 ORDER BY audience`, [quoteId])).rows;
}

// Does not resend successful deliveries. A manual retry is explicit and audited.
export async function retrySalesNotification(quoteId: number) {
  return (await pool.query(retrySalesQuoteEmailSql, [quoteId])).rows.length > 0;
}

let running = false;
let started = false;
export async function processQuoteEmailQueue() {
  if (!started || running) return;
  running = true;
  try {
    await pool.query(exhaustQuoteEmailSql);
    for (let n = 0; n < 10; n++) {
      const job = (await pool.query(claimQuoteEmailSql)).rows[0];
      if (!job) break;
      let success = false;
      let error = "Email submission failed";
      try {
        const quote = await storage.getQuoteWithItems(job.quote_id);
        if (!quote) throw new Error("Quote no longer exists");
        const customer = await storage.getUser(quote.userId);
        if (!customer) throw new Error("Quote customer no longer exists");
        const contactName = customer.primaryContactName || customer.companyName || customer.email;
        const totalValue = quoteTotalLabel(quote.items, Number(quote.totalEstimate || 0));
        const common = { quoteId: quote.id, itemCount: quote.items.length, totalValue, lines: quote.items };
        const result = job.audience === "sales"
          ? await sendQuoteSubmissionNotification({ ...common,
              customerEmail: customer.email, customerName: contactName,
              companyName: customer.companyName || contactName,
              customerPhone: customer.phoneNumber || customer.mobileNumber,
              customerNotes: quote.customerNotes,
              enquiryNumber: quote.inventoryEnquiryRef })
          : await sendQuoteConfirmationToCustomer({ ...common, email: customer.email, contactName });
        success = result.success;
        error = result.error || error;
      } catch (err) {
        // Keep a bounded error; never persist credentials or message bodies.
        console.error(`[quote-email] Q-${job.quote_id} ${job.audience} delivery failed`);
        error = "Could not prepare or submit this quote email. Check server logs and mail configuration.";
      }
      const outcome = quoteEmailOutcome(success, job.attempts);
      const updated = await pool.query(completeQuoteEmailSql,
        [job.id, job.attempts, outcome.status, success ? null : error.slice(0, 500), outcome.delay]);
      if (updated.rowCount) await logDealEvent({ dealKind: "quote", dealId: job.quote_id,
        type: success ? "email_sent" : "email_failed",
        message: success ? `${job.audience === "sales" ? "Sales notification" : "Customer confirmation"} accepted by the mail server.`
          : `${job.audience === "sales" ? "Sales notification" : "Customer confirmation"} failed (attempt ${job.attempts}/6). ${outcome.status === "pending" ? "Automatic retry queued." : "Admin action required."}` });
    }
  } catch {
    console.error("[quote-email] Queue processing failed; saved jobs will be retried.");
  } finally { running = false; }
}

export function startQuoteEmailWorker() {
  if (started || process.env.QUOTE_EMAIL_WORKER_ENABLED === "false") return () => {};
  started = true;
  void processQuoteEmailQueue();
  const timer = setInterval(() => { void processQuoteEmailQueue(); }, 30_000);
  timer.unref();
  return () => { clearInterval(timer); started = false; };
}
