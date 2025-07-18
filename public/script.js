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
        loadAppData();
    }

    async function loadAppData() {
        const getStartedBtn = document.getElementById('get-started-btn');
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
            setupOnboarding();
            getStartedBtn.textContent = "Let's Go";
            getStartedBtn.disabled = false;
        });
    }

    function setupOnboarding() {
        document.getElementById('agree-btn').addEventListener('click', showInstructionsScreen);
        document.getElementById('get-started-btn').addEventListener('click', showLoginScreen);
    }
    
    function populateStates() {
        const stateSelect = document.getElementById('player-state');
        stateSelect.innerHTML = ''; // Clear previous options
        appData.us_states.forEach(state => {
            const option = document.createElement('option');
            option.value = state.abbr;
            option.textContent = state.name;
            stateSelect.appendChild(option);
        });
        stateSelect.value = 'IN'; 
    }

    function showInstructionsScreen() {
        document.getElementById('consent-screen').classList.add('hidden');
        instructionsScreen.classList.remove('hidden');
    }

    function showLoginScreen() {
        instructionsScreen.classList.add('hidden');
        loginScreen.classList.remove('hidden');
        populateStates();
        
        const consentCheckbox = document.getElementById('consent-checkbox');
        const startButton = document.getElementById('start-new-game-btn');
        startButton.disabled = !consentCheckbox.checked;

        consentCheckbox.addEventListener('change', () => {
            startButton.disabled = !consentCheckbox.checked;
        });

        document.getElementById('start-new-game-btn').addEventListener('click', startNewGame);
        document.getElementById('resume-game-btn').addEventListener('click', resumeGame);
        document.getElementById('close-modal-btn').addEventListener('click', () => location.reload());
    }

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
            if (response.status === 'error') { alert(`Error loading event: ${response.message}`); return; }
            gameState.currentEvent = response.data; 
            renderLifeEvent(response.data);
        });
    }

    function fetchGateEvent(week) {
         socket.emit('get_gate_event', week, (response) => {
            if (response.status === 'error') { alert(`Error loading event: ${response.message}`); return; }
            gameState.currentGateEvent = response.data; 
            renderGate(response.data);
        });
    }

    function postLifeEventAction() {
        if (gateWeeks.includes(gameState.currentWeek)) {
            fetchGateEvent(gameState.currentWeek);
        } else {
            proceedToNextWeek();
        }
    }

    function proceedToNextWeek() {
        gameState.currentWeek++;
        if (gameState.currentWeek <= 20) {
            fetchLifeEvent(gameState.currentWeek);
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
        proceedZoneEl.querySelector('button').onclick = postLifeEventAction;
    }
        
    function renderLifeEvent(event) {
        gameContentEl.classList.remove('hidden');
        gateZoneEl.classList.add('hidden');
        proceedZoneEl.classList.add('hidden'); 

        weekDisplayEl.textContent = `Week ${event.week}`;
        dateDisplayEl.textContent = ``; 
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

    function renderGate(event) {
        const gateInfo = appData.gates[event.week_number]; 
        gameContentEl.classList.add('hidden');
        gateZoneEl.classList.remove('hidden');

        const hasSufficientScore = gameState.profileStrength >= gateInfo.requiredScore;
        const leakTitle = event.leak_title;
        const leakContent = hasSufficientScore ? event.leak_content : event.puff_content;
        
        gateZoneEl.innerHTML = `
            <div class="game-section private-message-zone">
                <p class="section-title">Private Message</p>
                <div class="message-bubble">
                    <p><strong>From: ${event.sender_from}</strong></p>
                    <p>${event.sender_text}</p>
                    <div class="news-clipping ${hasSufficientScore ? '' : 'puff-piece'}">
                        <h4>${leakTitle}</h4>
                        <p><em>${leakContent}</em></p>
                    </div>
                    <div class="message-choices">
                        <button id="take-note-btn">${event.positive_response}</button>
                        <button id="ignore-btn">${event.negative_response}</button>
                    </div>
                    <div id="gate-actions-zone" class="post-choice-actions hidden"></div>
                </div>
            </div>`;
        
        document.getElementById('take-note-btn').onclick = () => handleGateChoice(event, 1);
        document.getElementById('ignore-btn').onclick = () => handleGateChoice(event, 0);
    }

    function handleGateChoice(event, score) {
        gameState.profileStrength += score;
        if (score > 0) gameState.gatesPassed++;
        logAction(event, null, score);
        updateScoreDisplay();
        
        gateZoneEl.querySelectorAll('.message-choices button').forEach(b => {
            b.disabled = true;
            b.style.opacity = 0.6;
        });

        const actionsZone = document.getElementById('gate-actions-zone');
        let resumeTextHTML = '';
        if (!gameState.hasSeenSaveInstruction) {
            resumeTextHTML = `<p class="save-instruction-text">resume later with a Passkey</p>`;
            gameState.hasSeenSaveInstruction = true;
        }

        actionsZone.innerHTML = `
            <button class="proceed-button" onclick="proceedToNextWeek()">Proceed</button>
            <button class="save-progress-button" onclick="saveGame()">Take a Break</button>
            ${resumeTextHTML}
        `;
        actionsZone.classList.remove('hidden');
    }

    function showFinalSplash() {
        let splashHTML = '';
        const finalGate = appData.gates[20];
        const success = finalGate && gameState.profileStrength >= finalGate.requiredScore;

        if (success) {
            splashHTML = `<h2>BREAKING NEWS: Nexus Whistleblower Exposes All</h2><p>Documents confirm Nexus intentionally amplifies divisive content to maximize user engagement. Your journey has shown you the truth. You saw the signals everyone else missed.</p><p style="text-align:center; margin-top: 20px; color: var(--green-accent);"><strong>CONGRATULATIONS! You have completed Level 0.</strong></p>`;
        } else {
             splashHTML = `<h2>NEWS REPORT: Nexus Stock Hits All-Time High</h2><p>Analysts credit the company's highly sophisticated algorithm for its ability to keep users on the platform longer than any competitor. The system works as intended. The Protocol remains unchallenged.</p><p style="text-align:center; margin-top: 20px; color: var(--red-accent);"><strong>LEVEL FAILED. TRY AGAIN.</strong></p>`;
        }
        
        splashHTML += `<hr style="border-color: var(--tertiary-bg); margin: 20px 0;">
                       <div id="end-game-buttons">
                           <button id="submit-data-btn" class="modal-button">Finish & Submit Data</button>
                           <button id="home-button" class="modal-button hidden">Return to Home</button>
                       </div>`;
        
        endGameSplashEl.querySelector('.modal-content').innerHTML = splashHTML;
        endGameSplashEl.classList.remove('hidden');
        
        document.getElementById('submit-data-btn').onclick = () => {
            const submitButton = document.getElementById('submit-data-btn');
            submitButton.textContent = "Submitting...";
            submitButton.disabled = true;

            socket.emit('submit_final_data', gameState.informationTrail);

            setTimeout(() => {
                submitButton.textContent = "Data Submitted!";
                document.getElementById('home-button').classList.remove('hidden');
            }, 500);
        };

        document.getElementById('home-button').onclick = () => { location.reload(); };
    }

    function logAction(event, choice, score) {
        gameState.informationTrail.push({
            timestamp: new Date().toISOString(), playerID: gameState.playerID, sessionID: gameState.sessionID,
            eventWeek: event.week || event.week_number, 
            eventID: event.event_id || event.gate_id, 
            choiceText: choice ? choice.choice_text : (score > 0 ? "Chose positive response" : "Chose negative response"),
            choiceScore: score, currentProfileStrength: gameState.profileStrength,
        });
    }

    function updateScoreDisplay() {
        scoreValueEl.textContent = gameState.profileStrength;
    }
    
    initApp();
});