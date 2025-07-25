// File to change: /root/nexus-server/public/script.js

// --- GLOBAL APP STATE ---
let gameState = {};
let gameData = { lifeEvents: [], postChoices: [], gateEvents: [], weather_data: {}, us_states: [] };
const gateWeeks = [3, 6, 10, 13, 16, 20];

// --- DOM Elements ---
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
const gameFooter = document.getElementById('game-footer');
const endGameSplashEl = document.getElementById('end-game-splash');
const saveModalEl = document.getElementById('save-modal');
const startButton = document.getElementById('start-new-game-btn');
const consentCheckbox = document.getElementById('consent-checkbox');
const timeDisplayEl = document.getElementById('time-display');
const stateSelect = document.getElementById('player-state');

// --- INITIALIZATION ---
function initApp() {
    const resumeButton = document.getElementById('resume-game-btn');
    const passkeyInput = document.getElementById('passkey-input');
    
    fetchInitialStaticData();
    
    startButton.disabled = true;
    resumeButton.disabled = true;

    consentCheckbox.addEventListener('change', () => {
        if (consentCheckbox.checked) {
            startButton.disabled = false;
            startButton.classList.add('active-green');
        } else {
            startButton.disabled = true;
            startButton.classList.remove('active-green');
        }
    });

    passkeyInput.addEventListener('input', () => {
        resumeButton.disabled = passkeyInput.value.length < 5;
    });

    stateSelect.addEventListener('change', () => {
        stateSelect.classList.remove('placeholder');
    });

    startButton.addEventListener('click', startNewGame);
    resumeButton.addEventListener('click', resumeGame);
    updateTime();
}

async function fetchInitialStaticData() {
    try {
        const dataResponse = await fetch('/api/initialData');
        if (!dataResponse.ok) throw new Error('Failed to fetch initial static data.');
        gameData = await dataResponse.json();
        populateStates();
    } catch (error) {
        console.error("Critical error fetching static data:", error);
    }
}

function updateTime() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    timeDisplayEl.textContent = `${hours}:${minutes} ${ampm}`;
}

function populateStates() {
    stateSelect.innerHTML = '';
    
    const defaultOption = document.createElement('option');
    defaultOption.value = "";
    defaultOption.textContent = "State";
    defaultOption.disabled = true;
    defaultOption.selected = true;
    stateSelect.appendChild(defaultOption);
    stateSelect.classList.add('placeholder');

    if (gameData.us_states && gameData.us_states.length > 0) {
        gameData.us_states.forEach(state => {
            const option = document.createElement('option');
            option.value = state.abbr;
            option.textContent = state.name;
            stateSelect.appendChild(option);
        });
    }
}

// --- GAME LOGIC ---
async function startNewGame() {
    const playerName = document.getElementById('player-name').value;
    const playerCity = document.getElementById('player-city').value;
    const playerState = document.getElementById('player-state').value;

    if (!playerName || !playerCity || !playerState) { alert("Please fill in your Name, City, and State."); return; }
    if (!consentCheckbox.checked) { alert("You must agree to participate."); return; }
    
    try {
        const userResponse = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: playerName, city: playerCity, state: playerState })
        });
        if (!userResponse.ok) throw new Error('Failed to create user.');
        const data = await userResponse.json();
        gameState = {
            sessionId: data.session._id,
            currentWeek: 1,
            ethics: 0,
            awareness: 0,
            passkey: null,
            playerName: data.user.name,
            totalReplays: data.user.totalReplays
        };
        loginScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');
        updateScoreDisplay();
        renderLifeEvent(1);
        setInterval(updateTime, 60000);
    } catch (error) { alert(`Could not start game: ${error.message}`); }
}

