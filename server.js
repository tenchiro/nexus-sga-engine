const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const { MongoClient } = require('mongodb');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

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

// Serve the static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// --- WebSocket Logic ---
io.on('connection', (socket) => {
    console.log('A client connected:', socket.id);

    // --- Listen for initial data request from client ---
    socket.on('request_initial_data', async (callback) => {
        try {
            const staticDataCursor = db.collection('static_data').find({});
            const app_data = {};
            await staticDataCursor.forEach(doc => {
                app_data[doc.data_key] = doc.data_value;
            });
            
            // Add gate logic data
            app_data.gates = { 3: { requiredScore: 2 }, 6: { requiredScore: 4 }, 10: { requiredScore: 7 }, 13: { requiredScore: 10 }, 16: { requiredScore: 13 }, 20: { requiredScore: 16 } };

            callback({ status: 'success', data: app_data });
        } catch (e) {
            console.error("Error fetching initial data:", e);
            callback({ status: 'error', message: 'Could not fetch initial data from DB.' });
        }
    });

    // --- Listen for event requests ---
    socket.on('request_event', async (week, callback) => {
        let collectionName = gateWeeks.includes(week) ? 'gate_events' : 'life_events';
        try {
            // MongoDB aggregation pipeline to get one random document
            const cursor = db.collection(collectionName).aggregate([
                { $match: { week_number: week } },
                { $sample: { size: 1 } }
            ]);
            const event = await cursor.next();

            if (event) {
                // If it's a life event, get its choices
                if (collectionName === 'life_events') {
                    const choicesCursor = db.collection('event_choices').find({ event_id: event.event_id });
                    event.posts = await choicesCursor.toArray();
                }
                callback({ status: 'success', data: event });
            } else {
                callback({ status: 'error', message: `No event found for week ${week}` });
            }
        } catch (e) {
            console.error(`Error fetching event for week ${week}:`, e);
            callback({ status: 'error', message: `DB error for week ${week}` });
        }
    });

    // --- Listen for analytics data submissions ---
    socket.on('submit_analytics', (data) => {
        if (!db) return;
        db.collection('nexus_game_sessions').insertOne(data)
            .catch(err => console.error("Failed to insert session data:", err));
    });

    // --- Listen for save game requests ---
    socket.on('save_game_state', async (gameState, callback) => {
        if (!db) return callback({ status: 'error', message: 'Database not connected.' });
        try {
            const token = require('crypto').randomBytes(4).toString('hex');
            const player_ip = socket.handshake.address;

            await db.collection('saved_sessions').insertOne({
                token: token,
                session_data: gameState,
                player_ip: player_ip,
                save_time: new Date()
            });
            callback({ status: 'success', token: token });
        } catch(e) {
            console.error("Save game error:", e);
            callback({ status: 'error', message: 'Failed to save session.' });
        }
    });

    // --- Listen for resume game requests ---
    socket.on('resume_game_state', async (token, callback) => {
        if (!db) return callback({ status: 'error', message: 'Database not connected.' });
        try {
            const player_ip = socket.handshake.address;
            const savedGame = await db.collection('saved_sessions').findOneAndDelete({
                token: token,
                player_ip: player_ip
            });

            if (savedGame) {
                callback({ status: 'success', data: savedGame.session_data });
            } else {
                callback({ status: 'error', message: 'Invalid or expired token.' });
            }
        } catch(e) {
            console.error("Resume game error:", e);
            callback({ status: 'error', message: 'Failed to resume session.' });
        }
    });

    socket.on('disconnect', () => {
        console.log('A client disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});