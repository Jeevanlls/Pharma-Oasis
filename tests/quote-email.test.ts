import test from "node:test";
import assert from "node:assert/strict";
import nodemailer from "nodemailer";

test("quote email transport includes sales recipients, EANs, reply-to and honest failure", async () => {
  process.env.ZOHO_EMAIL_PASSWORD = "not-a-real-password";
  process.env.ZOHO_EMAIL = "sender@example.invalid";
  process.env.NOTIFICATION_EMAIL = "ops@example.invalid";
  process.env.TRADE_INBOX = "trade@example.invalid";
  process.env.SALES_INBOX = "sales@example.invalid";
  process.env.APP_URL = "https://example.invalid";
  const sent: any[] = [];
  let reject = false;
  // This transport is in-memory. No mail server or real recipient is contacted.
  (nodemailer as any).createTransport = () => ({ sendMail: async (mail: any) => {
    sent.push(mail);
    return { accepted: ["sales@example.invalid"], rejected: reject ? ["trade@example.invalid"] : [] };
  } });
  const { sendQuoteSubmissionNotification, sendQuoteConfirmationToCustomer } = await import("../server/email");
  const lines = [{ ean: "0000123456789", description: "Test product", quantity: 12, unitPrice: null }];
  const request = { quoteId: 123, customerEmail: "buyer@example.invalid", customerName: "Test <buyer>",
    companyName: "Example & Co", customerPhone: "01234567890", customerNotes: "<script>bad</script>",
    itemCount: 1, totalValue: "Price on request", lines };
  assert.equal((await sendQuoteSubmissionNotification(request)).success, true);
  assert.equal(sent[0].to, "ops@example.invalid, trade@example.invalid, sales@example.invalid");
  assert.equal(sent[0].replyTo, "buyer@example.invalid");
  assert.match(sent[0].html, /0000123456789/);
  assert.match(sent[0].html, /admin\/sales\/quote\/123/);
  assert.match(sent[0].html, /Example &amp; Co/);
  assert.doesNotMatch(sent[0].html, /<script>/);
  assert.equal((await sendQuoteConfirmationToCustomer({ quoteId: 123, email: "buyer@example.invalid", contactName: "Test <buyer>", itemCount: 1, totalValue: "Price on request", lines })).success, true);
  assert.match(sent[1].html, /0000123456789/);
  reject = true;
  assert.equal((await sendQuoteSubmissionNotification(request)).success, false);
});
