require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

// The full 60 Life Events and 18 Gate Events data goes here.
// For brevity, I'm showing the structure with a few examples.
// The complete data should be copied from our previous conversation.

const lifeEventsData = [
    { event_id: 1, week_number: 1, event_code: 'MOVE_IN_DAY', event_text: 'First day on campus! Your dorm room is small but it\'s all yours. Your roommate, Leo, seems okay, but snores loudly.' },
    { event_id: 2, week_number: 1, event_code: 'PARENTS_LEAVING', event_text: 'Your parents just helped you move in. They\'re giving you one last hug before they drive off, and you can tell your Mom is trying not to cry.'},
    // ... insert all 60 life events here
];

const eventChoicesData = [
    { event_id: 1, choice_text: "My roommate Leo already driving me crazy. Snores like a freight train. Send help! 😫", score: -1 },
    { event_id: 1, choice_text: "Feels good to be here. Unpacking and settling in. Sent a private message to my family to let them know I'm safe.", score: 1 },
    { event_id: 1, choice_text: "Moved in! College life here I come! So excited. #NewBeginnings", score: 0 },
    { event_id: 2, choice_text: "They're gone. Finally free! #CollegeLife", score: -1 },
    { event_id: 2, choice_text: "And just like that, I'm on my own. A little scary, a little exciting.", score: 0 },
    { event_id: 2, choice_text: "Had to be strong for my parents, but wow, it's tough seeing them go. Called them as soon as they left to say I love them.", score: 1 },
    // ... insert all 180+ event choices here
];

// ... (similarly, create constants for gate_events and static_data)

async function run() {
  try {
    await client.connect();
    const db = client.db('nexus-sga-db');
    console.log("Connected to database...");

    console.log("Populating life_events...");
    await db.collection('life_events').deleteMany({});
    await db.collection('life_events').insertMany(lifeEventsData);

    console.log("Populating event_choices...");
    await db.collection('event_choices').deleteMany({});
    await db.collection('event_choices').insertMany(eventChoicesData);

    // ... (repeat for gate_events and static_data collections)

    console.log("Database population complete.");
  } finally {
    await client.close();
  }
}
run().catch(console.dir);