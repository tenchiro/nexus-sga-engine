document.addEventListener('DOMContentLoaded', () => {
    // --- GLOBAL APP STATE & CONNECTION ---
    const socket = io();
    let gameState = {};
    let appData = {}; 
    const gateWeeks = [3, 6, 10, 13, 16, 20];

    // --- DOM Elements ---
    const onboardingScreen = document.getElementById('onboarding-screen');
    const loginScreen = document.getElementById('login-screen');
    // ... all other DOM element variables are the same ...

    // --- INITIALIZATION ---
    function initApp() {
        // We set up the listener for the server's response FIRST.
        socket.on('server:send_app_data', (response) => {
            if (response.status === 'error') {
                document.getElementById('begin-semester-btn').textContent = "Error Loading!";
                alert(`Could not load essential game data: ${response.message}`);
                return;
            }
            appData = response.data;
            if (!appData.us_states || !appData.weather_data || !appData.adjectives) {
                 alert("Essential app data is missing from server response.");
                 return;
            }
            // Once data is loaded, THEN we activate the UI.
            setupOnboardingListeners();
        });

        // NOW, we ask the server for the data.
        socket.emit('client:request_app_data');
    }

    function setupOnboardingListeners() {
        const beginSemesterBtn = document.getElementById('begin-semester-btn');
        const startConsentCheckbox = document.getElementById('start-consent-checkbox');
        
        beginSemesterBtn.disabled = !startConsentCheckbox.checked;
        beginSemesterBtn.textContent = startConsentCheckbox.checked ? 'Begin Semester' : 'Agree and Consent to Begin';
        if (startConsentCheckbox.checked) beginSemesterBtn.classList.add('is-active');

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
    
    // ... The rest of the script from populateStates() down to the end is IDENTICAL to the last complete version. ...
    // ... I am omitting it here to avoid sending a massive block of redundant code, but it is unchanged. ...
    
    // --- SCRIPT INITIALIZATION ---
    initApp();
});