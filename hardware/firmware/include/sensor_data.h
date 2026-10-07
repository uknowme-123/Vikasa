// Vikāsa ESP32 Firmware - Sensor Data Model
// Matches the backend schema exactly (backend/app/schemas/sensor.py)
// This file defines the payload structure sent to POST /api/sensor-data

#ifndef SENSOR_DATA_H
#define SENSOR_DATA_H

#include <Arduino.h>
#include "config.h"

// Forward declaration
struct SensorReading;

// Optical measurement rules enforcement
// These are compile-time assertions to prevent incorrect calculations
static_assert(REFLECTANCE_MIN == 0.0f && REFLECTANCE_MAX == 100.0f, "Reflectance range mismatch");
static_assert(NDVI_MIN == -1.0f && NDVI_MAX == 1.0f, "NDVI range mismatch");

// Sensor reading structure matching the 24-column Vikāsa schema
// All optional fields are represented as pointers (nullptr = not provided)
// Required fields: reading_id, plant_id, session_id, timestamp, operator_id
struct SensorReading {
    // Required identifiers
    char reading_id[MAX_READING_ID_LEN + 1];
    char plant_id[MAX_PLANT_ID_LEN + 1];
    char session_id[MAX_SESSION_ID_LEN + 1];
    char operator_id[MAX_OPERATOR_ID_LEN + 1];
    
    // Required timestamp (ISO 8601 UTC)
    char timestamp[32];  // "YYYY-MM-DDTHH:MM:SSZ" or "UNSYNCED"
    
    // Optional metadata
    char species[MAX_SPECIES_LEN + 1];
    char stress_type[MAX_STRESS_TYPE_LEN + 1];
    char health_label[MAX_HEALTH_LABEL_LEN + 1];
    char label_evidence[MAX_LABEL_EVIDENCE_LEN + 1];
    char notes[MAX_NOTES_LEN + 1];
    
    // Raw optical sensor readings (ADC counts, 0-65535)
    // These are RAW values from ADS1115 - NOT reflectance
    // nullptr/optional = not measured
    uint16_t* red_raw;
    uint16_t* nir_raw;
    uint16_t* red_dark;
    uint16_t* nir_dark;
    uint16_t* red_reference;
    uint16_t* nir_reference;
    
    // Calibrated reflectance (percentage, 0-100)
    // These MUST be computed from raw + dark + reference measurements
    // Cannot be computed from raw ADC alone
    float* red_reflectance;
    float* nir_reflectance;
    
    // Computed indices
    // NDVI MUST be computed from calibrated reflectance only
    // NEVER from raw ADC counts
    float* ndvi;
    
    // Environmental sensors
    float* temperature_c;
    float* humidity_pct;
    uint16_t* soil_moisture_raw;
    float* soil_moisture_pct;
    uint16_t* ambient_light_raw;
    
    // Development/testing marker
    // When DEVELOPMENT_MODE=1, test payloads should include this
    bool test_only;
    
    // Internal state
    bool timestamp_synced;
};

// Helper struct for managing optional values
// Allows clean representation of "not measured" vs "measured as zero"
struct OptionalUint16 {
    bool has_value;
    uint16_t value;
    
    OptionalUint16() : has_value(false), value(0) {}
    OptionalUint16(uint16_t v) : has_value(true), value(v) {}
    
    static OptionalUint16 empty() { return OptionalUint16(); }
    static OptionalUint16 of(uint16_t v) { return OptionalUint16(v); }
};

struct OptionalFloat {
    bool has_value;
    float value;
    
    OptionalFloat() : has_value(false), value(0.0f) {}
    OptionalFloat(float v) : has_value(true), value(v) {}
    
    static OptionalFloat empty() { return OptionalFloat(); }
    static OptionalFloat of(float v) { return OptionalFloat(v); }
};

struct OptionalString {
    bool has_value;
    char value[MAX_NOTES_LEN + 1];
    
    OptionalString() : has_value(false) { value[0] = '\0'; }
    OptionalString(const char* v) : has_value(v != nullptr) { 
        if (v) strncpy(value, v, MAX_NOTES_LEN); 
        value[MAX_NOTES_LEN] = '\0';
    }
    
    static OptionalString empty() { return OptionalString(); }
    static OptionalString of(const char* v) { return OptionalString(v); }
};

// Validation result
struct ValidationResult {
    bool valid;
    char error_message[256];
    
    ValidationResult() : valid(true) { error_message[0] = '\0'; }
    ValidationResult(const char* msg) : valid(false) { 
        strncpy(error_message, msg, 255); 
        error_message[255] = '\0';
    }
    
    static ValidationResult ok() { return ValidationResult(); }
    static ValidationResult fail(const char* msg) { return ValidationResult(msg); }
};

// Function declarations
ValidationResult validate_sensor_reading(const SensorReading* reading);
void init_sensor_reading(SensorReading* reading);
void free_sensor_reading(SensorReading* reading);
size_t serialize_sensor_reading(const SensorReading* reading, char* buffer, size_t buffer_size);
bool is_timestamp_synced(const SensorReading* reading);

// Optional field setters (for numeric values with validation)
bool set_red_raw(SensorReading* reading, uint16_t value);
bool set_nir_raw(SensorReading* reading, uint16_t value);
bool set_red_dark(SensorReading* reading, uint16_t value);
bool set_nir_dark(SensorReading* reading, uint16_t value);
bool set_red_reference(SensorReading* reading, uint16_t value);
bool set_nir_reference(SensorReading* reading, uint16_t value);
bool set_red_reflectance(SensorReading* reading, float value);
bool set_nir_reflectance(SensorReading* reading, float value);
bool set_ndvi(SensorReading* reading, float value);
bool set_temperature_c(SensorReading* reading, float value);
bool set_humidity_pct(SensorReading* reading, float value);
bool set_soil_moisture_raw(SensorReading* reading, uint16_t value);
bool set_soil_moisture_pct(SensorReading* reading, float value);
bool set_ambient_light_raw(SensorReading* reading, uint16_t value);

// Optional field setters (for string values)
void set_species(SensorReading* reading, const char* value);
void set_stress_type(SensorReading* reading, const char* value);
void set_health_label(SensorReading* reading, const char* value);
void set_label_evidence(SensorReading* reading, const char* value);
void set_notes(SensorReading* reading, const char* value);

#endif // SENSOR_DATA_H