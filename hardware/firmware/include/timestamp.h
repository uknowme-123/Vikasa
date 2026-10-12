// Vikāsa ESP32 Firmware - Timestamp Handling
// Device timestamp handling with NTP synchronization support
// 
// IMPORTANT: The ESP32 must NOT silently create false timestamps.
// If the ESP32 does not have valid time synchronization, clearly 
// represent the unsynchronized state according to the backend contract.

#ifndef TIMESTAMP_H
#define TIMESTAMP_H

#include <Arduino.h>
#include "config.h"

static const time_t TIMESTAMP_MIN_PLAUSIBLE_UNIX = 1577836800;

static inline bool timestamp_unix_is_plausible(time_t unix_time) {
    return unix_time >= TIMESTAMP_MIN_PLAUSIBLE_UNIX;
}

// Timestamp synchronization state
enum TimestampSyncState {
    TIMESTAMP_UNSYNCED = 0,      // No NTP sync, using millis() since boot
    TIMESTAMP_SYNCING = 1,       // NTP sync in progress
    TIMESTAMP_SYNCED = 2,        // NTP sync successful
    TIMESTAMP_SYNC_FAILED = 3    // NTP sync failed
};

// Timestamp manager state
struct TimestampManager {
    TimestampSyncState sync_state;
    time_t ntp_time_offset;      // Offset between millis() and NTP time
    uint32_t last_sync_ms;       // millis() when last sync occurred
    uint32_t last_sync_attempt_ms;
    int sync_attempts;
    bool ntp_configured;
};

// Initialize timestamp manager
void timestamp_init(TimestampManager* tm);

// Attempt NTP synchronization
// Returns true if sync successful, false otherwise
bool timestamp_sync_ntp(TimestampManager* tm);

// Get current ISO 8601 timestamp string
// If not synced, returns "UNSYNCED" and sets synced=false
// Buffer must be at least 32 bytes
void timestamp_get_iso8601(const TimestampManager* tm, char* buffer, size_t buffer_size, bool* synced);

// Get current Unix timestamp (seconds since epoch)
// Returns 0 if not synced
time_t timestamp_get_unix(const TimestampManager* tm);

// Check if timestamp is synchronized and valid
bool timestamp_is_synced(const TimestampManager* tm);

// Get sync state as string (for logging)
const char* timestamp_sync_state_str(TimestampSyncState state);

// Force update of sync state (e.g., after manual time set)
void timestamp_set_synced(TimestampManager* tm, time_t unix_time);

#endif // TIMESTAMP_H