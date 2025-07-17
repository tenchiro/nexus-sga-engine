require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const { MongoClient } = require('mongodb');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- Database Configuration ---
const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error("FATAL ERROR: MONGODB_URI is not defined. Please check your Render environment variables.");
    process.exit(1);
}
const client = new MongoClient(uri);
const DB_NAME = 'nexus-sga-db'; // We can still use the same DB
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

// --- Serve the public folder ---
app.use(express.static('public'));

// --- WebSocket Logic ---
io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Listen for a test click event from the client
    socket.on('test_click', async (data) => {
        console.log(`Received test_click from ${socket.id} with message: ${data.message}`);
        
        try {
            const testCollection = db.collection('test_clicks');
            const newClick = {
                clientId: socket.id,
                message: data.message,
                timestamp: new Date()
            };
            
            await testCollection.insertOne(newClick);
            console.log("Successfully wrote to database.");

            // Send a success confirmation back to the client
            socket.emit('server_confirmation', {
                status: 'Success',
                message: `Click logged to database at ${newClick.timestamp.toLocaleTimeString()}`
            });

        } catch (e) {
            console.error('Database write error:', e);
            // Send an error confirmation back to the client
            socket.emit('server_confirmation', {
                status: 'Error',
                message: 'Failed to write to the database. Check server logs.'
            });
        }
    });

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
    });
});

// --- Start Server ---
const PORT = process.env.PORT || 3000;
connectToDb().then(() => {
    server.listen(PORT, () => {
        console.log(`Test server running on port ${PORT}`);
    });
});