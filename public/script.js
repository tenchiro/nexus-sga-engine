// This wrapper ensures the entire script runs only after the HTML page is fully loaded.
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
    const gameScreen = document.getElementById('game-screen');
    const scoreValueEl = document.getElementById('score-value');
    const weekDisplayEl = document.getElementById('week-display');
    const weatherDisplayEl = document.getElementById('weather-display');
    const lifeEventZoneEl = document.getElementById('life-event-zone');
    const postOptionsZoneEl = document.getElementById('post-options-zone');
    const proceedZoneEl = document.getElementById('proceed-zone');
    const gameContentEl = document.getElementById('game-content');
    const gateZoneEl = document.getElementById('gate-zone');
    const endGameSplashEl = document.getElementById('end-game-splash');
    const saveModalEl = document.getElementById('save-modal');
    const passkeyDisplayEl = document.getElementById('passkey-display');
    const gameFooter = document.getElementById('game-footer');

    // --- INITIALIZATION ---
    function init() {
        document.getElementById('agree-btn').addEventListener('click', loadAppDataAndShowInstructions);
    }

    async function loadAppDataAndShowInstructions() {
        const getStartedBtn = document.getElementById('start-semester-btn');
        consentScreen.classList.add('hidden');
        instructionsScreen.classList.remove('hidden');

        try {
            getStartedBtn.textContent = "Loading...";
            getStartedBtn.disabled = true;

            const response = await fetch('get_app_data.php'); // This PHP file will need to be re-created
            if (!response.ok) { throw new Error(`Network error! Status: ${response.status}`); }
            
            const data = await response.json();
            if (data.error) { throw new Error(`Server error: ${data.error}`); }
            appData = data;

            if (!appData.us_states || !appData.weather_data) {
                throw new Error("Essential app data is missing from the server's response.");
            }
            
            populateStates();
            getStartedBtn.addEventListener('click', showLoginScreen);
            document.getElementById('start-new-game-btn').addEventListener('click', startNewGame);
            document.getElementById('resume-game-btn').addEventListener('click', resumeGame); // Re-enabling for future
            document.getElementById('close-modal-btn').addEventListener('click', () => { location.reload(); });
            
            getStartedBtn.textContent = "Start Semester";
            getStartedBtn.disabled = false;

        } catch (error) {
            console.error("Initialization Failed:", error);
            getStartedBtn.textContent = "Error Loading!";
            alert(`Could not load game data. The backend service may be starting up. Please refresh in a moment.\n\nError: ${error.message}`);
        }
    }

    function populateStates() { /* ... unchanged ... */ }
    function showLoginScreen() { /* ... unchanged ... */ }

    // --- GAME LOGIC ---
    async function startNewGame() {
        const playerName = document.getElementById('player-name').value;
        if (!playerName) { alert("Please enter your name."); return; }
        
        gameState = {
            playerID: `player_${Date.now()}`,
            sessionID: 1,
            playerName: playerName,
            playerLocation: { city: document.getElementById('player-city').value, state: document.getElementById('player-state').value },
            currentWeek: 1,
            profileStrength: 0,
            gatesPassed: 0,
            hasSeenSaveInstruction: false
        };
        
        loginScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');
        updateScoreDisplay();
        connectToServerAndStart();
    }

    function connectToServerAndStart() {
        socket = io(); // Connect to the server
        fetchEvent(gameState.currentWeek);
    }
    
    // Resume/Save logic to be re-implemented with WebSockets later if needed. For now, it is disabled.
    function resumeGame() { alert("Resume feature is being redesigned!"); }
    function saveGame() { alert("Save feature is being redesigned!"); }

    async function fetchEvent(week) {
        // This function will now fetch from the WebSocket server in a future iteration
        // For now, we will simulate this by fetching from the existing PHP endpoints
        showLoadingIndicator(true);
        let endpoint = gateWeeks.includes(week) ? `get_gate_event.php?week=${week}` : `get_event.php?week=${week}`;
        try {
            const response = await fetch(endpoint);
            if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
            const event = await response.json();
            if (event.error) throw new Error(`Server error: ${event.error}`);
            
            gameState.currentEvent = event;
            if (gateWeeks.includes(week)) {
                renderGate(event);
            } else {
                renderLifeEvent(event);
            }
        } catch (error) {
            console.error(`Failed to fetch event for week ${week}:`, error);
            alert('Could not load the next event.');
        } finally {
            showLoadingIndicator(false);
        }
    }

    function proceedToNextWeek() {
        gameState.currentWeek++;
        if (gameState.currentWeek <= 20) {
            fetchEvent(gameState.currentWeek);
        } else {
            showFinalSplash();
        }
    }
    
    function handlePost(event, post) {
        gameState.profileStrength += post.score;
        logAction(event, post, post.score);
        updateScoreDisplay();
        
        document.querySelectorAll('.post-option').forEach(el => {
            el.style.pointerEvents = 'none';
            el.style.opacity = '0.5';
        });

        proceedZoneEl.innerHTML = `<button class="proceed-button">Proceed</button>`;
        proceedZoneEl.classList.remove('hidden');
        proceedZoneEl.querySelector('button').onclick = proceedToNextWeek; // Simplified logic
    }
        
    function renderLifeEvent(event) {
        gameContentEl.classList.remove('hidden');
        gateZoneEl.classList.add('hidden');
        proceedZoneEl.classList.add('hidden'); 

        weekDisplayEl.textContent = `Week ${event.week}`;
        weatherDisplayEl.textContent = appData.weather_data[event.week] || "☁️";
        lifeEventZoneEl.innerHTML = `<p>${event.lifeEvent}</p>`;
        
        postOptionsZoneEl.innerHTML = '';
        event.posts.forEach(post => {
            const postEl = document.createElement('div');
            postEl.classList.add('post-option');
            let postHTML = `<p>${post.choice_text}</p>`; 
            postEl.innerHTML = postHTML;
            postEl.onclick = () => handlePost(event, post);
            postOptionsZoneEl.appendChild(postEl);
        });
    }
    
    // All other functions like renderGate, handleGateChoice, showFinalSplash, logAction etc.
    // need to be refactored to use the socket.emit logic instead of fetch/local array push
    // For now, this provides the corrected startup sequence. The full game logic
    // will be implemented in the next step.

    // --- SCRIPT INITIALIZATION ---
    init();
});