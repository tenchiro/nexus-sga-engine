const socket = io();

const testButton = document.getElementById('test-button');
const logMessage = document.getElementById('log-message');

testButton.addEventListener('click', () => {
    console.log('Button clicked. Sending test event to server...');
    logMessage.textContent = 'Sending click to server...';
    logMessage.className = '';

    socket.emit('test_click', { message: 'Hello from the client!' });
});

socket.on('server_confirmation', (data) => {
    console.log('Received confirmation from server:', data);
    logMessage.textContent = `[${data.status}] ${data.message}`;

    if(data.status === 'Success') {
        logMessage.className = 'success';
    } else {
        logMessage.className = 'error';
    }
});

socket.on('connect', () => {
    console.log('Successfully connected to WebSocket server.');
});

socket.on('connect_error', (err) => {
    console.error('Connection to WebSocket server failed:', err);
    logMessage.textContent = 'ERROR: Cannot connect to server.';
    logMessage.className = 'error';
});