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

const uri = process.env.MONGODB_URI;
if (!uri) { console.error("FATAL ERROR: MONGODB_URI is not defined."); process.exit(1); }
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

io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // --- THIS IS THE CORRECTED LOGIC ---
    socket.on('client:request_app_data', async () => {
        try {
            const staticDataCollection = db.collection('static_data');
            const dataCursor = await staticDataCollection.find({});
            const appData = {};
            for await (const doc of dataCursor) {
                appData[doc.data_key] = doc.data_value;
            }
            appData['gates'] = { 3: { requiredScore: 2 }, 6: { requiredScore: 4 }, 10: { requiredScore: 7 }, 13: { requiredScore: 10 }, 16: { requiredScore: 13 }, 20: { requiredScore: 16 } };
            
            // Explicitly emit the response back to the client
            socket.emit('server:send_app_data', { status: 'success', data: appData });
        } catch (e) {
            console.error('Error fetching app data:', e);
            socket.emit('server:send_app_data', { status: 'error', message: 'Could not load app data from database.' });
        }
    });

    socket.on('get_event', async (week, callback) => {
        try {
            const eventsCollection = db.collection('life_events');
            const eventCursor = await eventsCollection.aggregate([{ $match: { week_number: week } }, { $sample: { size: 1 } }]);
            const event = await eventCursor.next();
            if (event) {
                const choicesCollection = db.collection('event_choices');
                event.posts = await choicesCollection.find({ event_id: event.event_id }).toArray();
                if(callback) callback({ status: 'success', data: event });
            } else {
                if(callback) callback({ status: 'error', message: `No event found for week ${week}` });
            }
        } catch (e) { if(callback) callback({ status: 'error', message: 'Database error fetching event.' }); }
    });
    
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
        } catch (e) { if(callback) callback({ status: 'error', message: 'Database error fetching gate event.' }); }
    });
    
    socket.on('submit_final_data', async (sessionData) => {
        try {
            await db.collection('completed_sessions').insertOne(sessionData);
            console.log(`Saved session for player: ${sessionData.playerID}`);
        } catch (e) { console.error('Database write error:', e); }
    });

    socket.on('save_game', async (gameStateData, callback) => {
        try {
            const token = crypto.randomBytes(16).toString('hex');
            const savedSessionsCollection = db.collection('saved_sessions');
            await savedSessionsCollection.insertOne({ token: token, session_data: gameStateData, player_ip: socket.handshake.address, save_time: new Date() });
            if(callback) callback({ status: 'success', token: token });
        } catch (e) { if(callback) callback({ status: 'error', message: 'Failed to save session.' }); }
    });

    socket.on('resume_game', async (token, callback) => {
        try {
            const savedSessionsCollection = db.collection('saved_sessions');
            const findResult = await savedSessionsCollection.findOneAndDelete({ token: token, player_ip: socket.handshake.address });
            if (findResult) {
                if(callback) callback({ status: 'success', data: findResult.session_data });
            } else {
                if(callback) callback({ status: 'error', message: 'Invalid or expired Passkey.' });
            }
        } catch (e) { if(callback) callback({ status: 'error', message: 'An error occurred while resuming the game.' }); }
    });

    socket.on('disconnect', () => { console.log(`Client disconnected: ${socket.id}`); });
});

connectToDbAndStartServer();