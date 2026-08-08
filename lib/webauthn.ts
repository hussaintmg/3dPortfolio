import { cookies, headers } from "next/headers";

/**
 * Relying-party details derived from the incoming request, so passkeys work
 * on localhost during development and on the deployed domain in production
 * without any extra configuration.
 */
export async function getRpInfo() {
  const h = await headers();
  const host = h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  // rpID must be the bare domain — no port, no scheme
  const rpID = host.split(":")[0];
  return {
    rpID,
    rpName: "Portfolio",
    origin: `${proto}://${host}`,
  };
}

const CHALLENGE_COOKIE = "webauthn_challenge";

/** Challenges are single-use and short-lived; a cookie is the simplest store. */
export async function saveChallenge(challenge: string) {
  const store = await cookies();
  store.set({
    name: CHALLENGE_COOKIE,
    value: challenge,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 300,
  });
}

export async function readChallenge() {
  const store = await cookies();
  return store.get(CHALLENGE_COOKIE)?.value || null;
}

export async function clearChallenge() {
  const store = await cookies();
  store.delete(CHALLENGE_COOKIE);
}
