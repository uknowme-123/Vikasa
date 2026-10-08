// Vikāsa ESP32 Firmware - Flask API Client
// HTTP client for POST /api/sensor-data
// Handles:
// - Serialization to JSON
// - Correct HTTP headers
// - HTTP success (201)
// - HTTP 400 validation errors
// - HTTP 409 duplicate reading_id
// - HTTP 5xx errors
// - Timeout/network failure
// - Retry behavior (no uncontrolled loops)

#ifndef API_CLIENT_H
#define API_CLIENT_H

#include <Arduino.h>
#include "config.h"
#include "sensor_data.h"

// API response codes
enum ApiResponseCode {
    API_SUCCESS = 0,           // 201 Created
    API_VALIDATION_ERROR = 400, // 400 Bad Request
    API_DUPLICATE_ERROR = 409,  // 409 Conflict
    API_SERVER_ERROR = 500,     // 5xx Server Error
    API_TIMEOUT = -1,           // Request timeout
    API_NETWORK_ERROR = -2,     // Network failure
    API_NOT_CONNECTED = -3,     // Wi-Fi not connected
    API_SERIALIZE_ERROR = -4,   // JSON serialization failed
    API_INVALID_CONFIG = -5,    // Invalid configuration
    API_MEMORY_ERROR = -6       // Buffer allocation failed
};

// API client state
struct ApiClient {
    char base_url[128];
    char endpoint[64];
    uint32_t request_timeout_ms;
    int max_retries;
    uint32_t retry_delay_ms;
    int last_response_code;
    char last_error_message[256];
    uint32_t last_request_ms;
    bool development_mode;
};

// Initialize API client
void api_client_init(ApiClient* client);

// Set base URL and endpoint
void api_client_set_url(ApiClient* client, const char* base_url, const char* endpoint);

// Send sensor reading to API
// Returns API response code
ApiResponseCode api_client_send_reading(ApiClient* client, const SensorReading* reading);

// Get last response code
int api_client_get_last_response_code(const ApiClient* client);

// Get last error message
const char* api_client_get_last_error(const ApiClient* client);

// Check if client is configured
bool api_client_is_configured(const ApiClient* client);

#endif // API_CLIENT_H