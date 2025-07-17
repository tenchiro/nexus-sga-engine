document.addEventListener('DOMContentLoaded', () => {
    // --- GLOBAL APP STATE & CONNECTION ---
    // This explicitly tells the client where the server is.
    const SERVER_URL = "https://nexus-analytics-server.onrender.com";
    const socket = io(SERVER_URL);
    
    let gameState = {};
    let appData = {}; 
    const gateWeeks = [3, 6, 10, 13, 16, 20];

    // --- DOM Elements ---
    const consentScreen = document.getElementById('consent-screen');
    const instructionsScreen = document.getElementById('instructions-screen');
    const loginScreen = document.getElementById('login-screen');
    const gameScreen = document.getElementById('game-screen');
    const scoreValueEl = document.getElementById('score-value');
    const weekDisplayEl = document.getElementById('week-display');
    const dateDisplayEl = document.getElementById('date-display');
    const weatherDisplayEl = document.getElementById('weather-display');
    const lifeEventZoneEl = document.getElementById('life-event-zone');
    const postOptionsZoneEl = document.getElementById('post-options-zone');
    const proceedZoneEl = document.getElementById('proceed-zone');
    const gameContentEl = document.getElementById('game-content');
    const gateZoneEl = document.getElementById('gate-zone');
    const endGameSplashEl = document.getElementById('end-game-splash');
    const saveModalEl = document.getElementById('save-modal');
    const passkeyDisplayEl = document.getElementById('passkey-display');

    // --- INITIALIZATION ---
    function initApp() {
        document.getElementById('agree-btn').addEventListener('click', loadAppDataAndShowInstructions);
    }

    function loadAppDataAndShowInstructions() {
        const getStartedBtn = document.getElementById('get-started-btn');
        consentScreen.classList.add('hidden');
        instructionsScreen.classList.remove('hidden');
        
        getStartedBtn.textContent = "Loading Game Data...";
        getStartedBtn.disabled = true;

        socket.emit('client:request_app_data', (response) => {
            if (response.status === 'error') {
                getStartedBtn.textContent = "Error Loading!";
                alert(`Could not load essential game data: ${response.message}`);
                return;
            }
            
            appData = response.data;
            if (!appData.us_states || !appData.weather_data || !appData.adjectives) {
                 alert("Essential app data is missing from server response.");
                 return;
            }

            populateStates();
            getStartedBtn.addEventListener('click', showLoginScreen);
            document.getElementById('start-new-game-btn').addEventListener('click', startNewGame);
            document.getElementById('resume-game-btn').addEventListener('click', resumeGame);
            document.getElementById('close-modal-btn').addEventListener('click', () => location.reload());

            getStartedBtn.textContent = "Let's Go";
            getStartedBtn.disabled = false;
        });
    }

    function populateStates() { /* ... unchanged ... */ }
    function showLoginScreen() { /* ... unchanged ... */ }

    // --- GAME LOGIC ---
    function startNewGame() {
        const playerName = document.getElementById('player-name').value;
        const consentChecked = document.getElementById('consent-checkbox').checked;
        if (!playerName) { alert("Please enter your name."); return; }
        if (!consentChecked) { alert("You must agree to the terms to participate."); return; }
        
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
        fetchLifeEvent(gameState.currentWeek);
    }

    function resumeGame() {
        const token = document.getElementById('passkey-input').value;
        if (!token) { alert("Please enter a Passkey."); return; }
        
        socket.emit('resume_game', token, (response) => {
            if(response.status === 'error') {
                alert(`Could not resume game: ${response.message}`);
                return;
            }
            gameState = response.data;
            gameState.sessionID++;

            loginScreen.classList.add('hidden');
            gameScreen.classList.remove('hidden');
            updateScoreDisplay();
            
            proceedToNextWeek();
        });
    }

    function saveGame() {
        socket.emit('save_game', gameState, (response) => {
            if(response.status === 'error') {
                alert(`Could not save game: ${response.message}`);
                return;
            }
            passkeyDisplayEl.textContent = response.token;
            saveModalEl.classList.remove('hidden');
        });
    }

    function fetchLifeEvent(week) {
        socket.emit('get_event', week, (response) => {
            if (response.status === 'error') { /* ... */ return; }
            gameState.currentEvent = response.data; 
            renderLifeEvent(response.data);
        });
    }

    function fetchGateEvent(week) {
         socket.emit('get_gate_event', week, (response) => {
            if (response.status === 'error') { /* ... */ return; }
            gameState.currentGateEvent = response.data; 
            renderGate(response.data);
        });
    }

    function postLifeEventAction() { /* ... unchanged ... */ }
    function proceedToNextWeek() { /* ... unchanged ... */ }
    function handlePost(event, post) { /* ... unchanged ... */ }
    function renderLifeEvent(event) { /* ... unchanged ... */ }
    function renderGate(event) { /* ... unchanged ... */ }
    function handleGateChoice(event, score) { /* ... unchanged ... */ }
    function showFinalSplash() { /* ... unchanged ... */ }
    function logAction(event, choice, score) { /* ... unchanged ... */ }
    function updateScoreDisplay() { /* ... unchanged ... */ }

    initApp();
});