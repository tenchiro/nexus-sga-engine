document.addEventListener('DOMContentLoaded', () => {
    // --- GLOBAL APP STATE & CONNECTION ---
    const socket = io();
    let gameState = {};
    let appData = {}; 
    const gateWeeks = [3, 6, 10, 13, 16, 20];

    // --- DOM Elements ---
    const onboardingScreen = document.getElementById('onboarding-screen');
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
        loadAppData();
    }

    async function loadAppData() {
        beginSemesterBtn.textContent = "Loading Game Data...";
        beginSemesterBtn.disabled = true;

        socket.emit('client:request_app_data', (response) => {
            if (response.status === 'error') {
                beginSemesterBtn.textContent = "Error Loading!";
                alert(`Could not load essential game data: ${response.message}`);
                return;
            }
            appData = response.data;
            if (!appData.us_states || !appData.weather_data || !appData.adjectives) {
                 alert("Essential app data is missing from server response.");
                 return;
            }
            // THE FIX: Setup the listeners only AFTER data has arrived.
            setupOnboardingListeners();
        });
    }

    function setupOnboardingListeners() {
        // Set initial state now that data is loaded
        beginSemesterBtn.disabled = !startConsentCheckbox.checked;
        beginSemesterBtn.textContent = startConsentCheckbox.checked ? 'Begin Semester' : 'Agree and Consent to Begin';
        if (startConsentCheckbox.checked) beginSemesterBtn.classList.add('is-active');

        // Now, attach the listener for future clicks
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
    
    function populateStates() { /* ... unchanged ... */ }

    function showLoginScreen() {
        onboardingScreen.classList.add('hidden');
        loginScreen.classList.remove('hidden');
        populateStates();
        
        document.getElementById('start-new-game-btn').addEventListener('click', startNewGame);
        document.getElementById('resume-game-btn').addEventListener('click', resumeGame);
        document.getElementById('close-modal-btn').addEventListener('click', () => location.reload());
        // Handle the new consent checkbox on the login screen
        const loginConsentCheckbox = document.getElementById('login-consent-checkbox');
        const startGameButton = document.getElementById('start-new-game-btn');
        if (loginConsentCheckbox) {
            startGameButton.disabled = !loginConsentCheckbox.checked;
            loginConsentCheckbox.addEventListener('change', () => {
                startGameButton.disabled = !loginConsentCheckbox.checked;
            });
        }
    }

    // --- GAME LOGIC (All functions below are unchanged from the final, complete version) ---
    function startNewGame() { /* ... */ }
    function resumeGame() { /* ... */ }
    function saveGame() { /* ... */ }
    async function fetchLifeEvent(week) { /* ... */ }
    async function fetchGateEvent(week) { /* ... */ }
    function postLifeEventAction() { /* ... */ }
    function proceedToNextWeek() { /* ... */ }
    function handlePost(event, post) { /* ... */ }
    function renderLifeEvent(event) { /* ... */ }
    function renderGate(event) { /* ... */ }
    function handleGateChoice(event, score) { /* ... */ }
    function showFinalSplash() { /* ... */ }
    function logAction(event, choice, score) { /* ... */ }
    function updateScoreDisplay() { /* ... */ }
    
    initApp();
});