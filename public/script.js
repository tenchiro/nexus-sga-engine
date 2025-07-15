// This wrapper ensures the entire script runs only after the HTML page is fully loaded.
document.addEventListener('DOMContentLoaded', () => {

    // --- GLOBAL APP STATE ---
    let gameState = {};
    let appData = {}; 
    let prefetchedEvent = null; 
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

            const response = await fetch('get_app_data.php');
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Network error! Status: ${response.status}, Response: ${errorText}`);
            }
            
            const data = await response.json();
            if (data.error) {
                throw new Error(`Server error: ${data.error}`);
            }

            appData = data;
            
            if (!appData.us_states || !appData.weather_data || !appData.adjectives) {
                throw new Error("Essential app data is missing from the server's response.");
            }
            
            populateStates();
            getStartedBtn.addEventListener('click', showLoginScreen);
            document.getElementById('start-new-game-btn').addEventListener('click', startNewGame);
            document.getElementById('resume-game-btn').addEventListener('click', resumeGame);
            document.getElementById('close-modal-btn').addEventListener('click', () => { location.reload(); });
            
            getStartedBtn.textContent = "Start Semester";
            getStartedBtn.disabled = false;

        } catch (error) {
            console.error("Initialization Failed:", error);
            getStartedBtn.textContent = "Error Loading!";
            alert(`Could not load essential game data. Please contact the administrator.\n\nError: ${error.message}`);
        }
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
    }

    // --- GAME LOGIC ---
    async function startNewGame() {
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
        
        await fetchEvent(1);
        renderLifeEvent(prefetchedEvent);
    }

    async function resumeGame() {
        const passkey = document.getElementById('passkey-input').value;
        if (!passkey) { alert("Please enter a Passkey."); return; }
        
        try {
            const response = await fetch('resume_game.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: passkey })
            });
            if (!response.ok) throw new Error(`Network response was not ok`);
            
            const savedState = await response.json();
            if (savedState.status === 'error') {
                throw new Error(savedState.message);
            }

            gameState = savedState;
            gameState.sessionID++;

            loginScreen.classList.add('hidden');
            gameScreen.classList.remove('hidden');
            updateScoreDisplay();
            
            await proceedToNextWeek();
        } catch (error) {
            console.error("Resume failed:", error);
            alert(`Could not resume game: ${error.message}`);
        }
    }

    async function saveGame() {
        try {
            const response = await fetch('save_game.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(gameState)
            });
            if (!response.ok) throw new Error(`Network response was not ok`);
            
            const result = await response.json();
            if (result.status === 'error') {
                throw new Error(result.message);
            }

            passkeyDisplayEl.textContent = result.token;
            saveModalEl.classList.remove('hidden');

        } catch (error) {
            console.error("Save failed:", error);
            alert(`Could not save game: ${error.message}`);
        }
    }

    async function fetchEvent(week) {
        if (week > 20) {
            prefetchedEvent = { isEnd: true };
            return;
        }
        showLoadingIndicator(true);
        let endpoint = `get_event.php?week=${week}`;
        try {
            const response = await fetch(endpoint);
            if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
            prefetchedEvent = await response.json();
            if (prefetchedEvent.error) throw new Error(`Server error: ${prefetchedEvent.error}`);
        } catch (error) {
            console.error(`Failed to fetch event for week ${week}:`, error);
            alert('Could not load the next event. Please check your connection or contact the administrator.');
            prefetchedEvent = null; 
        } finally {
            showLoadingIndicator(false);
        }
    }

    async function fetchGateEvent(week) {
         try {
            const response = await fetch(`get_gate_event.php?week=${week}`);
            if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
            const event = await response.json();
            if (event.error) throw new Error(`Server error: ${event.error}`);
            
            gameState.currentGateEvent = event; 
            renderGate(event);

        } catch (error) {
            console.error('Failed to fetch gate event:', error);
            alert('Could not load the next event. Please check your connection or contact the administrator.');
        }
    }

    function postLifeEventAction() {
        if (gateWeeks.includes(gameState.currentWeek)) {
            fetchGateEvent(gameState.currentWeek);
        } else {
            proceedToNextWeek();
        }
    }

    async function proceedToNextWeek() {
        gameState.currentWeek++;
        
        await fetchEvent(gameState.currentWeek);

        if (prefetchedEvent && prefetchedEvent.isEnd) {
            showFinalSplash();
        } else if (prefetchedEvent) {
            renderLifeEvent(prefetchedEvent);
        } else {
            alert("Cannot proceed because the next event could not be loaded.");
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

        fetchEvent(event.week + 1);
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
        // ... (This function is the same as the previous version)
    }

    function logAction(event, choice, score) {
        // ... (This function is the same as the previous version)
    }

    function updateScoreDisplay() {
        scoreValueEl.textContent = gameState.profileStrength;
    }

    function showLoadingIndicator(show) {
        // ... (This function is the same as the previous version)
    }

    // --- SCRIPT INITIALIZATION ---
    init();

}); // End of DOMContentLoaded wrapper
