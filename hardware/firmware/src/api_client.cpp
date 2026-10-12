// Vikāsa ESP32 Firmware - Flask API Client Implementation
// Handles POST /api/sensor-data with proper error handling and retry logic

#include "api_client.h"
#include <WiFiClient.h>
#include <HTTPClient.h>
#include <string.h>
#include <stdio.h>
#include <memory>
#include <new>

#if DEVELOPMENT_MODE
#include <HardwareSerial.h>
#endif

// Initialize API client
void api_client_init(ApiClient* client) {
    if (!client) return;
    
    strncpy(client->base_url, API_BASE_URL, sizeof(client->base_url) - 1);
    client->base_url[sizeof(client->base_url) - 1] = '\0';
    
    strncpy(client->endpoint, "/sensor-data", sizeof(client->endpoint) - 1);
    client->endpoint[sizeof(client->endpoint) - 1] = '\0';
    
    client->request_timeout_ms = HTTP_REQUEST_TIMEOUT_MS;
    client->max_retries = HTTP_MAX_RETRIES;
    client->retry_delay_ms = HTTP_RETRY_DELAY_MS;
    client->last_response_code = 0;
    client->last_error_message[0] = '\0';
    client->last_request_ms = 0;
    client->development_mode = (DEVELOPMENT_MODE == 1);
}

// Set base URL and endpoint
void api_client_set_url(ApiClient* client, const char* base_url, const char* endpoint) {
    if (!client) return;
    
    if (base_url && strlen(base_url) < sizeof(client->base_url)) {
        strncpy(client->base_url, base_url, sizeof(client->base_url) - 1);
        client->base_url[sizeof(client->base_url) - 1] = '\0';
    }
    
    if (endpoint && strlen(endpoint) < sizeof(client->endpoint)) {
        strncpy(client->endpoint, endpoint, sizeof(client->endpoint) - 1);
        client->endpoint[sizeof(client->endpoint) - 1] = '\0';
    }
}

// Build full URL
static void build_url(const ApiClient* client, char* buffer, size_t buffer_size) {
    // Ensure base_url doesn't end with slash, endpoint starts with slash
    const char* base = client->base_url;
    const char* ep = client->endpoint;
    
    size_t base_len = strlen(base);
    if (base_len > 0 && base[base_len - 1] == '/') {
        base_len--;  // Skip trailing slash
    }
    
    snprintf(buffer, buffer_size, "%.*s%s", (int)base_len, base, ep);
}

