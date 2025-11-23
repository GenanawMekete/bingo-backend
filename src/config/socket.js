const { Server } = require('socket.io');
const logger = require('../utils/logger');
const { authenticateSocket } = require('../middleware/socketAuth');

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "*",
      methods: ["GET", "POST"],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Socket middleware
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    logger.info(`🔌 New socket connection: ${socket.id}`);
    
    // Join player to their room
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }

    // Import and register event handlers
    require('../events/gameEvents')(socket, io);
    require('../events/playerEvents')(socket, io);
    require('../events/roomEvents')(socket, io);
    require('../events/bingoEvents')(socket, io);

    socket.on('disconnect', (reason) => {
      logger.info(`🔌 Socket disconnected: ${socket.id} - Reason: ${reason}`);
      handleDisconnect(socket);
    });

    socket.on('error', (error) => {
      logger.error(`Socket error for ${socket.id}:`, error);
    });
  });

  return io;
};

const handleDisconnect = (socket) => {
  // Clean up when player disconnects
  if (socket.roomId) {
    socket.to(socket.roomId).emit('player_left', {
      playerId: socket.userId,
      playerCount: io.sockets.adapter.rooms.get(socket.roomId)?.size || 0
    });
  }
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

module.exports = {
  initSocket,
  getIO
};
