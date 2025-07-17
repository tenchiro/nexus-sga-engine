require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
// const { MongoClient } = require('mongodb'); // Still disabled for this test

const app = express();
const server = http.createServer(app);

// --- THE FIX IS HERE ---
// This configures the Socket.IO server to allow connections
// from any origin. This is safe for our current testing phase.
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
// --- END OF FIX ---

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('get_first_event', (callback) => {
        console.log("Server received 'get_first_event'. Sending placeholder.");
        const placeholderEvent = {
            week: 1,
            lifeEvent: "You've arrived on campus. The air is buzzing with the energy of new beginnings. What's your first move?",
            posts: [
                { choice_text: "Contact my family to let them know I'm safe and sound.", score: 1 },
                { choice_text: "Explore the campus to find my classes before everyone else does.", score: 0 },
                { choice_text: "Find the nearest party and make some new friends immediately.", score: -1 }
            ]
        };
        if(callback) callback({ status: 'success', data: placeholderEvent });
    });

    socket.on('submit_final_data', (sessionData) => {
        console.log(`Received final data for player: ${sessionData.playerID}`);
        console.log(sessionData.informationTrail);
    });

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Nexus 2.0 (DIAGNOSTIC MODE) server running on port ${PORT}`);
});
