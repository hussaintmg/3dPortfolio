/**
 * Throwaway end-to-end check for the chat message actions.
 *
 * Exercises the real HTTP routes as two real accounts (the owner and a
 * client), then cleans up after itself. Deleted at the end of the run.
 */
import { SignJWT } from "jose";
import mongoose from "mongoose";
import fs from "fs";

const BASE = process.env.BASE || "http://localhost:3000";

const env = fs.readFileSync("C:/Coding/portfolio/.env.local", "utf8");
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}

const secret = new TextEncoder().encode(process.env.JWT_SECRET);
const sign = (u) =>
  new SignJWT({ id: String(u._id), role: u.role, username: u.username, status: u.status })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secret);

await mongoose.connect(process.env.MONGODB_URI);
const users = mongoose.connection.collection("users");
const owner = await users.findOne({ role: "owner" });
const client = await users.findOne({ role: "user" });
if (!owner || !client) {
  console.log("SKIP: need one owner and one client account");
  process.exit(0);
}

const ownerTok = await sign(owner);
const clientTok = await sign(client);

const call = async (path, opts = {}, tok = ownerTok) => {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Cookie: `auth_token=${tok}`,
      ...(opts.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
};

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
};

const convId = String(client._id);
const created = [];

// 1. Client sends a message
let r = await call("/api/chat", {
  method: "POST",
  body: JSON.stringify({ type: "text", text: "TEST original message" }),
}, clientTok);
check("client can send", r.body.success, r.body.message?.slice?.(0, 60) || "");
const original = r.body.message;
if (original?._id) created.push(original._id);

// 2. Owner replies, quoting it
r = await call("/api/chat", {
  method: "POST",
  body: JSON.stringify({
    type: "text",
    text: "TEST reply",
    conversationId: convId,
    replyTo: {
      id: original._id,
      text: "TEST original message",
      senderName: client.username,
      type: "text",
    },
  }),
});
const reply = r.body.message;
if (reply?._id) created.push(reply._id);
check(
  "reply carries the quote",
  reply?.replyTo?.id === original._id && reply?.replyTo?.text === "TEST original message",
  JSON.stringify(reply?.replyTo || null),
);

// 3. Owner reacts to the client's message
r = await call("/api/chat/message", {
  method: "PATCH",
  body: JSON.stringify({ id: original._id, action: "react", emoji: "👍" }),
});
check(
  "react adds",
  r.body.success && r.body.message.reactions.some((x) => x.emoji === "👍"),
  JSON.stringify(r.body.message?.reactions || []),
);

// 4. Same emoji again removes it
r = await call("/api/chat/message", {
  method: "PATCH",
  body: JSON.stringify({ id: original._id, action: "react", emoji: "👍" }),
});
check("react toggles off", r.body.success && r.body.message.reactions.length === 0);

// 5. Switching emoji replaces rather than stacks
await call("/api/chat/message", {
  method: "PATCH",
  body: JSON.stringify({ id: original._id, action: "react", emoji: "❤️" }),
});
r = await call("/api/chat/message", {
  method: "PATCH",
  body: JSON.stringify({ id: original._id, action: "react", emoji: "😂" }),
});
check(
  "one reaction per person",
  r.body.message.reactions.length === 1 && r.body.message.reactions[0].emoji === "😂",
  JSON.stringify(r.body.message.reactions),
);

// 6. Owner edits their OWN message
r = await call("/api/chat/message", {
  method: "PATCH",
  body: JSON.stringify({ id: reply._id, action: "edit", text: "TEST reply edited" }),
});
check(
  "edit own message",
  r.body.success && r.body.message.text === "TEST reply edited" && !!r.body.message.editedAt,
);

// 7. Owner may NOT edit the client's message
r = await call("/api/chat/message", {
  method: "PATCH",
  body: JSON.stringify({ id: original._id, action: "edit", text: "hijacked" }),
});
check("cannot edit someone else's", r.status === 403, `HTTP ${r.status}`);

// 8. Empty edit refused
r = await call("/api/chat/message", {
  method: "PATCH",
  body: JSON.stringify({ id: reply._id, action: "edit", text: "   " }),
});
check("empty edit refused", r.status === 400, `HTTP ${r.status}`);

// 9. Client cannot react to a message in someone else's thread
const otherClient = await users.findOne({ role: "user", _id: { $ne: client._id } });
if (otherClient) {
  const otherTok = await sign(otherClient);
  r = await call("/api/chat/message", {
    method: "PATCH",
    body: JSON.stringify({ id: original._id, action: "react", emoji: "👍" }),
  }, otherTok);
  check("outsider blocked", r.status === 404, `HTTP ${r.status}`);
} else {
  console.log("SKIP  outsider check (only one client account)");
}

// 10. Bulk delete
r = await call("/api/chat/message", {
  method: "POST",
  body: JSON.stringify({ ids: created, mode: "everyone" }),
});
check("bulk delete", r.body.success && r.body.removed === created.length, JSON.stringify(r.body));

// 11. Gone from the thread
r = await call(`/api/chat?conversationId=${convId}`, {}, ownerTok);
const stillThere = (r.body.messages || []).filter((m) => created.includes(m._id));
check("removed from thread", stillThere.length === 0, `${stillThere.length} left`);

await mongoose.disconnect();

const failed = results.filter((x) => !x.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
