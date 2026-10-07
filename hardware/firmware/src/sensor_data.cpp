// Vikāsa ESP32 Firmware - Sensor Data Model Implementation
// Matches the backend schema exactly

#include "sensor_data.h"
#include <string.h>
#include <stdlib.h>
#include <stdio.h>
#include <math.h>

// Initialize a sensor reading with defaults
void init_sensor_reading(SensorReading* reading) {
    if (!reading) return;
    
    memset(reading, 0, sizeof(SensorReading));
    
    // Set required fields to empty strings (will be filled before send)
    reading->reading_id[0] = '\0';
    reading->plant_id[0] = '\0';
    reading->session_id[0] = '\0';
    reading->operator_id[0] = '\0';
    reading->timestamp[0] = '\0';
    
    // Optional string fields
    reading->species[0] = '\0';
    reading->stress_type[0] = '\0';
    reading->health_label[0] = '\0';
    reading->label_evidence[0] = '\0';
    reading->notes[0] = '\0';
    
    // All optional numeric fields start as null (not measured)
    reading->red_raw = nullptr;
    reading->nir_raw = nullptr;
    reading->red_dark = nullptr;
    reading->nir_dark = nullptr;
    reading->red_reference = nullptr;
    reading->nir_reference = nullptr;
    reading->red_reflectance = nullptr;
    reading->nir_reflectance = nullptr;
    reading->ndvi = nullptr;
    reading->temperature_c = nullptr;
    reading->humidity_pct = nullptr;
    reading->soil_moisture_raw = nullptr;
    reading->soil_moisture_pct = nullptr;
    reading->ambient_light_raw = nullptr;
    
    // Development mode marker
    reading->test_only = (DEVELOPMENT_MODE == 1);
    
    // Timestamp state
    reading->timestamp_synced = false;
}

// Free dynamically allocated optional fields
void free_sensor_reading(SensorReading* reading) {
    if (!reading) return;
    
    // Free any allocated optional fields
    free(reading->red_raw);
    free(reading->nir_raw);
    free(reading->red_dark);
    free(reading->nir_dark);
    free(reading->red_reference);
    free(reading->nir_reference);
    free(reading->red_reflectance);
    free(reading->nir_reflectance);
    free(reading->ndvi);
    free(reading->temperature_c);
    free(reading->humidity_pct);
    free(reading->soil_moisture_raw);
    free(reading->soil_moisture_pct);
    free(reading->ambient_light_raw);
    
    // Reset pointers
    reading->red_raw = nullptr;
    reading->nir_raw = nullptr;
    reading->red_dark = nullptr;
    reading->nir_dark = nullptr;
    reading->red_reference = nullptr;
    reading->nir_reference = nullptr;
    reading->red_reflectance = nullptr;
    reading->nir_reflectance = nullptr;
    reading->ndvi = nullptr;
    reading->temperature_c = nullptr;
    reading->humidity_pct = nullptr;
    reading->soil_moisture_raw = nullptr;
    reading->soil_moisture_pct = nullptr;
    reading->ambient_light_raw = nullptr;
}

// Helper to set optional uint16_t field
static void set_optional_uint16(uint16_t** field, uint16_t value) {
    if (*field) {
        **field = value;
    } else {
        *field = (uint16_t*)malloc(sizeof(uint16_t));
        if (*field) **field = value;
    }
}

// Helper to set optional float field
static void set_optional_float(float** field, float value) {
    if (*field) {
        **field = value;
    } else {
        *field = (float*)malloc(sizeof(float));
        if (*field) **field = value;
    }
}

// Helper to clear optional field
static void clear_optional_uint16(uint16_t** field) {
    free(*field);
    *field = nullptr;
}

static void clear_optional_float(float** field) {
    free(*field);
    *field = nullptr;
}

// Setters for optional numeric fields (with validation)
bool set_red_raw(SensorReading* reading, uint16_t value) {
    if (value > ADC_MAX_VALUE) return false;
    set_optional_uint16(&reading->red_raw, value);
    return true;
}

