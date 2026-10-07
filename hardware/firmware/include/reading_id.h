// Vikāsa ESP32 Firmware - Reading ID Generation
// Deterministic device-side reading_id generation
// Format: VIKASA-{PLANT_ID}-{TIMESTAMP_MS}-{SEQUENCE}
// Example: VIKASA-PLANT-001-1700000000000-001
//
// Requirements:
// - Unique enough for repeated measurements
// - Stable format
// - Suitable for Firebase duplicate protection
// - Does not depend on random fake values
// - Not cryptographically unique (explicitly documented)

#ifndef READING_ID_H
#define READING_ID_H

#include <Arduino.h>
#include "config.h"

// Reading ID generator state
struct ReadingIdGenerator {
    uint32_t sequence_counter;
    uint32_t last_timestamp_ms;
    char plant_id[MAX_PLANT_ID_LEN + 1];
    bool initialized;
};

// Initialize the reading ID generator
void reading_id_init(ReadingIdGenerator* gen, const char* plant_id);

// Generate a new reading ID
// Returns true on success, false on failure (buffer too small)
bool reading_id_generate(ReadingIdGenerator* gen, char* buffer, size_t buffer_size);

// Get the current sequence counter (for debugging)
uint32_t reading_id_get_sequence(const ReadingIdGenerator* gen);

// Reset the generator (e.g., on new session)
void reading_id_reset(ReadingIdGenerator* gen);

#endif // READING_ID_H