// Vikāsa ESP32 Firmware - Main Application
// Coordinates all subsystems and implements the measurement cycle

#ifndef VIKASA_FIRMWARE_H
#define VIKASA_FIRMWARE_H

#include <Arduino.h>
#include "config.h"
#include "sensor_data.h"
#include "reading_id.h"
#include "timestamp.h"
#include "wifi_manager.h"
#include "api_client.h"
#include "hardware_interfaces.h"

// Main firmware state
struct VikasaFirmware {
    // Subsystems
    ReadingIdGenerator reading_id_gen;
    TimestampManager timestamp_mgr;
    WifiManager wifi_mgr;
    ApiClient api_client;
    HardwareManager hw_mgr;
    
    // Configuration
    char plant_id[MAX_PLANT_ID_LEN + 1];
    char session_id[MAX_SESSION_ID_LEN + 1];
    char operator_id[MAX_OPERATOR_ID_LEN + 1];
    char species[MAX_SPECIES_LEN + 1];
    
    // State
    bool initialized;
    bool measurement_in_progress;
    uint32_t last_measurement_ms;
    uint32_t measurement_interval_ms;
    int consecutive_failures;
    
    // Callbacks
    void (*on_measurement_complete)(const SensorReading* reading, ApiResponseCode result);
    void (*on_error)(const char* message);
};

// Initialize firmware
bool vikasa_init(VikasaFirmware* fw);

// Main loop - call periodically
void vikasa_loop(VikasaFirmware* fw);

// Trigger a single measurement cycle
bool vikasa_measure_once(VikasaFirmware* fw);

// Get firmware status as JSON string
void vikasa_get_status_json(const VikasaFirmware* fw, char* buffer, size_t buffer_size);

// Set measurement interval (0 = manual only)
void vikasa_set_interval(VikasaFirmware* fw, uint32_t interval_ms);

// Set device identifiers
void vikasa_set_plant_id(VikasaFirmware* fw, const char* plant_id);
void vikasa_set_session_id(VikasaFirmware* fw, const char* session_id);
void vikasa_set_operator_id(VikasaFirmware* fw, const char* operator_id);
void vikasa_set_species(VikasaFirmware* fw, const char* species);

#endif // VIKASA_FIRMWARE_H