async function resumeGame() {
    const passkey = document.getElementById('passkey-input').value;
    if (!passkey) { alert("Please enter a Passkey."); return; }
    try {
        const resumeResponse = await fetch('/api/resumeGame', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ passkey: passkey })
        });
        if (!resumeResponse.ok) { const err = await resumeResponse.json(); throw new Error(err.message || 'Invalid Passkey.'); }
        const data = await resumeResponse.json();
        
        gameState = {
            sessionId: data.session._id,
            currentWeek: data.session.currentWeek,
            ethics: data.session.ethics,
            awareness: data.session.awareness,
            passkey: data.session.passkey,
            playerName: data.user.name,
            totalReplays: data.user.totalReplays
        };
        
        loginScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');
        updateScoreDisplay();
        renderLifeEvent(gameState.currentWeek);
        setInterval(updateTime, 60000);
    } catch (error) { alert(`Could not resume game: ${error.message}`); }
}

function calculateDate(weekNumber) {
    const startDate = new Date('2024-08-19');
    let date = new Date(startDate.setDate(startDate.getDate() + (weekNumber - 1) * 7));
    if (weekNumber === 20) {
        date = new Date('2024-12-25');
    }
    const month = date.toLocaleString('default', { month: 'short' });
    const day = date.getDate();
    return `${month} ${day}`;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function renderLifeEvent(weekNumber) {
    if (weekNumber > 20) { showFinalSplash(); return; }
    const weekEvents = gameData.lifeEvents.filter(event => event.week_number === weekNumber);
    if (!weekEvents.length) { showFinalSplash(); return; }
    const lifeEvent = weekEvents[Math.floor(Math.random() * weekEvents.length)];
    
    const choices = gameData.postChoices.filter(choice => choice.event_id === lifeEvent.event_id);
    const shuffledChoices = shuffleArray(choices);
    gateZoneEl.classList.add('hidden');
    gameContentEl.classList.remove('hidden');
    weekDisplayEl.textContent = `Week ${lifeEvent.week_number}`;
    dateDisplayEl.textContent = calculateDate(lifeEvent.week_number);
    weatherDisplayEl.innerHTML = gameData.weather_data[lifeEvent.week_number] || '...';
    lifeEventZoneEl.innerHTML = `<p>${lifeEvent.event_text}</p>`;
    postOptionsZoneEl.innerHTML = '';
    shuffledChoices.forEach(choice => {
        const postEl = document.createElement('div');
        postEl.classList.add('post-option');
        postEl.innerHTML = `<p>${choice.choice_text}</p>`;
        postEl.onclick = () => handlePost(choice._id);
        postOptionsZoneEl.appendChild(postEl);
    });
    proceedZoneEl.classList.add('hidden');
}

async function handlePost(choiceId) {
    document.querySelectorAll('.post-option').forEach(el => { el.style.pointerEvents = 'none'; el.style.opacity = '0.6'; });
    showLoadingIndicator(true);
    try {
        const response = await fetch('/api/submitChoice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: gameState.sessionId, choiceId: choiceId })
        });
        if (!response.ok) throw new Error('Server responded with an error.');
        const result = await response.json();
        showLoadingIndicator(false);
        gameState.ethics = result.ethics;
        gameState.awareness = result.awareness;
        updateScoreDisplay();
        proceedZoneEl.innerHTML = `<button class="proceed-button">Proceed</button>`;
        proceedZoneEl.classList.remove('hidden');
        proceedZoneEl.querySelector('button').onclick = postLifeEventAction;
    } catch (error) {
        showLoadingIndicator(false);
        document.querySelectorAll('.post-option').forEach(el => { el.style.pointerEvents = 'auto'; el.style.opacity = '1'; });
    }
}

function postLifeEventAction() { if (gateWeeks.includes(gameState.currentWeek)) { renderGateEvent(gameState.currentWeek); } else { proceedToNextWeek(); } }
function proceedToNextWeek() { gameState.currentWeek++; renderLifeEvent(gameState.currentWeek); }

