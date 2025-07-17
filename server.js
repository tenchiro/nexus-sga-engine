require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const { MongoClient } = require('mongodb');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error("FATAL ERROR: MONGODB_URI is not defined.");
    process.exit(1);
}
const client = new MongoClient(uri);
const DB_NAME = 'nexus_sga_db_v2'; // Using a new DB for the new version
let db;

async function connectToDb() {
    try {
        await client.connect();
        db = client.db(DB_NAME);
        console.log("Successfully connected to MongoDB.");
    } catch (e) {
        console.error("Could not connect to MongoDB", e);
        process.exit(1);
    }
}

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // When the client asks for the first event
    socket.on('get_first_event', (callback) => {
        // For this test, we send a hardcoded placeholder event
        const placeholderEvent = {
            week: 1,
            lifeEvent: "You've arrived on campus. The air is buzzing with the energy of new beginnings. What's your first move?",
            posts: [
                { choice_text: "Contact my family to let them know I'm safe and sound.", score: 1 },
                { choice_text: "Explore the campus to find my classes before everyone else does.", score: 0 },
                { choice_text: "Find the nearest party and make some new friends immediately.", score: -1 }
            ]
        };
        callback({ status: 'success', data: placeholderEvent });
    });

    // When the client submits the final data
    socket.on('submit_final_data', async (sessionData) => {
        try {
            const resultsCollection = db.collection('completed_sessions');
            await resultsCollection.insertOne(sessionData);
            console.log(`Saved session for player: ${sessionData.playerID}`);
        } catch (e) {
            console.error('Database write error:', e);
        }
    });

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3000;
connectToDb().then(() => {
    server.listen(PORT, () => {
        console.log(`Nexus 2.0 server running on port ${PORT}`);
    });
});