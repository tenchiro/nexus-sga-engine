require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const { MongoClient } = require('mongodb');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// --- Database Configuration ---
const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error("FATAL ERROR: MONGODB_URI is not defined.");
    process.exit(1);
}
const client = new MongoClient(uri);
const DB_NAME = 'nexus_sga_db_v2';
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

    socket.on('get_first_event', async (callback) => {
        console.log(`Server received 'get_first_event' from ${socket.id}.`);
        try {
            const eventsCollection = db.collection('test_events');
            // Fetch one random event from the test collection
            const eventCursor = await eventsCollection.aggregate([
                { $sample: { size: 1 } }
            ]);
            const event = await eventCursor.next();

            if (event) {
                const choicesCollection = db.collection('test_choices');
                const choicesCursor = await choicesCollection.find({ event_id: event.event_id });
                event.posts = await choicesCursor.toArray();
                
                console.log("Sending event to client:", event.event_code);
                if(callback) callback({ status: 'success', data: event });
            } else {
                 if(callback) callback({ status: 'error', message: 'No event found in test collection.' });
            }
        } catch (e) {
             console.error('Error fetching test event:', e);
             if(callback) callback({ status: 'error', message: 'Database error while fetching test event.' });
        }
    });

    socket.on('submit_final_data', async (sessionData) => {
        try {
            const resultsCollection = db.collection('test_sessions');
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
        console.log(`Nexus 2.0 (DB Test) server running on port ${PORT}`);
    });
});