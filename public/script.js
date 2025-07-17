document.addEventListener('DOMContentLoaded', () => {
    const debugOutput = document.getElementById('debug-output');
    const log = (message) => {
        console.log(message);
        debugOutput.textContent = message;
    };
    log("DOM loaded. Script starting.");

    const socket = io();
    log("Socket object created.");

    socket.on('connect', () => { log("STATUS: Successfully connected to server."); });
    socket.on('connect_error', (err) => { log(`ERROR: Connection failed!\nReason: ${err.message}`); });

    const loginScreen = document.getElementById('login-screen');
    const gameScreen = document.getElementById('game-screen');
    const consentCheckbox = document.getElementById('consent-checkbox');
    const startButton = document.getElementById('start-semester-btn');
    const weekDisplayEl = document.getElementById('week-display');
    const lifeEventZoneEl = document.getElementById('life-event-zone');
    const postOptionsZoneEl = document.getElementById('post-options-zone');
    const endGameSplashEl = document.getElementById('end-game-splash');

    function init() {
        log("Initializing event listeners...");
        consentCheckbox.addEventListener('change', () => { startButton.disabled = !consentCheckbox.checked; });
        startButton.addEventListener('click', startNewGame);
        document.getElementById('replay-btn').addEventListener('click', () => { location.reload(); });
        startButton.disabled = true;
        log("Initialization complete. Waiting for consent.");
    }

    // This listener now waits for the specific response from the server
    socket.on('server:send_event', (response) => {
        log("Received 'server:send_event' from server.");
        if (response && response.status === 'success') {
            log("Response is SUCCESS. Rendering event.");
            renderLifeEvent(response.data);
        } else {
            log(`ERROR: Server response was not successful.\n${JSON.stringify(response)}`);
            alert(`Error loading event: ${response ? response.message : 'No response from server.'}`);
        }
    });

    function startNewGame() {
        const playerName = document.getElementById('player-name').value;
        if (!playerName) { alert("Please enter your name to begin."); return; }
        log(`Starting game for ${playerName}...`);
        
        gameState = { playerID: `player_${Date.now()}`, playerName: playerName, informationTrail: [] };
        
        loginScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');

        log("Emitting 'client:request_event' to server...");
        socket.emit('client:request_event');
    }

    function handlePost(event, choice) { /* ... unchanged ... */ }
    function renderLifeEvent(event) { /* ... unchanged ... */ }
    function showFinalSplash() { /* ... unchanged ... */ }
    function logAction(event, choice) { /* ... unchanged ... */ }
    
    init();
});