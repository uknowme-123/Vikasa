// Vikāsa ESP32 Firmware - Example Secrets Configuration
// COPY THIS FILE TO secrets.h AND FILL IN YOUR VALUES
// NEVER COMMIT secrets.h TO VERSION CONTROL
//
// Add secrets.h to .gitignore

#ifndef SECRETS_H
#define SECRETS_H

// Wi-Fi Credentials
#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// Flask API Configuration
#define API_BASE_URL "http://YOUR_API_HOST:5000/api"

// Device Identification
#define DEVICE_PLANT_ID "PLANT-001"
#define DEVICE_SESSION_ID "SESSION-001"
#define DEVICE_OPERATOR_ID "OPERATOR-001"

// Network Timeouts (milliseconds)
#define WIFI_CONNECT_TIMEOUT_MS 15000
#define WIFI_RECONNECT_INTERVAL_MS 30000
#define HTTP_REQUEST_TIMEOUT_MS 10000
#define HTTP_MAX_RETRIES 3
#define HTTP_RETRY_DELAY_MS 2000

// NTP Configuration (optional - for timestamp synchronization)
#define NTP_SERVER "pool.ntp.org"
#define NTP_TIMEZONE_OFFSET_SEC 0  // UTC offset in seconds
#define NTP_SYNC_INTERVAL_MS 3600000  // 1 hour

// Development Mode
// Set to 1 to enable development mode (test payloads only, no production data)
#define DEVELOPMENT_MODE 0

#endif // SECRETS_H