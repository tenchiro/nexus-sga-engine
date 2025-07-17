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
    // Logic for enabling/disabling the start button based on consent
    consentCheckbox.addEventListener('change', () => {
        if (consentCheckbox.checked) {
            startButton.disabled = false;
        } else {
            startButton.disabled = true;
        }
    });

    startButton.addEventListener('click', startNewGame);
    document.getElementById('replay-btn').addEventListener('click', () => {
        location.reload();
    });
}

// --- GAME LOGIC ---
function startNewGame() {
    const playerName = document.getElementById('player-name').value;
    if (!playerName) {
        alert("Please enter your name to begin.");
        return;
    }
    
    gameState = {
        playerID: `player_${Date.now()}`,
        playerName: playerName,
        informationTrail: []
    };
    
    loginScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');

    // Request the first event from the server
    socket.emit('get_first_event', (response) => {
        if (response.status === 'success') {
            renderLifeEvent(response.data);
        } else {
            alert(`Error loading event: ${response.message}`);
        }
    });
}

function handlePost(event, choice) {
    // Log the choice
    logAction(event, choice);
    // End the game
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
}

function showFinalSplash() {
    // Send final data to server
    socket.emit('submit_final_data', gameState);
    // Show the endgame screen
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

// --- SCRIPT INITIALIZATION ---
init();