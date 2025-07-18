document.addEventListener('DOMContentLoaded', () => {
    // --- GLOBAL APP STATE & CONNECTION ---
    const socket = io();
    let gameState = {};
    let appData = {}; 
    const gateWeeks = [3, 6, 10, 13, 16, 20];

    // --- DOM Elements ---
    const instructionsScreen = document.getElementById('instructions-screen');
    const loginScreen = document.getElementById('login-screen');
    const gameScreen = document.getElementById('game-screen');
    const startConsentCheckbox = document.getElementById('start-consent-checkbox');
    const beginSemesterBtn = document.getElementById('begin-semester-btn');
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
        // This is the main entry point
        loadAppData();
    }

    async function loadAppData() {
        socket.emit('client:request_app_data', (response) => {
            if (response.status === 'error') {
                alert(`Could not load essential game data: ${response.message}`);
                return;
            }
            appData = response.data;
            if (!appData.us_states || !appData.weather_data || !appData.adjectives) {
                 alert("Essential app data is missing from server response.");
                 return;
            }
            // Once data is loaded, set up the interactive elements
            setupOnboarding();
        });
    }

    function setupOnboarding() {
        beginSemesterBtn.textContent = "Agree and Consent to Begin"; // Set initial text
        beginSemesterBtn.disabled = true;

        startConsentCheckbox.addEventListener('change', () => {
            beginSemesterBtn.disabled = !startConsentCheckbox.checked;
            if (startConsentCheckbox.checked) {
                beginSemesterBtn.classList.add('is-active');
                beginSemesterBtn.textContent = 'Begin Semester';
            } else {
                beginSemesterBtn.classList.remove('is-active');
                beginSemesterBtn.textContent = 'Agree and Consent to Begin';
            }
        });
        
        beginSemesterBtn.addEventListener('click', showLoginScreen);
    }

    function populateStates() {
        const stateSelect = document.getElementById('player-state');
        appData.us_states.forEach(state => {
            const option = document.createElement('option');
            option.value = state.abbr;
            option.textContent = state.name;
            stateSelect.appendChild(option);
        });
        stateSelect.value = 'IN'; 
    }

    function showLoginScreen() {
        instructionsScreen.classList.add('hidden');
        loginScreen.classList.remove('hidden');
        populateStates(); // Populate states when this screen becomes active
        document.getElementById('start-new-game-btn').addEventListener('click', startNewGame);
        document.getElementById('resume-game-btn').addEventListener('click', resumeGame);
        document.getElementById('close-modal-btn').addEventListener('click', () => location.reload());
    }

    // --- GAME LOGIC (Functions below are the same as the last version) ---
    function startNewGame() { /* ... unchanged ... */ }
    function resumeGame() { /* ... unchanged ... */ }
    function saveGame() { /* ... unchanged ... */ }
    async function fetchLifeEvent(week) { /* ... unchanged ... */ }
    async function fetchGateEvent(week) { /* ... unchanged ... */ }
    function postLifeEventAction() { /* ... unchanged ... */ }
    function proceedToNextWeek() { /* ... unchanged ... */ }
    function handlePost(event, post) { /* ... unchanged ... */ }
    function renderLifeEvent(event) { /* ... unchanged ... */ }
    function renderGate(event) { /* ... unchanged ... */ }
    function handleGateChoice(event, score) { /* ... unchanged ... */ }
    function showFinalSplash() { /* ... unchanged ... */ }
    function logAction(event, choice, score) { /* ... unchanged ... */ }
    function updateScoreDisplay() { /* ... unchanged ... */ }
    
    // --- SCRIPT INITIALIZATION ---
    initApp();
});