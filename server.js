const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const cors = require('cors');

const app = express();

app.use(express.json());
app.use(cors());

const otp = require('./routes/otp');
const userProfile = require('./routes/user-profile');
const chat = require('./routes/chat');

app.use('/', userProfile);
app.use('/', otp);
app.use('/', chat);

// --- Socket.IO setup ---
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('No token provided'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // same as authMiddleware.js
    if (!decoded.id) return next(new Error('Invalid token payload'));
    socket.userId = decoded.id;
    next();
  } catch (err) {
    next(new Error('Invalid or expired token'));
  }
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.userId);

  socket.join(socket.userId);

  socket.on('joinConversation', (conversationId) => {
    socket.join(`conversation:${conversationId}`);
  });

  socket.on('leaveConversation', (conversationId) => {
    socket.leave(`conversation:${conversationId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.userId);
  });
});

app.set('io', io);
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
