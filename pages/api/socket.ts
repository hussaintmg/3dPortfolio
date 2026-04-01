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
    
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
  });

  res.end();
}
