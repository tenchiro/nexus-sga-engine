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
const DB_NAME = 'nexus_sga_db_production'; // Using a new DB for production
let db;

// --- FULL DATA SETS FOR POPULATION ---
const lifeEventsData = [ /* Paste the full 65 life events array here */ ];
const eventChoicesData = [ /* Paste the full 195+ event choices array here */ ];
const gateEventsData = [ /* Paste the full 18 gate events array here */ ];
const staticData = [ /* Paste the full static data array (states, weather, etc.) here */ ];

// --- Database Functions ---
async function populateDatabaseIfNeeded() {
    const configCollection = db.collection('app_config');
    const flag = await configCollection.findOne({ status: 'populated_v2' });

    if (!flag) {
        console.log("Database not populated. Running one-time production setup...");
        
        await db.collection('life_events').deleteMany({});
        await db.collection('life_events').insertMany(lifeEventsData);

        await db.collection('event_choices').deleteMany({});
        await db.collection('event_choices').insertMany(eventChoicesData);

        await db.collection('gate_events').deleteMany({});
        await db.collection('gate_events').insertMany(gateEventsData);
        
        await db.collection('static_data').deleteMany({});
        await db.collection('static_data').insertMany(staticData);
        
        await configCollection.insertOne({ status: 'populated_v2', populated_at: new Date() });
        console.log("Production database population complete.");
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
            console.log(`Nexus 2.0 Production Server running on port ${PORT}`);
        });
    } catch (e) {
        console.error("Could not start server", e);
        process.exit(1);
    }
}

app.use(express.static('public'));

// --- WebSocket Logic ---
io.on('connection', (socket) => {
    // ... (This contains the full, combined logic from our previous final versions)
    // It will handle 'get_app_data', 'get_event', 'get_gate_event', 'submit_final_data', 'save_game', and 'resume_game'
});

connectToDbAndStartServer();