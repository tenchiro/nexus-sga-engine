document.addEventListener('DOMContentLoaded', () => {
    // --- GLOBAL APP STATE ---
    const socket = io("https://nexus-analytics-server.onrender.com");
    let gameState = {};

    // --- DOM Elements ---
    const loginScreen = document.getElementById('login-screen');
    const gameScreen = document.getElementById('game-screen');
    const consentCheckbox = document.getElementById('consent-checkbox');
    const startButton = document.getElementById('start-semester-btn');
    const gameContentContainer = document.querySelector('#game-screen');
    const endGameSplashEl = document.getElementById('end-game-splash');

    // --- INITIALIZATION ---
    function init() {
        // This listener robustly controls the state of the "Begin" button.
        consentCheckbox.addEventListener('change', () => {
            startButton.disabled = !consentCheckbox.checked;
            if (consentCheckbox.checked) {
                startButton.classList.add('enabled');
                startButton.textContent = 'Begin Semester';
            } else {
                startButton.classList.remove('enabled');
                startButton.textContent = 'Agree to Consent to Begin';
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

        // Since this is a simple test, we hardcode the event directly in the client
        const placeholderEvent = {
            week: 1,
            lifeEvent: "You've arrived on campus. The air is buzzing with the energy of new beginnings. What's your first move?",
            posts: [
                { choice_text: "Contact my family to let them know I'm safe and sound.", score: 1 },
                { choice_text: "Explore the campus to find my classes before everyone else does.", score: 0 },
                { choice_text: "Find the nearest party and make some new friends immediately.", score: -1 }
            ]
        };
        renderLifeEvent(placeholderEvent);
    }

    function handlePost(event, choice) {
        logAction(event, choice);
        showFinalSplash();
    }

    function renderLifeEvent(event) {
        // Instead of getting elements one by one, we build the entire game UI here
        gameContentContainer.innerHTML = `
            <div id="main-screen">
                <div id="game-content">
                    <div id="calendar-zone">
                        <span>Week ${event.week}</span>
                    </div>
                    <div class="game-section">
                        <p class="section-title">Life Event</p>
                        <div id="life-event-zone">
                            <p>${event.lifeEvent}</p>
                        </div>
                    </div>
                    <div class="game-section">
                        <p class="section-title">Create a Post</p>
                        <div id="post-options-zone">
                            ${event.posts.map(post => `
                                <div class="post-option" data-score="${post.score}" data-text="${post.choice_text}">
                                    <p>${post.choice_text}</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>`;
        
        // Add event listeners to the newly created post options
        document.querySelectorAll('.post-option').forEach(el => {
            el.addEventListener('click', () => {
                const choice = {
                    choice_text: el.dataset.text,
                    score: parseInt(el.dataset.score, 10)
                };
                handlePost(event, choice);
            });
        });
    }

    function showFinalSplash() {
        // For this test, we don't need to submit data. Just show the screen.
        endGameSplashEl.classList.remove('hidden');
    }

    function logAction(event, choice) {
        gameState.informationTrail.push({
            timestamp: new Date().toISOString(),
            eventWeek: event.week,
            choiceText: choice.choice_text,
            choiceScore: choice.score,
        });
        console.log("Current Trail:", gameState.informationTrail);
    }
    
    init();
});