import { Server } from 'socket.io';
import { config } from '../config/env.js';
import { logger } from './logger.js';

let ioInstance = null;

export const initSocket = (server) => {
  ioInstance = new Server(server, {
    cors: {
      origin: [config.clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
      methods: ['GET', 'POST']
    }
  });

  ioInstance.on('connection', (socket) => {
    logger.info(`[Socket.IO] New client connected: ${socket.id}`);

    socket.on('join_room', (room) => {
      socket.join(room);
      logger.debug(`[Socket.IO] Socket ${socket.id} joined room: ${room}`);
    });

    socket.on('disconnect', () => {
      logger.info(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  return ioInstance;
};

export const getIO = () => {
  return ioInstance;
};
