require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error("FATAL ERROR: MONGODB_URI is not defined.");
    process.exit(1);
}
const client = new MongoClient(uri);

const testEventsData = [
    { event_id: 1, event_code: 'TEST_EVENT_1', lifeEvent: 'You see a wallet on the ground. It seems to have a lot of cash in it.' },
    { event_id: 2, event_code: 'TEST_EVENT_2', lifeEvent: 'A classmate asks you for the answers to the homework assignment that is due in an hour.' }
];

const testChoicesData = [
    { event_id: 1, choice_text: "Turn it in to the campus lost and found.", score: 1 },
    { event_id: 1, choice_text: "Look around to see if anyone is watching.", score: 0 },
    { event_id: 1, choice_text: "Take the cash and leave the wallet.", score: -1 },
    { event_id: 2, choice_text: "Politely refuse, explaining that it would be dishonest.", score: 1 },
    { event_id: 2, choice_text: "Tell them you haven't finished it yet, even though you have.", score: 0 },
    { event_id: 2, choice_text: "Send them a copy of your answers. What are friends for?", score: -1 }
];

async function run() {
  try {
    await client.connect();
    const db = client.db('nexus_sga_db_v2');
    console.log("Connected to database...");

    // Clear previous test data
    await db.collection('test_events').deleteMany({});
    await db.collection('test_choices').deleteMany({});

    console.log("Populating test_events...");
    await db.collection('test_events').insertMany(testEventsData);

    console.log("Populating test_choices...");
    await db.collection('test_choices').insertMany(testChoicesData);

    console.log("Test database population complete.");
  } catch(e) {
    console.error("An error occurred during DB population:", e);
  } finally {
    await client.close();
  }
}

run();