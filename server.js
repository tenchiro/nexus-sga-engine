require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors'); // Import the cors package

const app = express();

// --- THE FIX ---
// Use the cors middleware at the application level.
// This will add the necessary headers to all responses.
app.use(cors());
// ---------------

const server = http.createServer(app);

// The Socket.IO server no longer needs its own cors config,
// as Express is now handling it.
const io = new Server(server);

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('client:request_event', () => {
        console.log(`Server received 'client:request_event' from ${socket.id}.`);
        const placeholderEvent = {
            week: 1,
            lifeEvent: "You've arrived on campus. The air is buzzing with the energy of new beginnings. What's your first move?",
            posts: [
                { choice_text: "Contact my family to let them know I'm safe and sound.", score: 1 },
                { choice_text: "Explore the campus to find my classes before everyone else does.", score: 0 },
                { choice_text: "Find the nearest party and make some new friends immediately.", score: -1 }
            ]
        };
        socket.emit('server:send_event', { status: 'success', data: placeholderEvent });
        console.log("Server sent placeholder event back to client.");
    });

    socket.on('submit_final_data', (sessionData) => {
        console.log(`Received final data for player: ${sessionData.playerID}`);
    });

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Nexus 2.0 (CORS FIXED) server running on port ${PORT}`);
});