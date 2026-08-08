import type { NextApiRequest, NextApiResponse } from "next";
import type { Server } from "socket.io";
import type { Server as HTTPServer } from "http";
import type { Socket as NetSocket } from "net";

interface SocketServer extends HTTPServer {
  io?: Server;
}
interface SocketWithIO extends NetSocket {
  server: SocketServer;
}
interface ResWithSocket extends NextApiResponse {
  socket: SocketWithIO;
}

/**
 * Server-side bridge so App Router route handlers can push a socket event.
 *
 * It deliberately lives OUTSIDE /api/socket: socket.io claims that whole
 * path prefix, so anything nested under it never reaches Next's router.
 *
 * Only reachable from this server (the io instance hangs off the same HTTP
 * server), and it never accepts arbitrary events from the browser — the
 * allowlist below is the whole surface.
 */
const ALLOWED_EVENTS = new Set(["notification:new"]);

export default function handler(req: NextApiRequest, res: ResWithSocket) {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, message: "POST only" });
    return;
  }

  // Requests must originate from this app, not a browser on another origin
  const origin = req.headers.origin;
  if (origin) {
    res.status(403).json({ success: false, message: "Server-side only" });
    return;
  }

  const io = res.socket.server.io;
  if (!io) {
    res.status(200).json({ success: true, delivered: false, reason: "socket not started" });
    return;
  }

  const { room, event, payload } = req.body || {};
  if (!event || !ALLOWED_EVENTS.has(event)) {
    res.status(400).json({ success: false, message: "Unsupported event" });
    return;
  }

  const rooms = Array.isArray(room) ? room : [room || "staff"];
  rooms.forEach((r) => io.to(String(r)).emit(event, payload));

  res.status(200).json({ success: true, delivered: true });
}
