import crypto from "crypto";

/**
 * Symmetric encryption for third-party credentials at rest.
 *
 * API keys have to be usable later, so they can't be hashed — but they also
 * shouldn't sit in the database in plain text where a leaked backup hands
 * someone a live billing account. AES-256-GCM gives confidentiality plus an
 * auth tag, so tampering is detected rather than silently decrypting.
 */

function getKey() {
  const source =
    process.env.SECRETS_ENCRYPTION_KEY || process.env.JWT_SECRET || "";
  if (
    !source &&
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PHASE !== "phase-production-build"
  ) {
    throw new Error(
      "SECRETS_ENCRYPTION_KEY (or JWT_SECRET) must be set to store provider keys",
    );
  }
  return crypto
    .createHash("sha256")
    .update(source || "development-only-fallback")
    .digest();
}

const PREFIX = "v1";

export function encryptSecret(plain: string): string {
  if (!plain) return "";
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [PREFIX, iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(
    ":",
  );
}

export function decryptSecret(stored: string): string {
  if (!stored) return "";
  const parts = stored.split(":");
  // Anything not in our format is treated as never-encrypted legacy data
  if (parts.length !== 4 || parts[0] !== PREFIX) return stored;

  try {
    const key = getKey();
    const [, iv, tag, payload] = parts;
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(iv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(payload, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    // Wrong key or tampered ciphertext — behave as if there is no key stored
    return "";
  }
}

/** "sk-or-…9f2c" — enough to recognise a key without revealing it. */
export function maskSecret(plain: string): string {
  if (!plain) return "";
  if (plain.length <= 10) return "•".repeat(plain.length);
  return `${plain.slice(0, 6)}…${plain.slice(-4)}`;
}
