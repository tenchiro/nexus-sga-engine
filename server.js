const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const { MongoClient } = require('mongodb');

const app = express();
const server = http.createServer(app);

// Configure Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for simplicity in beta
    methods: ["GET", "POST"]
  }
});

// Serve static files from the 'public' directory
app.use(express.static('public'));

// --- Database Connection ---
const uri = process.env.MONGO_URI; 
if (!uri) {
    console.error("FATAL ERROR: MONGO_URI environment variable not set.");
    process.exit(1);
}
const client = new MongoClient(uri);

let db;
async function connectToDB() {
    try {
        await client.connect();
        db = client.db("nexus_analytics_db");
        console.log("Successfully connected to MongoDB Atlas.");
    } catch (err) {
        console.error("Failed to connect to MongoDB", err);
        process.exit(1);
    }
}

connectToDB();

// --- WebSocket Logic ---
io.on('connection', (socket) => {
    console.log('A client connected:', socket.id);

    // Listen for real-time events from the game client
    socket.on('game_event', (eventData) => {
        if (!db) {
            console.error("Database not initialized. Cannot save event.");
            return;
        }
        
        // Archive the event to the 'events' collection in our database
        db.collection('events').insertOne(eventData)
            .catch(err => console.error("Failed to insert event into DB:", err));
        
        // Log for debugging
        console.log(`Received event from ${eventData.playerID}:`, eventData.eventID);
    });

    socket.on('disconnect', () => {
        console.log('A client disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});