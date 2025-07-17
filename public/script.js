document.addEventListener('DOMContentLoaded', () => {
    const debugOutput = document.getElementById('debug-output');
    const log = (message) => {
        console.log(message);
        debugOutput.textContent = message;
    };
    log("DOM loaded. Script starting.");

    // --- THE FIX ---
    // **REPLACE THIS URL with the public URL of YOUR Render Web Service**
    const SERVER_URL = "https://nexus-game.onrender.com/";
    // ----------------
    
    log(`Attempting to connect to server at: ${SERVER_URL}`);
    const socket = io(SERVER_URL);

    //... The rest of the file is IDENTICAL to the previous Diagnostic version ...

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

    function handlePost(event, choice) {
        log(`Choice made: ${choice.choice_text}`);
        logAction(event, choice);
        showFinalSplash();
    }

    function renderLifeEvent(event) {
        weekDisplayEl.textContent = `Week ${event.week}`;
        lifeEventZoneEl.innerHTML = `<p>${event.lifeEvent}</p>`;
        
        postOptionsZoneEl.innerHTML = '';
        event.posts.forEach(post => {
            const postEl = document.createElement('div');
            postEl.classList.add('post-option');
            postEl.innerHTML = `<p>${post.choice_text}</p>`; 
            postEl.onclick = () => handlePost(event, post);
            postOptionsZoneEl.appendChild(postEl);
        });
        log("Life event rendered successfully.");
    }

    function showFinalSplash() {
        log("Submitting final data and showing endgame screen.");
        socket.emit('submit_final_data', gameState);
        endGameSplashEl.classList.remove('hidden');
    }

    function logAction(event, choice) {
        gameState.informationTrail.push({
            timestamp: new Date().toISOString(),
            eventWeek: event.week,
            choiceText: choice.choice_text,
            choiceScore: choice.score,
        });
    }
    
    init();
});