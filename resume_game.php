<?php
header('Content-Type: application/json');
$config = require '/home1/cslohcom/nexus_config.php';

$json_data = file_get_contents('php://input');
$request_data = json_decode($json_data, true);
$token = $request_data['token'] ?? '';
$player_ip = $_SERVER['REMOTE_ADDR'];

if (empty($token)) {
    echo json_encode(['status' => 'error', 'message' => 'No token provided.']);
    exit();
}

$conn_str = "host={$config['host']} dbname={$config['dbname']} user={$config['user']} password={$config['password']}";
$dbconn = pg_connect($conn_str);
if (!$dbconn) { /* ... error handling ... */ }

// Find the saved session by token AND matching IP address
$query_select = 'SELECT session_data FROM saved_sessions WHERE token = $1 AND player_ip = $2';
$result_select = pg_query_params($dbconn, $query_select, array($token, $player_ip));

if ($row = pg_fetch_assoc($result_select)) {
    // Success! Send the game state back to the client
    echo $row['session_data']; // Send the raw JSON string

    // Now, delete the token to make it single-use
    $query_delete = 'DELETE FROM saved_sessions WHERE token = $1';
    pg_query_params($dbconn, $query_delete, array($token));

} else {
    // Token not found or IP mismatch
    echo json_encode(['status' => 'error', 'message' => 'Invalid or expired token.']);
}

pg_close($dbconn);
?>