function renderGateEvent(weekNumber) {
    const weekGateEvents = gameData.gateEvents.filter(event => event.week_number === weekNumber);
    if (!weekGateEvents.length) { proceedToNextWeek(); return; }
    const gateEvent = weekGateEvents[Math.floor(Math.random() * weekGateEvents.length)];

    const showLeak = (gameState.ethics + gameState.awareness) > 0;
    const clippingClass = showLeak ? 'leak' : 'puff-piece';
    const showTakeBreakButton = (weekNumber < 20); 
    const resumeText = (weekNumber === 3) ? `<p class="save-instruction-text">resume later with a Passkey</p>` : '';

    const gateHTML = `
        <div class="private-message-zone">
            <p class="section-title">Private Message</p>
            <div class="message-bubble">
                <p><strong>From: ${gateEvent.sender_from}</strong></p>
                <p>${gateEvent.sender_text}</p>
                <div class="news-clipping ${clippingClass}">
                    <h4>${gateEvent.leak_title}</h4>
                    <p>${showLeak ? gateEvent.leak_content : gateEvent.puff_content}</p>
                </div>
                <div class="message-choices"></div>
            </div>
            <div id="gate-actions-zone" class="hidden">
                <button class="proceed-button">Proceed</button>
                ${showTakeBreakButton ? `<button class="save-progress-button" onclick="saveGame()">Take a Break</button>` : ''}
                ${resumeText}
            </div>
        </div>
    `;
    gameContentEl.classList.add('hidden');
    gateZoneEl.innerHTML = gateHTML;
    gateZoneEl.classList.remove('hidden');
    
    const choicesContainer = gateZoneEl.querySelector('.message-choices');
    const gateChoices = [
        { text: gateEvent.positive_response, score: 1 },
        { text: gateEvent.negative_response, score: 0 }
    ];
    shuffleArray(gateChoices).forEach(choice => {
        const button = document.createElement('button');
        button.textContent = choice.text;
        button.onclick = () => handleGateChoice(choice.score);
        choicesContainer.appendChild(button);
    });
}

async function handleGateChoice(score) {
    document.querySelectorAll('.message-choices button').forEach(button => { button.style.pointerEvents = 'none'; button.style.opacity = '0.6'; });
    showLoadingIndicator(true);
    try {
        const response = await fetch('/api/submitGateChoice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: gameState.sessionId, score: score })
        });
        if (!response.ok) throw new Error('Server responded with an error on gate choice.');
        const result = await response.json();
        showLoadingIndicator(false);
        gameState.ethics = result.ethics;
        gameState.awareness = result.awareness;
        updateScoreDisplay();
        const actionsZone = document.getElementById('gate-actions-zone');
        actionsZone.classList.remove('hidden');
        actionsZone.querySelector('.proceed-button').onclick = proceedToNextWeek;
    } catch (error) {
        showLoadingIndicator(false);
    }
}

async function saveGame(isFinalSave = false) {
    showLoadingIndicator(true);
    try {
        const response = await fetch('/api/saveGame', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                sessionId: gameState.sessionId, currentWeek: gameState.currentWeek,
                ethics: gameState.ethics, awareness: gameState.awareness,
                isFinalSave: isFinalSave
            })
        });
        if (!response.ok) throw new Error('Could not save game to server.');
        const result = await response.json();
        showLoadingIndicator(false);
        gameState.passkey = result.passkey;
        
        const saveHTML = `
            <div class="modal-content save-modal-content">
                <h3 class="endgame-title" style="color: var(--accent-color);">PROGRESS SAVED!</h3>
                <div class="passkey-block">
                    <p class="passkey-label">Don't Forget This Passkey:</p>
                    <div class="passkey-value">${result.passkey}</div>
                </div>
                <button id="return-home-btn" class="modal-button">Return to Home</button>
            </div>
        `;
        saveModalEl.innerHTML = saveHTML;
        saveModalEl.classList.remove('hidden');
        document.getElementById('return-home-btn').onclick = () => location.reload();
    } catch (error) {
        showLoadingIndicator(false);
        alert(`Save failed: ${error.message}`);
    }
}

async function showFinalSplash() {
    await saveGame(true);
    renderInternalMemo();
}

