/* eslint-env node */
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PLAYERS = {};

io.on('connection', (socket) => {
  console.log('User Connected:', socket.id);

  socket.on('join', (playerData) => {
    PLAYERS[socket.id] = {
      id: socket.id,
      ...playerData
    };
    // Notify others
    socket.broadcast.emit('playerJoined', PLAYERS[socket.id]);
    // Send existing players to the new one
    socket.emit('initialPlayers', PLAYERS);
  });

  socket.on('updateState', (state) => {
    if (PLAYERS[socket.id]) {
      PLAYERS[socket.id] = { ...PLAYERS[socket.id], ...state };
      socket.broadcast.emit('playerMoved', PLAYERS[socket.id]);
    }
  });

  socket.on('shoot', (bulletData) => {
    socket.broadcast.emit('remoteShoot', {
      owner: socket.id,
      ...bulletData
    });
  });

  socket.on('playerHit', (data) => {
    // data: { targetId, damage, attackerId }
    io.to(data.targetId).emit('receiveDamage', {
      damage: data.damage,
      attackerId: socket.id
    });
  });

  socket.on('disconnect', () => {
    console.log('User Disconnected:', socket.id);
    delete PLAYERS[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Shadow Duel Server running on port ${PORT}`);
});
