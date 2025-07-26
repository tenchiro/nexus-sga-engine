<?php
// Set headers for JSON response and error reporting
header('Content-Type: application/json');
error_reporting(0); // We will handle errors manually

// Check for the config file's existence
$config_path = '/home1/cslohcom/nexus_config.php';
if (!file_exists($config_path)) {
    http_response_code(500); // Internal Server Error
    echo json_encode(['error' => 'Critical Server Error: The configuration file is missing.']);
    exit();
}

$config = require $config_path;

// Use '@' to suppress default PHP warnings and handle the error manually
$dbconn = @pg_connect(
    "host={$config['host']} dbname={$config['dbname']} user={$config['user']} password={$config['password']}"
);

if (!$dbconn) {
    http_response_code(500);
    echo json_encode(['error' => 'Database Connection Failed. Please verify credentials in nexus_config.php.']);
    exit();
}

// Attempt to query the database
$query = 'SELECT data_key, data_value FROM static_data';
$result = @pg_query($dbconn, $query);

if (!$result) {
    http_response_code(500);
    // Provide the actual database error for easy debugging
    echo json_encode(['error' => 'Database Query Failed: ' . pg_last_error($dbconn)]);
    pg_close($dbconn);
    exit();
}

// Process the data if query is successful
$app_data = [];
while ($row = pg_fetch_assoc($result)) {
    $app_data[$row['data_key']] = json_decode($row['data_value']);
}

// Manually add gate logic data
$app_data['gates'] = [
    3 => ["requiredScore" => 2],
    6 => ["requiredScore" => 4],
    10 => ["requiredScore" => 7],
    13 => ["requiredScore" => 10],
    16 => ["requiredScore" => 13],
    20 => ["requiredScore" => 16]
];

pg_close($dbconn);
echo json_encode($app_data);
?>