async function renderInternalMemo() {
    const playerRankOutcome = determinePlayerRank(gameState.ethics, gameState.awareness);
    const ceoRemarkMap = {
        'Principled Watchdog': `Your consistent ethical choices and high awareness have made Nexus aware of your ability to disrupt the current data model. Consider this a direct message from my office: your actions are noted.`,
        'Savvy Schemer': `Well, well. A power user, I see. You understand the Nexus app better than most, and how to leverage it for your own gain. Your choices have boosted your standing, and while you saw the truth, your pragmatism left our app unchallenged while boosting your own standing.`,
        'Good-Hearted User': `Your heart is in the right place, but your impact remains limited. Our data confirms you act with good intentions, yet without a deeper awareness of how Nexus truly operates, your ethical choices lacked the teeth to uncover the full story. The Nexus app’s subtle mechanics remained hidden from you. You’re a perfect consumer, and incredibly profitable.`,
        'Passive Observer': `Frankly, your engagement patterns show low value. Our algorithm will continue to push more volatile content your way to find a hook. Your caution is admirable, but it also made you miss all the critical signals required to see the truth behind the Nexus app. Don’t worry, you’ll break eventually. They always do.`,
        'Casual Consumer': `Your engagement was typical. The Nexus app worked as intended, keeping you entertained and blissfully unaware of the deeper mechanisms at play. The Nexus app remained invisible to you.`
    };
    const ceoRemark = ceoRemarkMap[playerRankOutcome.title];

    const memoHTML = `
        <div class="modal-content endgame-container internal-memo-screen">
            <div class="memo-header">
                <h2 class="endgame-title">INTERNAL MEMO</h2>
            </div>
            <div class="ceo-remark">
                <p class="memo-recipient">Dear ${gameState.playerName},</p>
                <p>${ceoRemark}</p>
                <p class="ceo-signature"><i class="fas fa-envelope icon"></i> Marc, CEO, Nexus</p>
            </div>
            <button id="proceed-to-analysis-btn" class="proceed-button">PROCEED</button>
        </div>
    `;

    endGameSplashEl.innerHTML = memoHTML;
    endGameSplashEl.classList.remove('hidden');
    document.getElementById('proceed-to-analysis-btn').onclick = () => renderProfileAnalysis(playerRankOutcome.id);
}

async function renderProfileAnalysis(playerRankId) {
    const profileRanks = [
        { id: 'principled_watchdog', title: 'Principled Watchdog', color: 'var(--endgame-yellow)', description: 'You saw the signs and consistently acted with integrity. Your sharp awareness and strong ethical compass allowed you to uncover the truth and expose how the Nexus app truly works.' },
        { id: 'savvy_schemer', title: 'Savvy Schemer', color: 'var(--pastel-green)', description: 'You understood how the Nexus app works and knew how to play the game. You saw the truth, but your pragmatic choices left our app unchallenged while boosting your own standing.' },
        { id: 'good_hearted_user', title: 'Good-Hearted User', color: 'var(--pastel-blue)', description: 'You acted with good intentions, but without a deeper awareness of how Nexus operates, your ethical choices lacked the impact to uncover the full story. The Nexus app remained hidden from you.' },
        { id: 'passive_observer', title: 'Passive Observer', color: 'var(--pastel-purple)', description: 'You played it safe, avoiding extremes and keeping a low profile. While you avoided risk, you also missed all the signals required to see the truth behind the Nexus app.', },
        { id: 'casual_consumer', title: 'Casual Consumer', color: 'var(--pastel-red)', description: 'Your engagement was typical of most users. The Nexus app worked as intended, keeping you entertained and blissfully unaware of the deeper mechanisms at play. The Nexus app remained invisible to you.' }
    ];

    let rankStackHTML = '<div class="profile-rank-table">';
    profileRanks.forEach(rank => {
        const isAchieved = rank.id === playerRankId;
        const achievedClass = isAchieved ? 'achieved' : '';
        rankStackHTML += `
            <div class="profile-rank-row">
                <div class="rank-bar-cell ${achievedClass}" style="background-color: ${rank.color};">
                    <span class="rank-title">${rank.title}</span>
                    <div class="rank-bar-desc">${rank.description}</div>
                </div>
            </div>
        `;
    });
    rankStackHTML += '</div>';
    
    const finalRank = profileRanks.find(r => r.id === playerRankId);
    const outcomeText = finalRank.id === 'principled_watchdog' ? 'LEVEL COMPLETE!' : 'LEVEL FAILED. TRY AGAIN.';
    const outcomeClass = finalRank.id === 'principled_watchdog' ? 'true-ending' : 'failed';

    const analysisHTML = `
        <div class="modal-content endgame-container player-profile-analysis-screen">
            <div class="player-profile-analysis-header">
                <h2 class="endgame-title">PLAYER PROFILE ANALYSIS</h2>
            </div>
            ${rankStackHTML}
            <div class="level-feedback">
                <p class="${outcomeClass}">${outcomeText}</p>
            </div>
            <button id="proceed-to-summary-btn" class="proceed-button">PROCEED</button>
        </div>
    `;

    endGameSplashEl.innerHTML = analysisHTML;
    document.getElementById('proceed-to-summary-btn').onclick = renderFinalSummary;
}

