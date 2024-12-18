const express = require("express");
const socket = require("socket.io");
const http = require("http");
const { Chess } = require("chess.js");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socket(server);

const chess = new Chess();
let players = {}; // Tracks player roles
let currentPlayer = "w"; // Tracks whose turn it is

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.render("index", { title: "Chess Game" });
});

io.on("connection", (uniqueSocket) => {
  console.log("A new client connected:", uniqueSocket.id);

  // Assign roles to players
  if (!players.white) {
    players.white = uniqueSocket.id;
    uniqueSocket.emit("playerRole", "w");
  } else if (!players.black) {
    players.black = uniqueSocket.id;
    uniqueSocket.emit("playerRole", "b");
  } else {
    uniqueSocket.emit("spectatorRole");
  }

  // Send the initial board state to the newly connected client
  uniqueSocket.emit("boardState", chess.fen());

  // Handle moves from clients
  uniqueSocket.on("move", (move) => {
    try {
      // Validate the player's turn
      if (chess.turn() === "w" && uniqueSocket.id !== players.white) return;
      if (chess.turn() === "b" && uniqueSocket.id !== players.black) return;

      const result = chess.move(move); // Attempt the move
      if (result) {
        currentPlayer = chess.turn(); // Update the current player's turn

        // Broadcast the valid move and updated board state to all clients
        io.emit("move", move);
        io.emit("boardState", chess.fen());
      } else {
        console.log("Invalid move attempted:", move);
        uniqueSocket.emit("invalidMove", move);
      }
    } catch (error) {
      console.error("Error handling move:", error);
      uniqueSocket.emit(
        "error",
        "An error occurred while processing your move."
      );
    }
  });

  // Handle player disconnection
  uniqueSocket.on("disconnect", () => {
    console.log("Client disconnected:", uniqueSocket.id);

    // Remove player from the role if they disconnect
    if (uniqueSocket.id === players.white) {
      delete players.white;
    }
    if (uniqueSocket.id === players.black) {
      delete players.black;
    }
  });
});

server.listen(3000, () => {
  console.log("Listening on Port 3000");
});
