<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// CORS Preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit();
}

// Input ডাটা নেওয়া
$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['phone'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Phone number is required']);
    exit();
}

$phone = $input['phone'];
$name = isset($input['name']) ? $input['name'] : 'Patient';
$serial = isset($input['serial']) ? $input['serial'] : '';
$date = isset($input['date']) ? $input['date'] : '';

// =============================================
// 📱 ফোন নম্বর ফরম্যাট
// =============================================
function formatPhone($phone) {
    // সব অক্ষর বাদ দিয়ে শুধু সংখ্যা রাখা
    $phone = preg_replace('/[^0-9]/', '', $phone);
    
    // 01XXXXXXXXX → 8801XXXXXXXXX
    if (strpos($phone, '01') === 0 && strlen($phone) === 11) {
        return '880' . substr($phone, 1);
    }
    // 1XXXXXXXXX → 8801XXXXXXXXX
    elseif (strlen($phone) === 10 && strpos($phone, '1') === 0) {
        return '880' . $phone;
    }
    // 88XXXXXXXXXX → 8801XXXXXXXXX
    elseif (strpos($phone, '88') === 0 && strlen($phone) === 12) {
        return '880' . substr($phone, 2);
    }
    // ইতিমধ্যে সঠিক ফরম্যাটে থাকলে
    elseif (strpos($phone, '880') === 0 && strlen($phone) === 13) {
        return $phone;
    }
    
    return $phone;
}

$formattedPhone = formatPhone($phone);

// =============================================
// 🔤 নাম ক্লিন করা (শুধু ইংরেজি)
// =============================================
function cleanName($name) {
    if (empty($name)) return 'Patient';
    // শুধু ইংরেজি অক্ষর রাখা
    $englishOnly = preg_replace('/[^a-zA-Z0-9\s]/', '', $name);
    return trim($englishOnly) ?: 'Patient';
}

$cleanName = cleanName($name);

// =============================================
// 📨 এসএমএস কনফিগারেশন
// =============================================
$apiKey = '74a82f2a949057f0e67fa4b672f75275'; // নতুন API Key
$sender = '8809617635159';

// মেসেজ তৈরি (শুধু ইংরেজি)
$msg = "Dear {$cleanName}, your serial is successful. Serial No: {$serial}, Date: {$date}. Thank you! For the next serial, visit: https://drmasum.netlify.app/";

// API URL
$url = "https://api.automas.com.bd/smsapiv3";

// প্যারামিটার
$data = array(
    'msisdn' => $formattedPhone,
    'smstext' => $msg,
    'apikey' => $apiKey,
    'sender' => $sender,
    'smsformat' => 1 // Text (ইংরেজি)
);

// =============================================
// 🚀 CURL দিয়ে রিকোয়েস্ট পাঠানো
// =============================================
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);
curl_setopt($ch, CURLOPT_ENCODING, '');
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);

$smsresult = curl_exec($ch);
$error = curl_error($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// =============================================
// 📊 রেসপন্স তৈরি
// =============================================
$response = array(
    'success' => false,
    'sent_to' => $formattedPhone,
    'original_phone' => $phone,
    'name' => $cleanName,
    'api_response' => $smsresult
);

if ($error) {
    $response['error'] = $error;
    $response['success'] = false;
} else {
    // JSON রেসপন্স পার্স
    $jsonResponse = json_decode($smsresult, true);
    
    if ($jsonResponse && isset($jsonResponse['response'][0])) {
        $firstResponse = $jsonResponse['response'][0];
        $statusCode = isset($firstResponse['status']) ? $firstResponse['status'] : null;
        $messageId = isset($firstResponse['id']) ? $firstResponse['id'] : null;
        
        $response['status'] = $statusCode;
        $response['message_id'] = $messageId;
        
        // সফল স্ট্যাটাস: 100, 109
        if ($statusCode == 100 || $statusCode == 109) {
            $response['success'] = true;
        } else {
            // এরর মেসেজ
            if ($statusCode == 101) $response['error'] = 'ব্যালেন্স কম';
            elseif ($statusCode == 102) $response['error'] = 'ভুল API Key';
            elseif ($statusCode == 103) $response['error'] = 'ভুল সেন্ডার আইডি';
            elseif ($statusCode == 104) $response['error'] = 'ভুল নম্বর';
            else $response['error'] = "স্ট্যাটাস: {$statusCode}";
        }
    } else {
        // টেক্সট রেসপন্স চেক
        if (strpos($smsresult, 'Success') !== false || strpos($smsresult, 'success') !== false) {
            $response['success'] = true;
        } else {
            $response['error'] = $smsresult;
        }
    }
}

// =============================================
// ✅ JSON রেসপন্স রিটার্ন
// =============================================
echo json_encode($response, JSON_UNESCAPED_UNICODE);
?>