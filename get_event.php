<?php
header('Content-Type: application/json');
$config = require '/home1/cslohcom/nexus_config.php';
$week = $_GET['week'] ?? 0;

if ($week < 1 || $week > 20) {
    echo json_encode(['error' => 'Invalid week number specified.']);
    exit();
}

$conn_str = "host={$config['host']} dbname={$config['dbname']} user={$config['user']} password={$config['password']}";
$dbconn = pg_connect($conn_str);
if (!$dbconn) { echo json_encode(['error' => 'Database connection failed.']); exit(); }

$event_query = 'SELECT event_id, week_number, event_code, event_text FROM life_events WHERE week_number = $1 ORDER BY RANDOM() LIMIT 1';
$event_result = pg_query_params($dbconn, $event_query, array($week));

if (!$event_row = pg_fetch_assoc($event_result)) {
    echo json_encode(['error' => 'No event found for week ' . $week]);
    pg_close($dbconn);
    exit();
}

$event_id = $event_row['event_id'];
$choices_query = 'SELECT choice_text, score FROM event_choices WHERE event_id = $1 ORDER BY RANDOM()';
$choices_result = pg_query_params($dbconn, $choices_query, array($event_id));

$choices = [];
while ($choice_row = pg_fetch_assoc($choices_result)) {
    $choices[] = [
        'choice_text' => $choice_row['choice_text'],
        'score' => (int)$choice_row['score']
    ];
}

$output = [
    'week' => (int)$event_row['week_number'],
    'eventID' => $event_row['event_code'],
    'event_id' => (int)$event_id,
    'lifeEvent' => $event_row['event_text'],
    'posts' => $choices
];

pg_close($dbconn);
echo json_encode($output);
?>