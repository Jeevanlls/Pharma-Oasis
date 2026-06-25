// Two-factor authentication (TOTP / authenticator app) helpers.
// Uses otplib v12's synchronous `authenticator` API. Backup codes are stored
// bcrypt-hashed (never in plaintext) and are single-use.
import { authenticator } from "otplib";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

const ISSUER = "Pharma Oasis";

// Allow a ±1 time-step (30s) window to tolerate small clock drift between
// the server and the user's phone.
authenticator.options = { window: 1 };

/** Generate a fresh base32 TOTP secret to store against a user. */
export function generateSecret(): string {
  return authenticator.generateSecret();
}

/** otpauth:// URI encoded into the QR code the user scans with their app. */
export function buildOtpauthUrl(accountEmail: string, secret: string): string {
  return authenticator.keyuri(accountEmail, ISSUER, secret);
}

/** Verify a 6-digit code from the authenticator app against the user's secret. */
export function verifyToken(token: string, secret: string): boolean {
  if (!token || !secret) return false;
  const clean = token.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(clean)) return false;
  try {
    return authenticator.verify({ token: clean, secret });
  } catch {
    return false;
  }
}

/**
 * Generate N human-friendly backup codes. Returns the plaintext codes (shown to
 * the user ONCE) and their bcrypt hashes (persisted as a JSON string).
 */
export async function generateBackupCodes(count = 10): Promise<{ plain: string[]; hashedJson: string }> {
  const plain: string[] = [];
  for (let i = 0; i < count; i++) {
    // 8 hex chars, formatted as XXXX-XXXX for readability.
    const raw = crypto.randomBytes(4).toString("hex").toUpperCase();
    plain.push(`${raw.slice(0, 4)}-${raw.slice(4, 8)}`);
  }
  const hashed = await Promise.all(plain.map((c) => bcrypt.hash(c, 10)));
  return { plain, hashedJson: JSON.stringify(hashed) };
}

/**
 * Check a backup code against the stored hashed list. If it matches, returns the
 * remaining hashes (with the used one removed) so the caller can persist them —
 * backup codes are single-use. Returns null on no match.
 */
export async function consumeBackupCode(
  code: string,
  hashedJson: string | null,
): Promise<{ remainingJson: string } | null> {
  if (!code || !hashedJson) return null;
  let hashes: string[];
  try {
    hashes = JSON.parse(hashedJson);
  } catch {
    return null;
  }
  const clean = code.replace(/\s+/g, "").toUpperCase();
  for (let i = 0; i < hashes.length; i++) {
    if (await bcrypt.compare(clean, hashes[i])) {
      const remaining = hashes.filter((_, idx) => idx !== i);
      return { remainingJson: JSON.stringify(remaining) };
    }
  }
  return null;
}
