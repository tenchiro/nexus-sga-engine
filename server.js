// File to change: /root/nexus-server/server.js
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const uri = "mongodb+srv://nexus_user:exCOArJTnu6mtTIY@cluster0.by3we68.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(uri);

async function connectToDatabase() { try { await client.connect(); console.log("Connected to MongoDB Atlas"); } catch (e) { console.error("Error connecting to MongoDB Atlas:", e); } }
connectToDatabase();

const db = () => client.db('nexus');

app.get('/api/initialData', async (req, res) => {
    try {
        const lifeEvents = await db().collection('lifeEvents').find({}).toArray();
        const postChoices = await db().collection('postChoices').find({}).toArray();
        const gateEvents = await db().collection('gateEvents').find({}).toArray();
        const staticData = await db().collection('staticData').find({}).toArray();
        
        const weatherData = staticData.find(d => d.data_key === 'weather_data');
        const adjectives = staticData.find(d => d.data_key === 'adjectives');
        const nouns = staticData.find(d => d.data_key === 'nouns');
        const usStates = staticData.find(d => d.data_key === 'us_states');
        
        res.json({ 
            lifeEvents, postChoices, gateEvents, 
            weather_data: weatherData ? weatherData.data_value : {},
            adjectives: adjectives ? adjectives.data_value : [],
            nouns: nouns ? nouns.data_value : [],
            us_states: usStates ? usStates.data_value : []
        });
    } catch (error) { res.status(500).send({ message: 'Failed to load initial data' }); }
});

app.post('/api/users', async (req, res) => {
    const { name, city, state } = req.body;
    if (!name) return res.status(400).send({ message: 'Name is required' });
    try {
        let user = await db().collection('users').findOne({ name: name, city: city, state: state });
        let totalReplays = 0;
        if (!user) {
            const result = await db().collection('users').insertOne({ name: name, city: city, state: state, totalReplays: 1 });
            user = { _id: result.insertedId, name: name, city: city, state: state, totalReplays: 1 };
            totalReplays = 1;
        } else {
            const updateResult = await db().collection('users').findOneAndUpdate(
                { _id: user._id },
                { $inc: { totalReplays: 1 } },
                { returnDocument: 'after' }
            );
            user = updateResult.value;
            totalReplays = user.totalReplays;
        }

        const sessionResult = await db().collection('gameplaySessions').insertOne({
            userId: user._id, sessionNumber: totalReplays, passkey: null,
            currentWeek: 1, ethics: 0, awareness: 0, status: 'in-progress', startTime: new Date()
        });
        const newSession = {
            _id: sessionResult.insertedId, userId: user._id, sessionNumber: totalReplays,
            currentWeek: 1, ethics: 0, awareness: 0, passkey: null
        };
        res.json({ user: user, session: newSession });
    } catch (error) {
        console.error("Error creating user or session:", error);
        res.status(500).send({ message: 'Error creating user or session' });
    }
});

app.post('/api/resumeGame', async (req, res) => {
    const { passkey } = req.body;
    if (!passkey) return res.status(400).send({ message: 'Passkey is required' });
    try {
        const session = await db().collection('gameplaySessions').findOne(
            { passkey: passkey.toLowerCase(), status: 'in-progress' }
        );
        if (!session) return res.status(404).send({ message: 'Invalid or expired Passkey. Please try again.' });
        
        const user = await db().collection('users').findOne({ _id: session.userId });
        if (!user) {
            console.error("Orphaned session found:", session);
            return res.status(500).send({ message: 'Associated user not found for session.' });
        }
        res.json({ user: user, session: session });
    } catch (error) {
        console.error("Error resuming game:", error);
        res.status(500).send({ message: 'Error resuming game' });
    }
});

