require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // When the client asks for the first event, send our placeholder
    socket.on('get_first_event', (callback) => {
        const placeholderEvent = {
            week: 1,
            lifeEvent: "You've arrived on campus. The air is buzzing with the energy of new beginnings. What's your first move?",
            posts: [
                { choice_text: "Contact my family to let them know I'm safe and sound.", score: 1 },
                { choice_text: "Explore the campus to find my classes before everyone else does.", score: 0 },
                { choice_text: "Find the nearest party and make some new friends immediately.", score: -1 }
            ]
        };
        // Use the callback to send the data back to the specific client that asked
        if(callback) callback({ status: 'success', data: placeholderEvent });
    });

    // For this test, we just log the data to the console instead of writing to a DB
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
    console.log(`Nexus 2.0 Test Server running on port ${PORT}`);
});