<?php
header('Content-Type: application/json');
$config = require '/home1/cslohcom/nexus_config.php';
$week = $_GET['week'] ?? 0;

if ($week < 1 || $week > 20) {
    echo json_encode(['error' => 'Invalid week number for gate event.']);
    exit();
}
    
$conn_str = "host={$config['host']} dbname={$config['dbname']} user={$config['user']} password={$config['password']}";
$dbconn = pg_connect($conn_str);
if (!$dbconn) { echo json_encode(['error' => 'Database connection failed.']); exit(); }

$query = 'SELECT gate_id, week_number, event_code, sender_from, sender_text, positive_response, negative_response, leak_title, leak_content, puff_content FROM gate_events WHERE week_number = $1 ORDER BY RANDOM() LIMIT 1';
$result = pg_query_params($dbconn, $query, array($week));

if ($row = pg_fetch_assoc($result)) {
    $row['gate_id'] = (int)$row['gate_id'];
    $row['week_number'] = (int)$row['week_number'];
    echo json_encode($row);
} else {
    echo json_encode(['error' => 'No gate event found for week ' . $week]);
}

pg_close($dbconn);
?>