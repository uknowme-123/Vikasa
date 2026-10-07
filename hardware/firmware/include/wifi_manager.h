// Vikāsa ESP32 Firmware - Wi-Fi Connection Management
// Configurable Wi-Fi connection handling with:
// - Connection attempt with timeout
// - Reconnect handling
// - Connection status reporting
// - Credentials from configuration (NOT hard-coded)

#ifndef WIFI_MANAGER_H
#define WIFI_MANAGER_H

#include <Arduino.h>
#include "config.h"

// Wi-Fi connection state
enum WifiState {
    WIFI_DISCONNECTED = 0,
    WIFI_CONNECTING = 1,
    WIFI_CONNECTED = 2,
    WIFI_CONNECTION_FAILED = 3,
    WIFI_RECONNECTING = 4
};

// Wi-Fi manager state
struct WifiManager {
    WifiState state;
    char ssid[64];
    char password[64];
    uint32_t connect_start_ms;
    uint32_t last_reconnect_attempt_ms;
    int connection_attempts;
    int max_connection_attempts;
    bool auto_reconnect;
    bool credentials_configured;
    
    // Callbacks
    void (*on_connected)();
    void (*on_disconnected)();
    void (*on_connection_failed)(const char* reason);
};

// Initialize Wi-Fi manager
void wifi_init(WifiManager* wm);

// Set Wi-Fi credentials (from config/secrets)
void wifi_set_credentials(WifiManager* wm, const char* ssid, const char* password);

// Start connection attempt
bool wifi_connect(WifiManager* wm);

// Main loop handler - call periodically to maintain connection
void wifi_loop(WifiManager* wm);

// Check if connected
bool wifi_is_connected(const WifiManager* wm);

// Get current state
WifiState wifi_get_state(const WifiManager* wm);

// Get state as string (for logging)
const char* wifi_state_str(WifiState state);

// Get RSSI (signal strength) if connected, 0 otherwise
int wifi_get_rssi(const WifiManager* wm);

// Get local IP address as string if connected
void wifi_get_ip(const WifiManager* wm, char* buffer, size_t buffer_size);

// Disconnect
void wifi_disconnect(WifiManager* wm);

// Set callbacks
void wifi_set_callbacks(WifiManager* wm, 
                        void (*on_connected)(),
                        void (*on_disconnected)(),
                        void (*on_connection_failed)(const char* reason));

#endif // WIFI_MANAGER_H