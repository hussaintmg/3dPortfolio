import { SignJWT, jwtVerify } from "jose";

/**
 * Signed, expiring email-verification links.
 *
 * A JWT rather than a random token in the database: nothing extra to store,
 * nothing to clean up, and an expired link is rejected by the signature check
 * itself. The `purpose` claim stops a session cookie — or a password-reset
 * token — from being replayed here.
 */

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "default-fallback-secret-value",
);

const PURPOSE = "email-verify";
export const LINK_TTL_HOURS = 24;
/** Minutes between resends, so the button can't be used to spam an inbox. */
export const RESEND_COOLDOWN_MINUTES = 2;

export interface VerifyClaims {
  sub: string;
  email: string;
}

export async function createVerificationToken(claims: VerifyClaims) {
  return new SignJWT({ ...claims, purpose: PURPOSE })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${LINK_TTL_HOURS}h`)
    .sign(secret);
}

export type VerifyResult =
  | { ok: true; claims: VerifyClaims }
  | { ok: false; reason: "expired" | "invalid" };

export async function readVerificationToken(
  token: string,
): Promise<VerifyResult> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if (payload.purpose !== PURPOSE) return { ok: false, reason: "invalid" };
    if (!payload.sub || !payload.email) return { ok: false, reason: "invalid" };
    return {
      ok: true,
      claims: { sub: String(payload.sub), email: String(payload.email) },
    };
  } catch (err: any) {
    // jose reports an expired token distinctly, and the difference matters:
    // an expired link deserves a resend button, a forged one does not.
    const expired =
      err?.code === "ERR_JWT_EXPIRED" || /exp/i.test(err?.message || "");
    return { ok: false, reason: expired ? "expired" : "invalid" };
  }
}

export function verificationEmailHtml(opts: {
  name: string;
  url: string;
  siteName: string;
}) {
  const { name, url, siteName } = opts;
  return `<!doctype html>
<html><body style="margin:0;background:#0b0f19;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0f19;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#12121c;border:1px solid rgba(255,255,255,.08);border-radius:24px;overflow:hidden;">
        <tr><td style="padding:36px 32px 8px;">
          <p style="margin:0 0 6px;font-size:11px;font-weight:800;letter-spacing:.24em;text-transform:uppercase;color:#0083fe;">${escapeHtml(siteName)}</p>
          <h1 style="margin:0 0 14px;font-size:22px;line-height:1.3;color:#ffffff;font-weight:800;">Confirm your email</h1>
          <p style="margin:0 0 22px;font-size:14px;line-height:1.65;color:#9ca3af;">
            Hi ${escapeHtml(name)} — tap the button below to confirm this address.
            The link works for ${LINK_TTL_HOURS} hours.
          </p>
          <a href="${escapeAttr(url)}" style="display:inline-block;background:#0083fe;color:#ffffff;text-decoration:none;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;padding:15px 30px;border-radius:12px;">
            Confirm email
          </a>
          <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#6b7280;">
            If the button doesn't work, paste this into your browser:<br>
            <span style="color:#9ca3af;word-break:break-all;">${escapeHtml(url)}</span>
          </p>
        </td></tr>
        <tr><td style="padding:24px 32px 32px;">
          <p style="margin:0;font-size:11px;line-height:1.6;color:#4b5563;border-top:1px solid rgba(255,255,255,.06);padding-top:18px;">
            Didn't create an account? You can ignore this email — nothing will happen.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

const escapeHtml = (s: string) =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );

const escapeAttr = (s: string) => escapeHtml(s).replace(/`/g, "&#96;");
