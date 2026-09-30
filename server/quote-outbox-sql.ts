// Kept together so the real queue statements can be exercised on an isolated DB.
export const quoteOutboxDdl = `CREATE TABLE IF NOT EXISTS quote_email_outbox (
 id SERIAL PRIMARY KEY, quote_id INTEGER NOT NULL REFERENCES quotes(id),
 audience VARCHAR(16) NOT NULL CHECK (audience IN ('sales','customer')),
 status VARCHAR(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','failed')),
 attempts INTEGER NOT NULL DEFAULT 0, next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 locked_until TIMESTAMPTZ, last_error TEXT, sent_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CONSTRAINT quote_email_outbox_quote_audience_unique UNIQUE (quote_id,audience)
)`;

export const claimQuoteEmailSql = `WITH candidate AS (
 SELECT id FROM quote_email_outbox
 WHERE attempts < 6 AND ((status='pending' AND next_attempt_at <= now())
   OR (status='sending' AND locked_until < now()))
 ORDER BY next_attempt_at,id FOR UPDATE SKIP LOCKED LIMIT 1
) UPDATE quote_email_outbox q SET status='sending', attempts=attempts+1,
 locked_until=now()+interval '2 minutes'
 FROM candidate c WHERE q.id=c.id RETURNING q.*`;

export const completeQuoteEmailSql = `UPDATE quote_email_outbox SET status=$3::text,
 sent_at=CASE WHEN $3::text='sent' THEN now() ELSE NULL END,
 last_error=$4, locked_until=NULL, next_attempt_at=now()+($5::int * interval '1 second')
 WHERE id=$1 AND attempts=$2 AND status='sending'`;

export const exhaustQuoteEmailSql = `UPDATE quote_email_outbox SET status='failed', locked_until=NULL,
 last_error='Delivery outcome unknown after the final interrupted attempt. Check the mailbox before retrying.'
 WHERE status='sending' AND attempts>=6 AND locked_until < now()`;

export const retrySalesQuoteEmailSql = `INSERT INTO quote_email_outbox (quote_id,audience) VALUES ($1,'sales')
 ON CONFLICT (quote_id,audience) DO UPDATE SET status='pending',attempts=0,
 next_attempt_at=now(),locked_until=NULL,last_error=NULL
 WHERE quote_email_outbox.status='failed' RETURNING id`;

export function quoteEmailOutcome(success: boolean, attempts: number) {
  return { status: success ? "sent" : attempts >= 6 ? "failed" : "pending",
    delay: success ? 0 : Math.min(3600, 60 * 2 ** Math.max(0, attempts - 1)) };
}
