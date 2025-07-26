<?php
header('Content-Type: application/json');
$config = require '/home1/cslohcom/nexus_config.php';
$json_data = file_get_contents('php://input');
$session_data = json_decode($json_data, true);

if (empty($session_data) || !is_array($session_data)) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid or empty data received.']);
    exit();
}

$conn_str = "host={$config['host']} dbname={$config['dbname']} user={$config['user']} password={$config['password']}";
$dbconn = pg_connect($conn_str);
if (!$dbconn) { echo json_encode(['status' => 'error', 'message' => 'Database connection failed.']); exit(); }

$player_id = $session_data[0]['playerID'] ?? 'unknown_player';
$query = 'INSERT INTO nexus_game_sessions (player_id, session_data, submission_time) VALUES ($1, $2, $3)';
$result = pg_prepare($dbconn, "insert_session_query", $query);

if (!$result) {
    echo json_encode(['status' => 'error', 'message' => 'Failed to prepare statement.']);
    pg_close($dbconn);
    exit();
}

$result = pg_execute($dbconn, "insert_session_query", array(
    $player_id,
    json_encode($session_data),
    date('Y-m-d H:i:s T')
));

if ($result) {
    echo json_encode(['status' => 'success', 'message' => 'Data saved successfully.']);
} else {
    echo json_encode(['status' => 'error', 'message' => 'Failed to execute statement.']);
}

pg_close($dbconn);
?>