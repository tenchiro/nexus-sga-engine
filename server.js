// --- SGA Core Engine - Real-Time Server ---
// Load environment variables from a .env file
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
    console.error("FATAL ERROR: MONGODB_URI is not defined. Please check your .env file.");
    process.exit(1);
}
const client = new MongoClient(uri);
const DB_NAME = 'nexus-sga-db';

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

// --- Serve Static Files from 'public' directory ---
app.use(express.static('public'));

// --- WebSocket Connection Logic ---
io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('get_app_data', async (callback) => {
        try {
            const staticDataCollection = db.collection('static_data');
            const dataCursor = await staticDataCollection.find({});
            const appData = {};
            for await (const doc of dataCursor) {
                appData[doc.data_key] = doc.data_value;
            }
            callback({ status: 'success', data: appData });
        } catch (e) {
            console.error('Error fetching app data:', e);
            callback({ status: 'error', message: 'Could not load app data from database.' });
        }
    });

    socket.on('get_event', async (week, callback) => {
        try {
            const eventsCollection = db.collection('life_events');
            const eventCursor = await eventsCollection.aggregate([
                { $match: { week_number: week } },
                { $sample: { size: 1 } }
            ]);
            const event = await eventCursor.next();

            if (event) {
                const choicesCollection = db.collection('event_choices');
                const choicesCursor = await choicesCollection.find({ event_id: event.event_id });
                event.posts = await choicesCursor.toArray();
                callback({ status: 'success', data: event });
            } else {
                 callback({ status: 'error', message: `No event found for week ${week}` });
            }
        } catch (e) {
             console.error(`Error fetching event for week ${week}:`, e);
             callback({ status: 'error', message: 'Database error while fetching event.' });
        }
    });
    
    socket.on('get_gate_event', async (week, callback) => {
        try {
            const gatesCollection = db.collection('gate_events');
            const gateCursor = await gatesCollection.aggregate([
                { $match: { week_number: week } },
                { $sample: { size: 1 } }
            ]);
            const gateEvent = await gateCursor.next();

            if(gateEvent) {
                callback({ status: 'success', data: gateEvent });
            } else {
                callback({ status: 'error', message: `No gate event found for week ${week}` });
            }
        } catch (e) {
             console.error(`Error fetching gate event for week ${week}:`, e);
             callback({ status: 'error', message: 'Database error while fetching gate event.' });
        }
    });
    
    socket.on('live_event_stream', async (eventData) => {
        try {
            const sessionsCollection = db.collection('live_sessions');
            await sessionsCollection.updateOne(
                { playerID: eventData.playerID, sessionID: eventData.sessionID },
                { 
                    $push: { informationTrail: eventData.eventLog },
                    $set: { 
                        playerName: eventData.playerName,
                        lastUpdated: new Date()
                    }
                },
                { upsert: true }
            );
        } catch (e) {
            console.error('Error logging live event:', e);
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
        console.log(`SGA Core Engine server running on port ${PORT}`);
    });
});