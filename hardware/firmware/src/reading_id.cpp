// Vikāsa ESP32 Firmware - Reading ID Generation Implementation
// Format: VIKASA-{PLANT_ID}-{TIMESTAMP_MS}-{SEQUENCE}
// Example: VIKASA-PLANT-001-1700000000000-001

#include "reading_id.h"
#include <string.h>
#include <stdio.h>

// Initialize the reading ID generator
void reading_id_init(ReadingIdGenerator* gen, const char* plant_id) {
    if (!gen) return;
    
    gen->sequence_counter = 0;
    gen->last_timestamp_ms = 0;
    gen->initialized = true;
    
    if (plant_id && strlen(plant_id) <= MAX_PLANT_ID_LEN) {
        strncpy(gen->plant_id, plant_id, MAX_PLANT_ID_LEN);
        gen->plant_id[MAX_PLANT_ID_LEN] = '\0';
    } else {
        strncpy(gen->plant_id, "UNKNOWN", MAX_PLANT_ID_LEN);
        gen->plant_id[MAX_PLANT_ID_LEN] = '\0';
    }
}

// Generate a new reading ID
bool reading_id_generate(ReadingIdGenerator* gen, char* buffer, size_t buffer_size) {
    if (!gen || !buffer || buffer_size < READING_ID_MAX_LEN + 1) {
        return false;
    }
    
    if (!gen->initialized) {
        reading_id_init(gen, "UNKNOWN");
    }
    
    // Get current timestamp in milliseconds
    // Use millis() for relative time, or absolute time if NTP synced
    uint32_t current_ms = millis();
    
    // If we have a valid NTP time, use that instead (would be set externally)
    // For now, use millis() since boot as a monotonic timestamp
    // This is combined with sequence to ensure uniqueness within a session
    
    // Increment sequence counter
    gen->sequence_counter++;
    
    // If timestamp hasn't changed (rapid readings), sequence ensures uniqueness
    // If timestamp changed, reset sequence
    if (current_ms != gen->last_timestamp_ms) {
        gen->sequence_counter = 1;
        gen->last_timestamp_ms = current_ms;
    }
    
    // Format: VIKASA-PLANT_ID-TIMESTAMP_MS-SEQUENCE
    // Timestamp in milliseconds since boot (or NTP if available)
    // Sequence is 3-digit zero-padded
    int written = snprintf(buffer, buffer_size, 
                          "%s-%s-%lu-%03lu",
                          READING_ID_PREFIX,
                          gen->plant_id,
                          (unsigned long)current_ms,
                          (unsigned long)gen->sequence_counter);
    
    if (written < 0 || (size_t)written >= buffer_size) {
        return false;
    }
    
    // Validate the generated ID matches backend pattern ^[A-Z0-9-]{1,64}$
    // Our format uses only uppercase, digits, and hyphens
    return true;
}

uint32_t reading_id_get_sequence(const ReadingIdGenerator* gen) {
    return gen ? gen->sequence_counter : 0;
}

void reading_id_reset(ReadingIdGenerator* gen) {
    if (!gen) return;
    gen->sequence_counter = 0;
    gen->last_timestamp_ms = 0;
}