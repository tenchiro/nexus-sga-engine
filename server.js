const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const { MongoClient } = require('mongodb');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- IMPORTANT: Database Connection ---
const uri = process.env.MONGO_URI; // Render will provide this value
const client = new MongoClient(uri);

let db;
async function connectToDB() {
    try {
        await client.connect();
        db = client.db("nexus_analytics_db"); // You can name your database anything
        console.log("Successfully connected to MongoDB Atlas.");
    } catch (err) {
        console.error("Failed to connect to MongoDB", err);
        process.exit(1);
    }
}

connectToDB();

// Serve static files from a 'public' directory
app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('A client connected:', socket.id);

    // Listen for real-time events from the game client
    socket.on('game_event', (eventData) => {
        if (!db) {
            console.error("Database not initialized. Cannot save event.");
            return;
        }
        
        // 1. Archive the event to the database
        db.collection('events').insertOne(eventData)
            .catch(err => console.error("Failed to insert event into DB", err));
        
        // 2. Broadcast the event to any connected dashboards (for future use)
        // For now, we just log it.
        // io.to('dashboard_room').emit('live_event', eventData);
        console.log('Received event:', eventData);
    });

    socket.on('disconnect', () => {
        console.log('A client disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});