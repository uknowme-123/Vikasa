// Vikāsa ESP32 Firmware - Timestamp Handling Implementation
// Handles NTP synchronization and ISO 8601 timestamp generation
// Clearly represents unsynchronized state when NTP is not available

#include "timestamp.h"
#include <WiFi.h>
#include <esp_sntp.h>
#include <time.h>
#include <string.h>
#include <stdio.h>

#if DEVELOPMENT_MODE
#include <HardwareSerial.h>
#endif

// Initialize timestamp manager
void timestamp_init(TimestampManager* tm) {
    if (!tm) return;
    
    tm->sync_state = TIMESTAMP_UNSYNCED;
    tm->ntp_time_offset = 0;
    tm->last_sync_ms = 0;
    tm->last_sync_attempt_ms = 0;
    tm->sync_attempts = 0;
    tm->ntp_configured = false;
    
    // Configure NTP if server is defined
    if (strlen(NTP_SERVER) > 0) {
        configTime(NTP_TIMEZONE_OFFSET_SEC, 0, NTP_SERVER);
        tm->ntp_configured = true;
    }
}

// Attempt NTP synchronization
bool timestamp_sync_ntp(TimestampManager* tm) {
    if (!tm || !tm->ntp_configured) {
        return false;
    }
    
    uint32_t now_ms = millis();
    time_t current_unix = time(nullptr);
    sntp_sync_status_t sync_status = sntp_get_sync_status();

    if (sync_status == SNTP_SYNC_STATUS_COMPLETED &&
        timestamp_unix_is_plausible(current_unix)) {
        tm->ntp_time_offset = current_unix - (now_ms / 1000);
        tm->last_sync_ms = now_ms;
        tm->sync_state = TIMESTAMP_SYNCED;
        tm->sync_attempts = 0;

#if DEVELOPMENT_MODE
        Serial.printf("[TIMESTAMP] SNTP sync complete. Unix time: %lu\n",
                      (unsigned long)current_unix);
#elif defined(VIKASA_SERIAL_DIAGNOSTICS)
        Serial.printf("[TIMESTAMP] SNTP sync complete. Unix time: %lu\n",
                      (unsigned long)current_unix);
#endif
        return true;
    }

    if (tm->sync_state == TIMESTAMP_SYNCED &&
        timestamp_unix_is_plausible(current_unix)) {
        return true;
    }

    if (tm->sync_state == TIMESTAMP_SYNCED) {
        tm->sync_state = TIMESTAMP_SYNC_FAILED;
    }
    
    // Rate limit sync attempts
    if (now_ms - tm->last_sync_attempt_ms < 5000) {  // Min 5 seconds between attempts
        return false;
    }
    
    tm->last_sync_attempt_ms = now_ms;
    tm->sync_attempts++;
    tm->sync_state = TIMESTAMP_SYNCING;
    
#if DEVELOPMENT_MODE || defined(VIKASA_SERIAL_DIAGNOSTICS)
    Serial.printf("[TIMESTAMP] Attempting NTP sync (attempt %d)...\n", tm->sync_attempts);
#endif
    
    tm->sync_state = TIMESTAMP_SYNCING;
#if DEVELOPMENT_MODE || defined(VIKASA_SERIAL_DIAGNOSTICS)
    if (!timestamp_unix_is_plausible(current_unix)) {
        Serial.printf("[TIMESTAMP] Waiting for SNTP; system time is not plausible yet (Unix time: %lu)\n",
                      (unsigned long)current_unix);
    } else {
        Serial.println("[TIMESTAMP] Waiting for SNTP completion");
    }
#endif
    return false;
}

// Get current ISO 8601 timestamp string
void timestamp_get_iso8601(const TimestampManager* tm, char* buffer, size_t buffer_size, bool* synced) {
    if (!buffer || buffer_size < 32) {
        if (synced) *synced = false;
        return;
    }
    
    if (!tm || tm->sync_state != TIMESTAMP_SYNCED) {
        // Not synchronized - return explicit indicator
        strncpy(buffer, TIMESTAMP_UNSYNCED_INDICATOR, buffer_size - 1);
        buffer[buffer_size - 1] = '\0';
        if (synced) *synced = false;
        return;
    }
    
    // Calculate current Unix time using millis() + offset
    uint32_t now_ms = millis();
    time_t current_unix = tm->ntp_time_offset + (now_ms / 1000);
    if (!timestamp_unix_is_plausible(current_unix)) {
        strncpy(buffer, TIMESTAMP_UNSYNCED_INDICATOR, buffer_size - 1);
        buffer[buffer_size - 1] = '\0';
        if (synced) *synced = false;
        return;
    }
    
    // Convert to UTC time struct
    struct tm timeinfo;
    gmtime_r(&current_unix, &timeinfo);
    
    // Format as ISO 8601 UTC: YYYY-MM-DDTHH:MM:SSZ
    int written = snprintf(buffer, buffer_size, 
                          "%04d-%02d-%02dT%02d:%02d:%02dZ",
                          timeinfo.tm_year + 1900,
                          timeinfo.tm_mon + 1,
                          timeinfo.tm_mday,
                          timeinfo.tm_hour,
                          timeinfo.tm_min,
                          timeinfo.tm_sec);
    
    if (written < 0 || (size_t)written >= buffer_size) {
        strncpy(buffer, TIMESTAMP_UNSYNCED_INDICATOR, buffer_size - 1);
        buffer[buffer_size - 1] = '\0';
        if (synced) *synced = false;
        return;
    }
    
    if (synced) *synced = true;
}

// Get current Unix timestamp
time_t timestamp_get_unix(const TimestampManager* tm) {
    if (!tm || tm->sync_state != TIMESTAMP_SYNCED) {
        return 0;
    }
    
    uint32_t now_ms = millis();
    time_t current_unix = tm->ntp_time_offset + (now_ms / 1000);
    return timestamp_unix_is_plausible(current_unix) ? current_unix : 0;
}

bool timestamp_is_synced(const TimestampManager* tm) {
    if (!tm || tm->sync_state != TIMESTAMP_SYNCED) {
        return false;
    }

    uint32_t now_ms = millis();
    time_t current_unix = tm->ntp_time_offset + (now_ms / 1000);
    return timestamp_unix_is_plausible(current_unix);
}

const char* timestamp_sync_state_str(TimestampSyncState state) {
    switch (state) {
        case TIMESTAMP_UNSYNCED: return "UNSYNCED";
        case TIMESTAMP_SYNCING: return "SYNCING";
        case TIMESTAMP_SYNCED: return "SYNCED";
        case TIMESTAMP_SYNC_FAILED: return "SYNC_FAILED";
        default: return "UNKNOWN";
    }
}

void timestamp_set_synced(TimestampManager* tm, time_t unix_time) {
    if (!tm) return;
    
    uint32_t now_ms = millis();
    tm->ntp_time_offset = unix_time - (now_ms / 1000);
    tm->last_sync_ms = now_ms;
    tm->sync_state = TIMESTAMP_SYNCED;
    tm->sync_attempts = 0;
}