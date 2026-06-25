// "Remember this device for 30 days" for admin 2FA. A high-entropy random token
// is stored as a SHA-256 hash (indexed for fast lookup) with an expiry. The raw
// token lives only in an http-only cookie on the user's browser.
import crypto from "node:crypto";
import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "./db";
import { trustedDevices } from "@shared/schema";

export const TRUSTED_COOKIE = "po_td";
export const TRUSTED_DAYS = 30;

const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

/** Create a trusted-device record for a user; returns the raw token for the cookie. */
export async function rememberDevice(userId: number, label?: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TRUSTED_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(trustedDevices).values({
    userId,
    tokenHash: hashToken(token),
    label: label ? label.slice(0, 255) : null,
    expiresAt,
  });
  return token;
}

/** True if the token matches a non-expired trusted device for this user (and bumps last_used). */
export async function isDeviceTrusted(userId: number, token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const [row] = await db
    .select()
    .from(trustedDevices)
    .where(and(
      eq(trustedDevices.userId, userId),
      eq(trustedDevices.tokenHash, hashToken(token)),
      gt(trustedDevices.expiresAt, new Date()),
    ));
  if (!row) return false;
  await db.update(trustedDevices).set({ lastUsedAt: new Date() }).where(eq(trustedDevices.id, row.id));
  return true;
}

/** Remove every trusted device for a user (used on disable / "forget all devices"). */
export async function forgetAllDevices(userId: number): Promise<void> {
  await db.delete(trustedDevices).where(eq(trustedDevices.userId, userId));
}

/** Count current (non-expired) trusted devices for a user. */
export async function countTrustedDevices(userId: number): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(trustedDevices)
    .where(and(eq(trustedDevices.userId, userId), gt(trustedDevices.expiresAt, new Date())));
  return row?.n ?? 0;
}