bool set_nir_raw(SensorReading* reading, uint16_t value) {
    if (value > ADC_MAX_VALUE) return false;
    set_optional_uint16(&reading->nir_raw, value);
    return true;
}

bool set_red_dark(SensorReading* reading, uint16_t value) {
    if (value > ADC_MAX_VALUE) return false;
    set_optional_uint16(&reading->red_dark, value);
    return true;
}

bool set_nir_dark(SensorReading* reading, uint16_t value) {
    if (value > ADC_MAX_VALUE) return false;
    set_optional_uint16(&reading->nir_dark, value);
    return true;
}

bool set_red_reference(SensorReading* reading, uint16_t value) {
    if (value > ADC_MAX_VALUE) return false;
    set_optional_uint16(&reading->red_reference, value);
    return true;
}

bool set_nir_reference(SensorReading* reading, uint16_t value) {
    if (value > ADC_MAX_VALUE) return false;
    set_optional_uint16(&reading->nir_reference, value);
    return true;
}

bool set_red_reflectance(SensorReading* reading, float value) {
    if (value < REFLECTANCE_MIN || value > REFLECTANCE_MAX || isnan(value) || isinf(value)) return false;
    set_optional_float(&reading->red_reflectance, value);
    return true;
}

bool set_nir_reflectance(SensorReading* reading, float value) {
    if (value < REFLECTANCE_MIN || value > REFLECTANCE_MAX || isnan(value) || isinf(value)) return false;
    set_optional_float(&reading->nir_reflectance, value);
    return true;
}

bool set_ndvi(SensorReading* reading, float value) {
    // CRITICAL: NDVI must only be set if calibrated reflectance is available
    if (value < NDVI_MIN || value > NDVI_MAX || isnan(value) || isinf(value)) return false;
    if (!reading->red_reflectance || !reading->nir_reflectance) return false;
    set_optional_float(&reading->ndvi, value);
    return true;
}

bool set_temperature_c(SensorReading* reading, float value) {
    if (value < TEMP_MIN || value > TEMP_MAX || isnan(value) || isinf(value)) return false;
    set_optional_float(&reading->temperature_c, value);
    return true;
}

bool set_humidity_pct(SensorReading* reading, float value) {
    if (value < HUMIDITY_MIN || value > HUMIDITY_MAX || isnan(value) || isinf(value)) return false;
    set_optional_float(&reading->humidity_pct, value);
    return true;
}

bool set_soil_moisture_raw(SensorReading* reading, uint16_t value) {
    if (value > ADC_MAX_VALUE) return false;
    set_optional_uint16(&reading->soil_moisture_raw, value);
    return true;
}

bool set_soil_moisture_pct(SensorReading* reading, float value) {
    if (value < SOIL_MOISTURE_PCT_MIN || value > SOIL_MOISTURE_PCT_MAX || isnan(value) || isinf(value)) return false;
    set_optional_float(&reading->soil_moisture_pct, value);
    return true;
}

bool set_ambient_light_raw(SensorReading* reading, uint16_t value) {
    if (value > ADC_MAX_VALUE) return false;
    set_optional_uint16(&reading->ambient_light_raw, value);
    return true;
}

// Setters for optional string fields
void set_species(SensorReading* reading, const char* value) {
    if (value && strlen(value) <= MAX_SPECIES_LEN) {
        strncpy(reading->species, value, MAX_SPECIES_LEN);
        reading->species[MAX_SPECIES_LEN] = '\0';
    }
}

void set_stress_type(SensorReading* reading, const char* value) {
    if (value && strlen(value) <= MAX_STRESS_TYPE_LEN) {
        strncpy(reading->stress_type, value, MAX_STRESS_TYPE_LEN);
        reading->stress_type[MAX_STRESS_TYPE_LEN] = '\0';
    }
}

void set_health_label(SensorReading* reading, const char* value) {
    if (value && strlen(value) <= MAX_HEALTH_LABEL_LEN) {
        strncpy(reading->health_label, value, MAX_HEALTH_LABEL_LEN);
        reading->health_label[MAX_HEALTH_LABEL_LEN] = '\0';
    }
}

