document.addEventListener('DOMContentLoaded', () => {

    // --- GLOBAL APP STATE ---
    let gameState = {};
    let appData = {}; 
    let socket;
    const gateWeeks = [3, 6, 10, 13, 16, 20];

    // --- DOM Elements ---
    // (These are defined correctly as global constants at the top)

    // --- INITIALIZATION ---
    function init() {
        document.getElementById('agree-btn').addEventListener('click', showInstructionsAndLoadData);
    }

    async function loadAppDataAndShowInstructions() {
        const getStartedBtn = document.getElementById('start-semester-btn');
        consentScreen.classList.add('hidden');
        instructionsScreen.classList.remove('hidden');

        try {
            getStartedBtn.textContent = "Loading...";
            getStartedBtn.disabled = true;

            socket = io(); // Establish connection here

            socket.on('connect', () => {
                console.log("Connected to server. Requesting initial data...");
                socket.emit('request_initial_data', (response) => {
                    if (response.status === 'error') {
                        throw new Error(response.message);
                    }
                    appData = response.data;
                    if (!appData.us_states || !appData.weather_data) {
                        throw new Error("Essential app data is missing from server's response.");
                    }
                    
                    populateStates();
                    getStartedBtn.addEventListener('click', showLoginScreen);
                    document.getElementById('start-new-game-btn').addEventListener('click', startNewGame);
                    // Resume logic can now be fully implemented
                    document.getElementById('resume-game-btn').addEventListener('click', resumeGame);
                    document.getElementById('close-modal-btn').addEventListener('click', () => { location.reload(); });
                    
                    getStartedBtn.textContent = "Start Semester";
                    getStartedBtn.disabled = false;
                });
            });

            socket.on('connect_error', (err) => {
                throw new Error(`Connection to game server failed: ${err.message}`);
            });

        } catch (error) {
            console.error("Initialization Failed:", error);
            getStartedBtn.textContent = "Error Loading!";
            alert(`Could not load essential game data. Please refresh and try again.\n\nError: ${error.message}`);
        }
    }
    
    // All other functions from the last correct version are largely unchanged,
    // but now they use the globally defined 'socket' variable.

    // ... (Paste the complete, functional script.js logic here)
    
    // --- SCRIPT INITIALIZATION ---
    init();
});