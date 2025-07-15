// --- GLOBAL APP STATE ---
let gameState = {};
let appData = {};
let socket; // NEW: The WebSocket connection

// --- INITIALIZATION ---
function init() {
    document.getElementById('agree-btn').addEventListener('click', showInstructionsAndLoadData);
}

async function loadAppDataAndLoadData() {
    // ... (This function is now simpler as it doesn't need to fetch static data) ...
    document.getElementById('get-started-btn').addEventListener('click', showLoginScreen);
    document.getElementById('start-new-game-btn').addEventListener('click', startNewGame);
    // ... resume and close buttons
}

// --- GAME LOGIC ---
function startNewGame() {
    // ... (This function is mostly the same) ...
    
    // ** NEW: Connect to the WebSocket server **
    socket = io();

    loginScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    
    // ... The game starts by generating the first event locally or fetching it
}

// MODIFIED: The logAction function now EMITS the data instead of pushing to a local array
function logAction(event, choice, score) {
    const eventData = {
        timestamp: new Date().toISOString(),
        playerID: gameState.playerID,
        sessionID: gameState.sessionID,
        //... all other data points ...
    };

    // Send the data to the server in real-time
    if (socket) {
        socket.emit('game_event', eventData);
    }
}

// All other functions (renderEvent, showFinalSplash, etc.) are now much simpler.
// They no longer contain any fetch calls. The "Submit Data" button at the end
// now simply disconnects the socket and reloads the page.
