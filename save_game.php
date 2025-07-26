<?php
header('Content-Type: application/json');
$config = require '/home1/cslohcom/nexus_config.php';

// Get the game state from the client
$json_data = file_get_contents('php://input');
$game_state = json_decode($json_data, true);

if (empty($game_state) || !is_array($game_state)) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid data.']);
    exit();
}

// --- FIX STARTS HERE ---
// Generate a shorter, 8-character secure token
$token = bin2hex(random_bytes(4)); 
// --- FIX ENDS HERE ---

$player_ip = $_SERVER['REMOTE_ADDR'];

$conn_str = "host={$config['host']} dbname={$config['dbname']} user={$config['user']} password={$config['password']}";
$dbconn = pg_connect($conn_str);

if (!$dbconn) {
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed.']);
    exit();
}

// Insert the new save state into the database
$query = 'INSERT INTO saved_sessions (token, session_data, player_ip, save_time) VALUES ($1, $2, $3, $4)';
$result = pg_query_params($dbconn, $query, array(
    $token,
    json_encode($game_state),
    $player_ip,
    date('Y-m-d H:i:s T')
));

if ($result) {
    // Return the new secure token to the user
    echo json_encode(['status' => 'success', 'token' => $token]);
} else {
    echo json_encode(['status' => 'error', 'message' => 'Failed to save session.']);
}

pg_close($dbconn);
?>