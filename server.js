require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const { MongoClient } = require('mongodb');
const cors = require('cors');
const crypto = require('crypto');

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
const DB_NAME = 'nexus_sga_db_production';
let db;

async function connectToDbAndStartServer() {
    try {
        await client.connect();
        db = client.db(DB_NAME);
        console.log("Successfully connected to MongoDB.");

        const PORT = process.env.PORT || 3000;
        server.listen(PORT, () => {
            console.log(`Nexus 2.0 Production Server running on port ${PORT}`);
        });
    } catch (e) {
        console.error("Could not start server", e);
        process.exit(1);
    }
}

app.use(express.static('public'));

// --- WebSocket Connection Logic ---
io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Handles the initial request for static game data (states, weather, etc.)
    socket.on('client:request_app_data', async (callback) => {
        try {
            const staticDataCollection = db.collection('static_data');
            const dataCursor = await staticDataCollection.find({});
            const appData = {};
            for await (const doc of dataCursor) {
                appData[doc.data_key] = doc.data_value;
            }
            if (callback) callback({ status: 'success', data: appData });
        } catch (e) {
            console.error('Error fetching app data:', e);
            if (callback) callback({ status: 'error', message: 'Could not load app data from database.' });
        }
    });

    // Fetches a random Life Event for a given week
    socket.on('get_event', async (week, callback) => {
        try {
            const eventsCollection = db.collection('life_events');
            const eventCursor = await eventsCollection.aggregate([{ $match: { week_number: week } }, { $sample: { size: 1 } }]);
            const event = await eventCursor.next();

            if (event) {
                const choicesCollection = db.collection('event_choices');
                const choicesCursor = await choicesCollection.find({ event_id: event.event_id });
                event.posts = await choicesCursor.toArray();
                if(callback) callback({ status: 'success', data: event });
            } else {
                 if(callback) callback({ status: 'error', message: `No event found for week ${week}` });
            }
        } catch (e) {
             if(callback) callback({ status: 'error', message: 'Database error while fetching event.' });
        }
    });
    
    // Fetches a random Gate Event for a given week
    socket.on('get_gate_event', async (week, callback) => {
        try {
            const gatesCollection = db.collection('gate_events');
            const gateCursor = await gatesCollection.aggregate([{ $match: { week_number: week } }, { $sample: { size: 1 } }]);
            const gateEvent = await gateCursor.next();

            if(gateEvent) {
                if(callback) callback({ status: 'success', data: gateEvent });
            } else {
                if(callback) callback({ status: 'error', message: `No gate event found for week ${week}` });
            }
        } catch (e) {
             if(callback) callback({ status: 'error', message: 'Database error while fetching gate event.' });
        }
    });
    
    // Submits the final session data for archival
    socket.on('submit_final_data', async (sessionData) => {
        try {
            const resultsCollection = db.collection('completed_sessions');
            await resultsCollection.insertOne(sessionData);
            console.log(`Saved session for player: ${sessionData.playerID}`);
        } catch (e) {
            console.error('Database write error:', e);
        }
    });

    // Saves a game state and returns a secure, single-use token
    socket.on('save_game', async (gameStateData, callback) => {
        try {
            const token = crypto.randomBytes(16).toString('hex');
            const player_ip = socket.handshake.address;

            const savedSessionsCollection = db.collection('saved_sessions');
            await savedSessionsCollection.insertOne({
                token: token,
                session_data: gameStateData,
                player_ip: player_ip,
                save_time: new Date()
            });
            
            if(callback) callback({ status: 'success', token: token });
        } catch (e) {
            console.error('Error saving game:', e);
            if(callback) callback({ status: 'error', message: 'Failed to save session.' });
        }
    });

    // Resumes a game using a secure token, then deletes the token
    socket.on('resume_game', async (token, callback) => {
        try {
            const player_ip = socket.handshake.address;
            const savedSessionsCollection = db.collection('saved_sessions');
            
            const savedState = await savedSessionsCollection.findOneAndDelete({ token: token, player_ip: player_ip });

            if (savedState.value) {
                if(callback) callback({ status: 'success', data: savedState.value.session_data });
            } else {
                if(callback) callback({ status: 'error', message: 'Invalid or expired Passkey.' });
            }
        } catch (e) {
            console.error('Error resuming game:', e);
            if(callback) callback({ status: 'error', message: 'An error occurred while resuming the game.' });
        }
    });

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
    });
});

// --- Start Application ---
connectToDbAndStartServer();