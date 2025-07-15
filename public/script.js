document.addEventListener('DOMContentLoaded', () => {

    // --- GLOBAL APP STATE ---
    let gameState = {};
    let appData = {}; 
    let socket;
    const gateWeeks = [3, 6, 10, 13, 16, 20];

    // --- DOM Elements ---
    const consentScreen = document.getElementById('consent-screen');
    const instructionsScreen = document.getElementById('instructions-screen');
    const loginScreen = document.getElementById('login-screen');
    // ... all other DOM element constants are the same

    // --- INITIALIZATION ---
    function init() {
        document.getElementById('agree-btn').addEventListener('click', showInstructionsScreen);
    }

    function showInstructionsScreen() {
        consentScreen.classList.add('hidden');
        instructionsScreen.classList.remove('hidden');
        document.getElementById('start-semester-btn').addEventListener('click', showLoginScreen);
    }

    function showLoginScreen() {
        instructionsScreen.classList.add('hidden');
        loginScreen.classList.remove('hidden');
        document.getElementById('start-new-game-btn').addEventListener('click', startNewGame);
        document.getElementById('resume-game-btn').addEventListener('click', resumeGame);
    }

    // --- GAME LOGIC ---
    function startNewGame() {
        const playerName = document.getElementById('player-name').value;
        const consentChecked = document.getElementById('consent-checkbox').checked;
        if (!playerName) { alert("Please enter your name."); return; }
        if (!consentChecked) { alert("You must check the box to agree to participate."); return; }
        
        gameState = {
            playerID: `player_${Date.now()}`, sessionID: 1, playerName: playerName,
            playerLocation: { city: document.getElementById('player-city').value, state: document.getElementById('player-state').value },
            currentWeek: 1, profileStrength: 0, gatesPassed: 0, 
            hasSeenSaveInstruction: false,
            informationTrail: []
        };
        
        loginScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');
        updateScoreDisplay();
        connectToServerAndStart();
    }

    function connectToServerAndStart() {
        socket = io(); // Connects to the server that served the file
        
        socket.on('connect', () => {
            console.log("Connected to server with ID:", socket.id);
            fetchEvent(gameState.currentWeek);
        });

        socket.on('connect_error', (err) => {
            alert("Connection to the server failed. Please refresh the page.");
            console.error("Connection Error:", err.message);
        });
    }
    
    function fetchEvent(week) {
        if (!socket) return;
        showLoadingIndicator(true);
        socket.emit('request_event', week, (response) => {
            showLoadingIndicator(false);
            if (response.status === 'success') {
                gameState.currentEvent = response.data;
                if (gateWeeks.includes(week)) {
                    renderGate(response.data);
                } else {
                    renderLifeEvent(response.data);
                }
            } else {
                alert(`Error: ${response.message}`);
            }
        });
    }

    function proceedToNextWeek() {
        gameState.currentWeek++;
        if (gameState.currentWeek <= 20) {
            fetchEvent(gameState.currentWeek);
        } else {
            showFinalSplash();
        }
    }

    // --- All other functions (handlePost, renderLifeEvent, handleGateChoice, etc.) are largely the same ---
    // --- The key difference is they now call proceedToNextWeek() or fetchEvent() ---
    
    function logAction(event, choice, score) {
        const eventData = {
            timestamp: new Date().toISOString(), playerID: gameState.playerID, sessionID: gameState.sessionID,
            eventWeek: event.week_number, eventID: event.event_id,
            choiceText: choice ? choice.choice_text : (score > 0 ? "Chose positive response" : "Chose negative response"),
            choiceScore: score, currentProfileStrength: gameState.profileStrength,
        };
        if(socket) socket.emit('game_event', eventData);
        gameState.informationTrail.push(eventData); // Also keep a local copy for the final batch upload
    }

    // --- And so on... The full, complete script is needed ---

    init();
});