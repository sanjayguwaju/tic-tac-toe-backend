// Import required modules
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

// Initialize the app and server
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*', // Allow all origins (Not recommended for production)
    methods: ['GET', 'POST'],
  },
});

// Use CORS middleware to allow cross-origin requests
app.use(cors());

const PORT = process.env.PORT || 4000;

// Game state variables
let players = {}; // Store player information
let unmatched; // Store the unmatched player

// Start the server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Function to handle a player joining the game
const joinGame = (socket) => {
  players[socket.id] = {
    opponent: unmatched, // Set the opponent to the unmatched player
    symbol: 'X', // Default symbol for the new player
    socket: socket,
  };

  if (unmatched) {
    // If there is an unmatched player, pair them up
    players[socket.id].symbol = 'O'; // Set the symbol for the second player
    players[unmatched].opponent = socket.id; // Set the opponent for the unmatched player
    unmatched = null; // Reset unmatched
    startGame(socket.id, players[socket.id].opponent); // Start the game
  } else {
    // If no unmatched player, set this player as unmatched
    unmatched = socket.id;
  }
};

// Function to start the game between two players
const startGame = (playerXId, playerOId) => {
  const playerXSocket = players[playerXId].socket;
  const playerOSocket = players[playerOId].socket;

  // Notify players that the game is starting
  playerXSocket.emit('game.begin', { symbol: 'X' });
  playerOSocket.emit('game.begin', { symbol: 'O' });
};

// Function to get the opponent's socket
const getOpponent = (socket) => {
  if (!players[socket.id].opponent) {
    return;
  }
  return players[players[socket.id].opponent].socket;
};

// Handle socket connections
io.on('connection', (socket) => {
  console.log(`New client connected: ${socket.id}`);

  joinGame(socket);

  // Handle move made by a player
  socket.on('make.move', (data) => {
    const opponentSocket = getOpponent(socket);

    if (!opponentSocket) {
      return;
    }

    // Notify both players of the move
    socket.emit('move.made', data);
    opponentSocket.emit('move.made', data);
  });

  // Handle player disconnection
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    const opponentSocket = getOpponent(socket);

    if (opponentSocket) {
      // Notify the opponent that the player has left
      opponentSocket.emit('opponent.left');
    }
    delete players[socket.id]; // Remove the player from the game state
  });
});