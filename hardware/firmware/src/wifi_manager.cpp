// Vikāsa ESP32 Firmware - Wi-Fi Connection Management Implementation
// Credentials come from configuration/secrets, never hard-coded

#include "wifi_manager.h"
#include <WiFi.h>
#include <string.h>
#include <stdio.h>

#if DEVELOPMENT_MODE
#include <HardwareSerial.h>
#endif

// Initialize Wi-Fi manager
void wifi_init(WifiManager* wm) {
    if (!wm) return;
    
    wm->state = WIFI_DISCONNECTED;
    wm->ssid[0] = '\0';
    wm->password[0] = '\0';
    wm->connect_start_ms = 0;
    wm->last_reconnect_attempt_ms = 0;
    wm->connection_attempts = 0;
    wm->max_connection_attempts = 3;
    wm->auto_reconnect = true;
    wm->credentials_configured = false;
    wm->on_connected = nullptr;
    wm->on_disconnected = nullptr;
    wm->on_connection_failed = nullptr;
    
    // Set Wi-Fi mode to station
    WiFi.mode(WIFI_STA);
    WiFi.setAutoReconnect(false);  // We handle reconnection manually
}

// Set Wi-Fi credentials (from config/secrets)
void wifi_set_credentials(WifiManager* wm, const char* ssid, const char* password) {
    if (!wm) return;
    
    if (ssid && strlen(ssid) < sizeof(wm->ssid)) {
        strncpy(wm->ssid, ssid, sizeof(wm->ssid) - 1);
        wm->ssid[sizeof(wm->ssid) - 1] = '\0';
    }
    
    if (password && strlen(password) < sizeof(wm->password)) {
        strncpy(wm->password, password, sizeof(wm->password) - 1);
        wm->password[sizeof(wm->password) - 1] = '\0';
    }
    
    wm->credentials_configured = (strlen(wm->ssid) > 0);
    
#if DEVELOPMENT_MODE
    if (wm->credentials_configured) {
        Serial.printf("[WIFI] Credentials configured for SSID: %s\n", wm->ssid);
        // NOTE: Password is intentionally NOT logged
    } else {
        Serial.println("[WIFI] No Wi-Fi credentials configured");
    }
#endif
}

// Start connection attempt
bool wifi_connect(WifiManager* wm) {
    if (!wm || !wm->credentials_configured) {
#if DEVELOPMENT_MODE || defined(VIKASA_SERIAL_DIAGNOSTICS)
        Serial.println("[WIFI] Connection not started: credentials not configured");
#endif
        if (wm) {
            wm->state = WIFI_CONNECTION_FAILED;
            if (wm->on_connection_failed) {
                wm->on_connection_failed("No credentials configured");
            }
        }
        return false;
    }
    
    if (wm->state == WIFI_CONNECTED) {
        return true;  // Already connected
    }
    
    wm->state = WIFI_CONNECTING;
    wm->connect_start_ms = millis();
    wm->connection_attempts++;
    
#if DEVELOPMENT_MODE
    Serial.printf("[WIFI] Connecting to %s (attempt %d)...\n", wm->ssid, wm->connection_attempts);
#elif defined(VIKASA_SERIAL_DIAGNOSTICS)
    Serial.printf("[WIFI] Connection attempt %d\n", wm->connection_attempts);
#endif
    
    WiFi.begin(wm->ssid, wm->password);
    
    return true;
}

