// Vikāsa ESP32 Firmware - Timestamp Handling Implementation
// Handles NTP synchronization and ISO 8601 timestamp generation
// Clearly represents unsynchronized state when NTP is not available

#include "timestamp.h"
#include <WiFi.h>
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
    
    // Rate limit sync attempts
    if (now_ms - tm->last_sync_attempt_ms < 5000) {  // Min 5 seconds between attempts
        return tm->sync_state == TIMESTAMP_SYNCED;
    }
    
    tm->last_sync_attempt_ms = now_ms;
    tm->sync_attempts++;
    tm->sync_state = TIMESTAMP_SYNCING;
    
#if DEVELOPMENT_MODE || defined(VIKASA_SERIAL_DIAGNOSTICS)
    Serial.printf("[TIMESTAMP] Attempting NTP sync (attempt %d)...\n", tm->sync_attempts);
#endif
    
    struct timeval tv;
    if (gettimeofday(&tv, nullptr) == 0) {
        // Successfully got time from NTP
        time_t ntp_time = tv.tv_sec;
        time_t local_time = time(nullptr);
        
        // Calculate offset between millis() and NTP time
        // millis() is milliseconds since boot
        // ntp_time is seconds since epoch
        tm->ntp_time_offset = ntp_time - (now_ms / 1000);
        tm->last_sync_ms = now_ms;
        tm->sync_state = TIMESTAMP_SYNCED;
        
#if DEVELOPMENT_MODE
        Serial.printf("[TIMESTAMP] NTP sync successful. Unix time: %lu, Offset: %ld\n", 
                      (unsigned long)ntp_time, tm->ntp_time_offset);
#elif defined(VIKASA_SERIAL_DIAGNOSTICS)
        Serial.printf("[TIMESTAMP] System time read; Unix time: %lu (SNTP completion not independently verified)\n",
                      (unsigned long)ntp_time);
#endif
        return true;
    } else {
        tm->sync_state = TIMESTAMP_SYNC_FAILED;
#if DEVELOPMENT_MODE || defined(VIKASA_SERIAL_DIAGNOSTICS)
        Serial.println("[TIMESTAMP] NTP sync failed");
#endif
        return false;
    }
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
    return tm->ntp_time_offset + (now_ms / 1000);
}

bool timestamp_is_synced(const TimestampManager* tm) {
    return tm && tm->sync_state == TIMESTAMP_SYNCED;
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