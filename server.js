const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const app = express();
// This is the crucial part for Render. It handles the initial security handshake.
app.use(cors()); 

const server = http.createServer(app);

// This is the second crucial part. It configures the WebSocket server itself.
const io = new Server(server, {
    cors: {
        origin: "*", // Allow any origin
        methods: ["GET", "POST"]
    }
});

// Serve the files from the 'public' folder
app.use(express.static('public'));

// When a browser connects, do this:
io.on('connection', (socket) => {
    console.log(`SUCCESS: Client connected with ID: ${socket.id}`);
    
    // Immediately send a confirmation message back to the connected client.
    socket.emit('confirmation', { message: 'Connection to server successful!' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Connection Test Server running on port ${PORT}`);
});
