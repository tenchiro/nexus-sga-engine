require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
// const { MongoClient } = require('mongodb'); // Temporarily disable DB connection

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- Temporarily disable database connection for this test ---
// const uri = process.env.MONGODB_URI;
// ... (all database connection code is commented out) ...

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // When the client asks for the first event, send our hardcoded placeholder
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

    // We will just log the submission to the console for this test
    socket.on('submit_final_data', (sessionData) => {
        console.log(`Received final data for player: ${sessionData.playerID}`);
        console.log(sessionData.informationTrail);
    });

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3000;
// We don't need to wait for a DB connection, so we start the server directly
server.listen(PORT, () => {
    console.log(`Nexus 2.0 (DIAGNOSTIC MODE) server running on port ${PORT}`);
});
