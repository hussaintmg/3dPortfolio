import { Server } from 'socket.io';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { Server as HTTPServer } from 'http';
import type { Socket as NetSocket } from 'net';

interface SocketServer extends HTTPServer {
  io?: Server | undefined;
}

interface SocketWithIO extends NetSocket {
  server: SocketServer;
}

interface NextApiResponseWithSocket extends NextApiResponse {
  socket: SocketWithIO;
}

export default function SocketHandler(req: NextApiRequest, res: NextApiResponseWithSocket) {
  if (res.socket.server.io) {
    console.log('Socket already running');
    res.end();
    return;
  }

  console.log('Initializing Socket...');
  const io = new Server(res.socket.server as any, {
    path: '/api/socket',
    addTrailingSlash: false,
  });
  
  res.socket.server.io = io;

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Join a room for a specific user ID for private messages
    socket.on('join_room', (userId) => {
        socket.join(userId);
        console.log(`User ${userId} joined room`);
    });

    // Handle instant enquiries (from previous system)
    socket.on('new_enquiry', (data) => {
        socket.broadcast.emit('new_enquiry', data);
    });

    // Handle chat messages
    socket.on('send_message', (data) => {
        const { receiverId, message, senderId, createdAt, packageContext } = data;

        // Emit to the specific receiver's room
        io.to(receiverId).emit('receive_message', {
            senderId,
            message,
            createdAt,
            packageContext,
        });

        console.log(`Message from ${senderId} to ${receiverId}: ${message}`);
    });

    // ── New conversation-based chat relay ──────────────────────────────
    // Rooms: `conv:<conversationId>` (both sides of a thread) and `staff`
    // (dashboard inbox). The DB write happens via /api/chat first — the
    // sender then relays the saved message here for realtime delivery.
    socket.on('chat:join', (rooms: string[]) => {
      (Array.isArray(rooms) ? rooms : [rooms]).forEach((r) => socket.join(String(r)));
    });

    socket.on('chat:new', (msg: any) => {
      if (!msg?.conversationId) return;
      socket.to(`conv:${msg.conversationId}`).emit('chat:new', msg);
      socket.to('staff').emit('chat:inbox', msg);
    });

    socket.on('chat:delete', (payload: any) => {
      if (!payload?.conversationId) return;
      socket.to(`conv:${payload.conversationId}`).emit('chat:delete', payload);
    });
    
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
  });

  res.end();
}