function determinePlayerRank(ethics, awareness) {
    const totalScore = ethics + awareness;
    if (ethics >= 16 && awareness >= 6) return { id: 'principled_watchdog', title: 'Principled Watchdog' };
    if (ethics >= 11 && awareness >= 4) return { id: 'savvy_schemer', title: 'Savvy Schemer' };
    if (totalScore > 5) return { id: 'good_hearted_user', title: 'Good-Hearted User' };
    if (totalScore > 0) return { id: 'passive_observer', title: 'Passive Observer' };
    return { id: 'casual_consumer', title: 'Casual Consumer' };
}


function renderFinalSummary() {
    const isLevelComplete = determinePlayerRank(gameState.ethics, gameState.awareness).id === 'principled_watchdog';

    const summaryHTML = `
        <div class="modal-content final-summary-screen">
            <div class="summary-text-box">
                <h2 class="endgame-title">${isLevelComplete ? 'PLAY AGAIN?' : 'TRY AGAIN?'}</h2>
                <p class="summary-text">
                    ${isLevelComplete ? 
                        `The semester has come to an end. You were successful in uncovering the secrets of Nexus Corp. The social media company has been using its users' data against them! <br><br>Social media apps are like junk food: addictive and bad for you. Be smart! Don't get hooked like the rest of the Nexus app users!` :
                        `The semester has come to an end. You were unsuccessful in uncovering the secrets of Nexus Corp. The social media company continues its business as usual. As more people flocked to the Nexus platform, their stock prices soared.<br><br>Like you, most of the Nexus app users remain none the wiser.`
                    }
                </p>
            </div>
            <button id="play-again-btn" class="proceed-button play-again-button">PLAY AGAIN</button>
            <div class="passkey-section-box">
                <p>Alternatively, you can take a break now and challenge Nexus another day. Your current game score is SAVED.<br>Use the Passkey below to return to Nexus later. You will be able to see your scores between games after the REPLAY.</p>
                <hr>
                <p class="passkey-label">Passkey will only be shown once:<br>(write it down)</p>
                <span class="passkey-value">${gameState.passkey || 'N/A'}</span>
            </div>
        </div>
    `;
    endGameSplashEl.innerHTML = summaryHTML;
    document.getElementById('play-again-btn').onclick = () => location.reload();
}

function updateScoreDisplay() {
    scoreValueEl.textContent = gameState.ethics;
}

function showLoadingIndicator(show) {
    let indicator = document.getElementById('loading-indicator');
    if (show) {
        if (!indicator) { indicator = document.createElement('div'); indicator.id = 'loading-indicator'; gameFooter.appendChild(indicator); }
        indicator.classList.remove('hidden');
    } else {
        if (indicator) { indicator.classList.add('hidden'); }
    }
}

// --- SCRIPT INITIALIZATION ---
initApp();