void set_label_evidence(SensorReading* reading, const char* value) {
    if (value && strlen(value) <= MAX_LABEL_EVIDENCE_LEN) {
        strncpy(reading->label_evidence, value, MAX_LABEL_EVIDENCE_LEN);
        reading->label_evidence[MAX_LABEL_EVIDENCE_LEN] = '\0';
    }
}

void set_notes(SensorReading* reading, const char* value) {
    if (value && strlen(value) <= MAX_NOTES_LEN) {
        strncpy(reading->notes, value, MAX_NOTES_LEN);
        reading->notes[MAX_NOTES_LEN] = '\0';
    }
}

// Validate sensor reading against backend schema requirements
ValidationResult validate_sensor_reading(const SensorReading* reading) {
    if (!reading) return ValidationResult::fail("Reading is null");
    
    // Required fields
    if (strlen(reading->reading_id) == 0) return ValidationResult::fail("reading_id is required");
    if (strlen(reading->plant_id) == 0) return ValidationResult::fail("plant_id is required");
    if (strlen(reading->session_id) == 0) return ValidationResult::fail("session_id is required");
    if (strlen(reading->operator_id) == 0) return ValidationResult::fail("operator_id is required");
    if (strlen(reading->timestamp) == 0) return ValidationResult::fail("timestamp is required");
    
    // reading_id format validation (matching backend: ^[A-Z0-9-]{1,64}$)
    if (strlen(reading->reading_id) > MAX_READING_ID_LEN) {
        return ValidationResult::fail("reading_id exceeds max length");
    }
    for (size_t i = 0; i < strlen(reading->reading_id); i++) {
        char c = reading->reading_id[i];
        if (!((c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '-')) {
            return ValidationResult::fail("reading_id contains invalid characters (only A-Z, 0-9, - allowed)");
        }
    }
    
    // plant_id, session_id, operator_id length
    if (strlen(reading->plant_id) > MAX_PLANT_ID_LEN) return ValidationResult::fail("plant_id too long");
    if (strlen(reading->session_id) > MAX_SESSION_ID_LEN) return ValidationResult::fail("session_id too long");
    if (strlen(reading->operator_id) > MAX_OPERATOR_ID_LEN) return ValidationResult::fail("operator_id too long");
    
    // Timestamp format check (basic)
    if (strcmp(reading->timestamp, TIMESTAMP_UNSYNCED_INDICATOR) != 0) {
        // Should be ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ
        if (strlen(reading->timestamp) < 19) {
            return ValidationResult::fail("timestamp format invalid (expected ISO 8601)");
        }
    }
    
    // Optional string field lengths
    if (strlen(reading->species) > MAX_SPECIES_LEN) return ValidationResult::fail("species too long");
    if (strlen(reading->stress_type) > MAX_STRESS_TYPE_LEN) return ValidationResult::fail("stress_type too long");
    if (strlen(reading->health_label) > MAX_HEALTH_LABEL_LEN) return ValidationResult::fail("health_label too long");
    if (strlen(reading->label_evidence) > MAX_LABEL_EVIDENCE_LEN) return ValidationResult::fail("label_evidence too long");
    if (strlen(reading->notes) > MAX_NOTES_LEN) return ValidationResult::fail("notes too long");
    
    // Optional numeric field validation
    if (reading->red_raw && *reading->red_raw > ADC_MAX_VALUE) return ValidationResult::fail("red_raw out of range");
    if (reading->nir_raw && *reading->nir_raw > ADC_MAX_VALUE) return ValidationResult::fail("nir_raw out of range");
    if (reading->red_dark && *reading->red_dark > ADC_MAX_VALUE) return ValidationResult::fail("red_dark out of range");
    if (reading->nir_dark && *reading->nir_dark > ADC_MAX_VALUE) return ValidationResult::fail("nir_dark out of range");
    if (reading->red_reference && *reading->red_reference > ADC_MAX_VALUE) return ValidationResult::fail("red_reference out of range");
    if (reading->nir_reference && *reading->nir_reference > ADC_MAX_VALUE) return ValidationResult::fail("nir_reference out of range");
    
    if (reading->red_reflectance) {
        float v = *reading->red_reflectance;
        if (v < REFLECTANCE_MIN || v > REFLECTANCE_MAX || isnan(v) || isinf(v)) {
            return ValidationResult::fail("red_reflectance out of range or invalid");
        }
    }
    if (reading->nir_reflectance) {
        float v = *reading->nir_reflectance;
        if (v < REFLECTANCE_MIN || v > REFLECTANCE_MAX || isnan(v) || isinf(v)) {
            return ValidationResult::fail("nir_reflectance out of range or invalid");
        }
    }
    
    // CRITICAL: If one reflectance is provided, both must be (backend validation)
    bool has_red_ref = reading->red_reflectance != nullptr;
    bool has_nir_ref = reading->nir_reflectance != nullptr;
    if (has_red_ref != has_nir_ref) {
        return ValidationResult::fail("Both red_reflectance and nir_reflectance must be provided together");
    }
    
    if (reading->ndvi) {
        float v = *reading->ndvi;
        if (v < NDVI_MIN || v > NDVI_MAX || isnan(v) || isinf(v)) {
            return ValidationResult::fail("ndvi out of range or invalid");
        }
        // CRITICAL: NDVI requires calibrated reflectance (backend validation)
        if (!has_red_ref || !has_nir_ref) {
            return ValidationResult::fail("NDVI requires calibrated reflectance values");
        }
    }
    
    if (reading->temperature_c) {
        float v = *reading->temperature_c;
        if (v < TEMP_MIN || v > TEMP_MAX || isnan(v) || isinf(v)) {
            return ValidationResult::fail("temperature_c out of range or invalid");
        }
    }
    
    if (reading->humidity_pct) {
        float v = *reading->humidity_pct;
        if (v < HUMIDITY_MIN || v > HUMIDITY_MAX || isnan(v) || isinf(v)) {
            return ValidationResult::fail("humidity_pct out of range or invalid");
        }
    }
    
    if (reading->soil_moisture_raw && *reading->soil_moisture_raw > ADC_MAX_VALUE) {
        return ValidationResult::fail("soil_moisture_raw out of range");
    }
    
    if (reading->soil_moisture_pct) {
        float v = *reading->soil_moisture_pct;
        if (v < SOIL_MOISTURE_PCT_MIN || v > SOIL_MOISTURE_PCT_MAX || isnan(v) || isinf(v)) {
            return ValidationResult::fail("soil_moisture_pct out of range or invalid");
        }
    }
    
    if (reading->ambient_light_raw && *reading->ambient_light_raw > ADC_MAX_VALUE) {
        return ValidationResult::fail("ambient_light_raw out of range");
    }
    
    return ValidationResult::ok();
}

// Serialize sensor reading to JSON
size_t serialize_sensor_reading(const SensorReading* reading, char* buffer, size_t buffer_size) {
    if (!reading || !buffer || buffer_size == 0) return 0;
    
    ValidationResult vr = validate_sensor_reading(reading);
    if (!vr.valid) {
        // In development mode, we still serialize but log the error
#if DEVELOPMENT_MODE
        Serial.printf("[WARN] Sensor reading validation failed: %s\n", vr.error_message);
#else
        return 0;
#endif
    }
    
    size_t offset = 0;
    int written;
    
    // Start JSON object
    written = snprintf(buffer + offset, buffer_size - offset, "{");
    if (written < 0 || (size_t)written >= buffer_size - offset) return 0;
    offset += written;
    
    // Required fields
    #define ADD_STRING_FIELD(name, value) \
        do { \
            written = snprintf(buffer + offset, buffer_size - offset, "\"%s\":\"%s\",", name, value); \
            if (written < 0 || (size_t)written >= buffer_size - offset) return 0; \
            offset += written; \
        } while(0)
    
    #define ADD_STRING_FIELD_OPT(name, value) \
        do { \
            if (strlen(value) > 0) { \
                written = snprintf(buffer + offset, buffer_size - offset, "\"%s\":\"%s\",", name, value); \
                if (written < 0 || (size_t)written >= buffer_size - offset) return 0; \
                offset += written; \
            } \
        } while(0)
    
    #define ADD_UINT16_FIELD_OPT(name, ptr) \
        do { \
            if (ptr) { \
                written = snprintf(buffer + offset, buffer_size - offset, "\"%s\":%u,", name, *ptr); \
                if (written < 0 || (size_t)written >= buffer_size - offset) return 0; \
                offset += written; \
            } \
        } while(0)
    
    #define ADD_FLOAT_FIELD_OPT(name, ptr) \
        do { \
            if (ptr) { \
                written = snprintf(buffer + offset, buffer_size - offset, "\"%s\":%.3f,", name, *ptr); \
                if (written < 0 || (size_t)written >= buffer_size - offset) return 0; \
                offset += written; \
            } \
        } while(0)
    
    ADD_STRING_FIELD("reading_id", reading->reading_id);
    ADD_STRING_FIELD("plant_id", reading->plant_id);
    ADD_STRING_FIELD("session_id", reading->session_id);
    ADD_STRING_FIELD("timestamp", reading->timestamp);
    ADD_STRING_FIELD("operator_id", reading->operator_id);
    
    // Optional string fields
    ADD_STRING_FIELD_OPT("species", reading->species);
    ADD_STRING_FIELD_OPT("stress_type", reading->stress_type);
    ADD_STRING_FIELD_OPT("health_label", reading->health_label);
    ADD_STRING_FIELD_OPT("label_evidence", reading->label_evidence);
    ADD_STRING_FIELD_OPT("notes", reading->notes);
    
    // Optional numeric fields
    ADD_UINT16_FIELD_OPT("red_raw", reading->red_raw);
    ADD_UINT16_FIELD_OPT("nir_raw", reading->nir_raw);
    ADD_UINT16_FIELD_OPT("red_dark", reading->red_dark);
    ADD_UINT16_FIELD_OPT("nir_dark", reading->nir_dark);
    ADD_UINT16_FIELD_OPT("red_reference", reading->red_reference);
    ADD_UINT16_FIELD_OPT("nir_reference", reading->nir_reference);
    
    ADD_FLOAT_FIELD_OPT("red_reflectance", reading->red_reflectance);
    ADD_FLOAT_FIELD_OPT("nir_reflectance", reading->nir_reflectance);
    ADD_FLOAT_FIELD_OPT("ndvi", reading->ndvi);
    ADD_FLOAT_FIELD_OPT("temperature_c", reading->temperature_c);
    ADD_FLOAT_FIELD_OPT("humidity_pct", reading->humidity_pct);
    ADD_UINT16_FIELD_OPT("soil_moisture_raw", reading->soil_moisture_raw);
    ADD_FLOAT_FIELD_OPT("soil_moisture_pct", reading->soil_moisture_pct);
    ADD_UINT16_FIELD_OPT("ambient_light_raw", reading->ambient_light_raw);
    
    // Development mode marker
    if (reading->test_only) {
        written = snprintf(buffer + offset, buffer_size - offset, "\"test_only\":true,");
        if (written < 0 || (size_t)written >= buffer_size - offset) return 0;
        offset += written;
    }
    
    // Remove trailing comma if present
    if (offset > 1 && buffer[offset - 1] == ',') {
        offset--;
    }
    
    // Close JSON object
    written = snprintf(buffer + offset, buffer_size - offset, "}");
    if (written < 0 || (size_t)written >= buffer_size - offset) return 0;
    offset += written;
    
    buffer[offset] = '\0';
    return offset;
}

bool is_timestamp_synced(const SensorReading* reading) {
    return reading && reading->timestamp_synced && 
           strcmp(reading->timestamp, TIMESTAMP_UNSYNCED_INDICATOR) != 0;
}