// Send sensor reading with retry logic
ApiResponseCode api_client_send_reading(ApiClient* client, const SensorReading* reading) {
    if (!client || !reading) {
        return API_INVALID_CONFIG;
    }
    
    // Check Wi-Fi connection
    if (WiFi.status() != WL_CONNECTED) {
        strncpy(client->last_error_message, "Wi-Fi not connected", sizeof(client->last_error_message) - 1);
        return API_NOT_CONNECTED;
    }
    
    // Serialize reading to JSON
    std::unique_ptr<char[]> json_buffer(new (std::nothrow) char[MAX_JSON_PAYLOAD_SIZE]);
    if (!json_buffer) {
        strncpy(client->last_error_message, "Out of memory allocating JSON buffer",
                sizeof(client->last_error_message) - 1);
        client->last_error_message[sizeof(client->last_error_message) - 1] = '\0';
        return API_MEMORY_ERROR;
    }

    size_t json_len = serialize_sensor_reading(reading, json_buffer.get(), MAX_JSON_PAYLOAD_SIZE);
    
    if (json_len == 0) {
        strncpy(client->last_error_message, "JSON serialization failed", sizeof(client->last_error_message) - 1);
        return API_SERIALIZE_ERROR;
    }
    
#if DEVELOPMENT_MODE
    Serial.printf("[API] Sending payload (%zu bytes): %s\n", json_len, json_buffer.get());
#endif
    
    // Build full URL
    char url[256];
    build_url(client, url, sizeof(url));
    
    // Retry loop
    for (int attempt = 0; attempt <= client->max_retries; attempt++) {
        client->last_request_ms = millis();
        
        WiFiClient wifi_client;
        HTTPClient http;
        
        // Configure HTTP client
        http.begin(wifi_client, url);
        http.setTimeout(client->request_timeout_ms);
        http.addHeader("Content-Type", "application/json");
        http.addHeader("Accept", "application/json");
        http.addHeader("User-Agent", "Vikasa-ESP32/" FIRMWARE_VERSION);
        
        // Send POST request
#if DEVELOPMENT_MODE || defined(VIKASA_SERIAL_DIAGNOSTICS)
        Serial.printf("[API] HTTP POST attempt %d/%d\n", attempt + 1, client->max_retries + 1);
#endif
        int http_code = http.POST(reinterpret_cast<uint8_t*>(json_buffer.get()), json_len);
        
        client->last_response_code = http_code;
        
        // Get response body for error details
        String response_body = "";
        if (http_code > 0) {
            response_body = http.getString();
        }
        
        http.end();
        
#if DEVELOPMENT_MODE
        Serial.printf("[API] Attempt %d/%d - HTTP %d\n", attempt + 1, client->max_retries + 1, http_code);
        if (http_code != 201 && response_body.length() > 0) {
            Serial.printf("[API] Response: %s\n", response_body.c_str());
        }
#elif defined(VIKASA_SERIAL_DIAGNOSTICS)
        Serial.printf("[API] HTTP result: %d\n", http_code);
        if (http_code == 400 && response_body.length() > 0) {
            Serial.printf("[API] HTTP 400 response (first 256 chars): %.256s\n",
                          response_body.c_str());
        }
#endif
        
        // Handle response
        if (http_code == 201) {
            // Success
            client->last_error_message[0] = '\0';
            return API_SUCCESS;
        }
        
        if (http_code == 400) {
            // Validation error - don't retry, return immediately
            snprintf(client->last_error_message, sizeof(client->last_error_message), 
                     "Validation error (400): %s", response_body.c_str());
            return API_VALIDATION_ERROR;
        }
        
        if (http_code == 409) {
            // Duplicate reading_id - don't retry, return immediately
            snprintf(client->last_error_message, sizeof(client->last_error_message), 
                     "Duplicate reading_id (409): %s", response_body.c_str());
            return API_DUPLICATE_ERROR;
        }
        
        if (http_code >= 500 && http_code < 600) {
            // Server error - retry if attempts remain
            snprintf(client->last_error_message, sizeof(client->last_error_message), 
                     "Server error (%d): %s", http_code, response_body.c_str());
            
            if (attempt < client->max_retries) {
                delay(client->retry_delay_ms);
                continue;
            }
            return API_SERVER_ERROR;
        }
        
        if (http_code <= 0) {
            // Network/timeout error - retry if attempts remain
            const char* error_str = (http_code == HTTPC_ERROR_CONNECTION_REFUSED) ? "Connection refused" :
                                    (http_code == HTTPC_ERROR_SEND_HEADER_FAILED) ? "Send header failed" :
                                    (http_code == HTTPC_ERROR_SEND_PAYLOAD_FAILED) ? "Send payload failed" :
                                    (http_code == HTTPC_ERROR_NOT_CONNECTED) ? "Not connected" :
                                    (http_code == HTTPC_ERROR_CONNECTION_LOST) ? "Connection lost" :
                                    (http_code == HTTPC_ERROR_NO_STREAM) ? "No stream" :
                                    (http_code == HTTPC_ERROR_NO_HTTP_SERVER) ? "No HTTP server" :
                                    (http_code == HTTPC_ERROR_TOO_LESS_RAM) ? "Out of memory" :
                                    (http_code == HTTPC_ERROR_ENCODING) ? "Encoding error" :
                                    (http_code == HTTPC_ERROR_STREAM_WRITE) ? "Stream write error" :
                                    (http_code == HTTPC_ERROR_READ_TIMEOUT) ? "Read timeout" :
                                    "Network error";
            
            snprintf(client->last_error_message, sizeof(client->last_error_message), 
                     "Network error (%d): %s", http_code, error_str);
            
            if (attempt < client->max_retries) {
                delay(client->retry_delay_ms);
                continue;
            }
            return API_NETWORK_ERROR;
        }
        
        // Other HTTP codes - don't retry
        snprintf(client->last_error_message, sizeof(client->last_error_message), 
                 "Unexpected HTTP code: %d", http_code);
        return (ApiResponseCode)http_code;
    }
    
    // Should not reach here, but safety net
    return API_NETWORK_ERROR;
}

int api_client_get_last_response_code(const ApiClient* client) {
    return client ? client->last_response_code : 0;
}

const char* api_client_get_last_error(const ApiClient* client) {
    return client ? client->last_error_message : "Invalid client";
}

bool api_client_is_configured(const ApiClient* client) {
    return client && strlen(client->base_url) > 0 && strlen(client->endpoint) > 0;
}