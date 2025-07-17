document.addEventListener('DOMContentLoaded', () => {
    // --- GLOBAL APP STATE ---
    const socket = io();
    let gameState = {};

    // --- DOM Elements ---
    const loginScreen = document.getElementById('login-screen');
    const gameScreen = document.getElementById('game-screen');
    const consentCheckbox = document.getElementById('consent-checkbox');
    const startButton = document.getElementById('start-semester-btn');
    const weekDisplayEl = document.getElementById('week-display');
    const lifeEventZoneEl = document.getElementById('life-event-zone');
    const postOptionsZoneEl = document.getElementById('post-options-zone');
    const endGameSplashEl = document.getElementById('end-game-splash');

    // --- INITIALIZATION ---
    function init() {
        // This listener robustly controls the state of the "Begin" button.
        consentCheckbox.addEventListener('change', () => {
            startButton.disabled = !consentCheckbox.checked;
            if (consentCheckbox.checked) {
                startButton.style.backgroundColor = 'var(--green-accent)';
                startButton.textContent = 'Begin Semester';
            } else {
                startButton.style.backgroundColor = 'var(--tertiary-bg)';
                startButton.textContent = 'Agree to Consent to Begin';
            }
        });

        // Attach event listeners to the main action buttons.
        startButton.addEventListener('click', startNewGame);
        document.getElementById('replay-btn').addEventListener('click', () => {
            location.reload(); // The simplest way to restart the experience.
        });

        // Set the initial state of the button.
        startButton.disabled = true;
        startButton.textContent = 'Agree to Consent to Begin';
    }

    // --- GAME LOGIC ---

    // 1. Called when the player clicks "Begin Semester".
    function startNewGame() {
        const playerName = document.getElementById('player-name').value;
        if (!playerName) {
            alert("Please enter your name to begin.");
            return;
        }
        
        // Initialize the gameState object for this session.
        gameState = {
            playerID: `player_${Date.now()}`,
            playerName: playerName,
            informationTrail: []
        };
        
        // Transition the UI from the login screen to the game screen.
        loginScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');

        // Request the first event from the server via WebSocket.
        socket.emit('get_first_event', (response) => {
            if (response.status === 'success') {
                renderLifeEvent(response.data);
            } else {
                alert(`Error loading event: ${response.message}`);
            }
        });
    }

    // 2. Called when a player clicks on one of the post options.
    function handlePost(event, choice) {
        logAction(event, choice);
        showFinalSplash();
    }

    // 3. Renders the event data received from the server onto the page.
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
    }

    // 4. Ends the game, submits data, and shows the final modal.
    function showFinalSplash() {
        // Send the complete game state to the server for logging.
        socket.emit('submit_final_data', gameState);
        // Display the endgame modal.
        endGameSplashEl.classList.remove('hidden');
    }

    // 5. Records a player's action into the local gameState object.
    function logAction(event, choice) {
        gameState.informationTrail.push({
            timestamp: new Date().toISOString(),
            eventWeek: event.week,
            choiceText: choice.choice_text,
            choiceScore: choice.score,
        });
    }
    
    // Run the initialization function once the page is fully loaded.
    init();
});