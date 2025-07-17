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

// --- Data to be Populated ---
const testEventsData = [
    { event_id: 1, event_code: 'TEST_EVENT_1', lifeEvent: 'You see a wallet on the ground. It seems to have a lot of cash in it.' },
    { event_id: 2, event_code: 'TEST_EVENT_2', lifeEvent: 'A classmate asks you for the answers to the homework assignment that is due in an hour.' }
];
const testChoicesData = [
    { event_id: 1, choice_text: "Turn it in to the campus lost and found.", score: 1 }, { event_id: 1, choice_text: "Look around to see if anyone is watching.", score: 0 }, { event_id: 1, choice_text: "Take the cash and leave the wallet.", score: -1 },
    { event_id: 2, choice_text: "Politely refuse, explaining that it would be dishonest.", score: 1 }, { event_id: 2, choice_text: "Tell them you haven't finished it yet, even though you have.", score: 0 }, { event_id: 2, choice_text: "Send them a copy of your answers. What are friends for?", score: -1 }
];

// --- Database Functions ---
async function populateDatabaseIfNeeded() {
    const configCollection = db.collection('app_config');
    const flag = await configCollection.findOne({ status: 'populated' });

    if (!flag) {
        console.log("Database not populated. Running one-time setup...");
        
        await db.collection('test_events').deleteMany({});
        await db.collection('test_choices').deleteMany({});
        
        await db.collection('test_events').insertMany(testEventsData);
        await db.collection('test_choices').insertMany(testChoicesData);
        
        await configCollection.insertOne({ status: 'populated', populated_at: new Date() });
        console.log("Database population complete.");
    } else {
        console.log("Database is already populated. Skipping setup.");
    }
}

async function connectToDbAndStartServer() {
    try {
        await client.connect();
        db = client.db(DB_NAME);
        console.log("Successfully connected to MongoDB.");

        await populateDatabaseIfNeeded();

        const PORT = process.env.PORT || 3000;
        server.listen(PORT, () => {
            console.log(`Nexus 2.0 (DB Test) server running on port ${PORT}`);
        });

    } catch (e) {
        console.error("Could not start server", e);
        process.exit(1);
    }
}

// --- Server and WebSocket Logic ---
app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);
    socket.on('get_first_event', async (callback) => {
        try {
            const eventsCollection = db.collection('test_events');
            const eventCursor = await eventsCollection.aggregate([{ $sample: { size: 1 } }]);
            const event = await eventCursor.next();

            if (event) {
                const choicesCollection = db.collection('test_choices');
                const choicesCursor = await choicesCollection.find({ event_id: event.event_id });
                event.posts = await choicesCursor.toArray();
                if(callback) callback({ status: 'success', data: event });
            } else {
                 if(callback) callback({ status: 'error', message: 'No event found.' });
            }
        } catch (e) {
             console.error('Error fetching test event:', e);
             if(callback) callback({ status: 'error', message: 'Database error.' });
        }
    });
    // ... other socket listeners like 'submit_final_data' remain the same
});

// --- Start Application ---
connectToDbAndStartServer();