app.post('/api/submitChoice', async (req, res) => {
    const { sessionId, choiceId } = req.body;
    if (!sessionId || !choiceId) return res.status(400).send({ message: 'Session ID and Choice ID are required' });
    try {
        const choice = await db().collection('postChoices').findOne({ _id: new ObjectId(choiceId) });
        if (!choice) return res.status(404).send({ message: 'Choice not found.' });
        const result = await db().collection('gameplaySessions').findOneAndUpdate(
            { _id: new ObjectId(sessionId) },
            { $inc: { ethics: choice.score } },
            { returnDocument: 'after' }
        );
        if (!result.value) return res.status(404).send({ message: 'Gameplay session not found.' });
        res.json({ ethics: result.value.ethics, awareness: result.value.awareness });
    } catch (error) {
        console.error("Error submitting choice:", error);
        res.status(500).send({ message: 'Error submitting choice' });
    }
});

app.post('/api/submitGateChoice', async (req, res) => {
    const { sessionId, score } = req.body;
    if (!sessionId || score === undefined) return res.status(400).send({ message: 'Session ID and score are required' });
    try {
        const result = await db().collection('gameplaySessions').findOneAndUpdate(
            { _id: new ObjectId(sessionId) },
            { $inc: { awareness: score } },
            { returnDocument: 'after' }
        );
        if (!result.value) return res.status(404).send({ message: 'Gameplay session not found.' });
        res.json({ ethics: result.value.ethics, awareness: result.value.awareness });
    } catch (error) {
        console.error("Error submitting gate choice:", error);
        res.status(500).send({ message: 'Error submitting gate choice' });
    }
});

app.get('/api/newsFlash/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    if (!sessionId) return res.status(400).send({ message: 'Session ID is required' });
    try {
        const session = await db().collection('gameplaySessions').findOne({ _id: new ObjectId(sessionId) });
        if (!session) return res.status(404).send({ message: 'Gameplay session not found.' });
        const { ethics, awareness } = session;
        let outcome = 'puff_news';
        if (ethics >= 16 && awareness >= 6) { outcome = 'true_ending'; } 
        else if (ethics >= 11 && awareness >= 4) { outcome = 'rumor_news'; }
        res.json({ outcome: outcome });
    } catch (error) {
        console.error("Error generating News Flash:", error);
        res.status(500).send({ message: 'Error generating News Flash' });
    }
});

app.post('/api/saveGame', async (req, res) => {
    const { sessionId, currentWeek, ethics, awareness, isFinalSave } = req.body;
    if (!sessionId) return res.status(400).send({ message: 'Session ID is required' });
    try {
        const staticData = await db().collection('staticData').find({}).toArray();
        const adjectives = staticData.find(d => d.data_key === 'adjectives').data_value;
        const nouns = staticData.find(d => d.data_key === 'nouns').data_value;
        const session = await db().collection('gameplaySessions').findOne({ _id: new ObjectId(sessionId) });
        if (!session) return res.status(404).send({ message: 'Gameplay session not found for saving.' });
        
        let passkeyToUse = session.passkey;
        if (!passkeyToUse) {
            const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
            const noun = nouns[Math.floor(Math.random() * nouns.length)];
            const num = Math.floor(Math.random() * 10);
            passkeyToUse = `${adj}-${noun}-${num}`.toLowerCase();
        }
        
        const resumeWeek = isFinalSave ? 1 : currentWeek + 1;

        const updateDoc = {
            $set: {
                currentWeek: resumeWeek,
                ethics: ethics, awareness: awareness,
                lastSaveTime: new Date(), passkey: passkeyToUse
            }
        };
        
        if (isFinalSave) {
            updateDoc.$set.status = 'completed';
            updateDoc.$set.endTime = new Date();
        }
        
        await db().collection('gameplaySessions').updateOne({ _id: new ObjectId(sessionId) }, updateDoc);
        res.json({ passkey: passkeyToUse });
    } catch (error) {
        console.error("Error saving game:", error);
        res.status(500).send({ message: 'Error saving game' });
    }
});

app.listen(port, () => {
    console.log(`Nexus server listening at http://localhost:${port}`);
});