// Main loop handler
void wifi_loop(WifiManager* wm) {
    if (!wm) return;
    
    uint32_t now_ms = millis();
    wl_status_t wifi_status = WiFi.status();
    
    switch (wm->state) {
        case WIFI_CONNECTING:
            if (wifi_status == WL_CONNECTED) {
                wm->state = WIFI_CONNECTED;
                wm->connection_attempts = 0;
                
#if DEVELOPMENT_MODE
                Serial.printf("[WIFI] Connected! IP: %s, RSSI: %d dBm\n", 
                              WiFi.localIP().toString().c_str(), WiFi.RSSI());
#elif defined(VIKASA_SERIAL_DIAGNOSTICS)
                Serial.println("[WIFI] Connected");
#endif
                if (wm->on_connected) {
                    wm->on_connected();
                }
            } else if (now_ms - wm->connect_start_ms >= WIFI_CONNECT_TIMEOUT_MS) {
                // Connection timeout
                wm->state = WIFI_CONNECTION_FAILED;
                
#if DEVELOPMENT_MODE
                Serial.printf("[WIFI] Connection timeout after %lu ms\n", 
                              now_ms - wm->connect_start_ms);
#elif defined(VIKASA_SERIAL_DIAGNOSTICS)
                Serial.println("[WIFI] Connection timed out");
#endif
                if (wm->on_connection_failed) {
                    wm->on_connection_failed("Connection timeout");
                }
                
                // Schedule reconnect if auto-reconnect enabled
                if (wm->auto_reconnect) {
                    wm->last_reconnect_attempt_ms = now_ms;
                }
            }
            break;
            
        case WIFI_CONNECTED:
            if (wifi_status != WL_CONNECTED) {
                // Connection lost
                wm->state = WIFI_DISCONNECTED;
                
#if DEVELOPMENT_MODE
                Serial.println("[WIFI] Disconnected");
#endif
                if (wm->on_disconnected) {
                    wm->on_disconnected();
                }
                
                // Schedule reconnect if auto-reconnect enabled
                if (wm->auto_reconnect) {
                    wm->last_reconnect_attempt_ms = now_ms;
                    wm->state = WIFI_RECONNECTING;
                }
            }
            break;
            
        case WIFI_RECONNECTING:
            if (now_ms - wm->last_reconnect_attempt_ms >= WIFI_RECONNECT_INTERVAL_MS) {
#if DEVELOPMENT_MODE
                Serial.println("[WIFI] Attempting reconnection...");
#endif
                wifi_connect(wm);
            }
            break;
            
        case WIFI_CONNECTION_FAILED:
            if (wm->auto_reconnect && 
                now_ms - wm->last_reconnect_attempt_ms >= WIFI_RECONNECT_INTERVAL_MS) {
                wm->state = WIFI_RECONNECTING;
            }
            break;
            
        case WIFI_DISCONNECTED:
            // Idle state, wait for explicit connect() call
            break;
    }
}

bool wifi_is_connected(const WifiManager* wm) {
    return wm && wm->state == WIFI_CONNECTED && WiFi.status() == WL_CONNECTED;
}

WifiState wifi_get_state(const WifiManager* wm) {
    return wm ? wm->state : WIFI_DISCONNECTED;
}

const char* wifi_state_str(WifiState state) {
    switch (state) {
        case WIFI_DISCONNECTED: return "DISCONNECTED";
        case WIFI_CONNECTING: return "CONNECTING";
        case WIFI_CONNECTED: return "CONNECTED";
        case WIFI_CONNECTION_FAILED: return "CONNECTION_FAILED";
        case WIFI_RECONNECTING: return "RECONNECTING";
        default: return "UNKNOWN";
    }
}

int wifi_get_rssi(const WifiManager* wm) {
    if (!wm || !wifi_is_connected(wm)) return 0;
    return WiFi.RSSI();
}

void wifi_get_ip(const WifiManager* wm, char* buffer, size_t buffer_size) {
    if (!buffer || buffer_size == 0) return;
    
    if (wifi_is_connected(wm)) {
        strncpy(buffer, WiFi.localIP().toString().c_str(), buffer_size - 1);
        buffer[buffer_size - 1] = '\0';
    } else {
        buffer[0] = '\0';
    }
}

void wifi_disconnect(WifiManager* wm) {
    if (!wm) return;
    
    WiFi.disconnect(true);
    wm->state = WIFI_DISCONNECTED;
    
#if DEVELOPMENT_MODE
    Serial.println("[WIFI] Disconnected by request");
#endif
}

void wifi_set_callbacks(WifiManager* wm, 
                        void (*on_connected)(),
                        void (*on_disconnected)(),
                        void (*on_connection_failed)(const char* reason)) {
    if (!wm) return;
    
    wm->on_connected = on_connected;
    wm->on_disconnected = on_disconnected;
    wm->on_connection_failed = on_connection_failed;
}