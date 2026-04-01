"use client";

import { io, Socket } from "socket.io-client";

let socket: Socket | undefined;

export function getSocket() {
  if (!socket) {
    socket = io({
      path: "/api/socket",
      addTrailingSlash: false,
    });

    socket.on("connect", () => {
      console.log("Socket client connected:", socket?.id);
    });

    socket.on("connect_error", (error) => {
        console.error("Socket connection error. Initializing server first.");
        // Try to wake up the server if it's not initialized
        fetch("/api/socket").catch(() => {});
    });
  }
  return socket;
}
