// Vikāsa ESP32 Firmware - Main Application Implementation

#include "vikasa_firmware.h"
#include "sensor_data.h"
#include <string.h>
#include <stdio.h>

#if DEVELOPMENT_MODE
#include <HardwareSerial.h>
#endif

// Default measurement interval (5 minutes)
#define DEFAULT_MEASUREMENT_INTERVAL_MS (5 * 60 * 1000)
#define MAX_CONSECUTIVE_FAILURES 5

// Wi-Fi callbacks
static void on_wifi_connected() {
#if DEVELOPMENT_MODE
    Serial.println("[FW] Wi-Fi connected callback");
#endif
}

static void on_wifi_disconnected() {
#if DEVELOPMENT_MODE
    Serial.println("[FW] Wi-Fi disconnected callback");
#endif
}

static void on_wifi_failed(const char* reason) {
#if DEVELOPMENT_MODE
    Serial.printf("[FW] Wi-Fi connection failed: %s\n", reason);
#endif
}

// Initialize firmware
bool vikasa_init(VikasaFirmware* fw) {
    if (!fw) return false;
    
    memset(fw, 0, sizeof(VikasaFirmware));
    
    // Set defaults
    strncpy(fw->plant_id, DEVICE_PLANT_ID, MAX_PLANT_ID_LEN);
    strncpy(fw->session_id, DEVICE_SESSION_ID, MAX_SESSION_ID_LEN);
    strncpy(fw->operator_id, DEVICE_OPERATOR_ID, MAX_OPERATOR_ID_LEN);
    fw->species[0] = '\0';
    
    fw->measurement_interval_ms = DEFAULT_MEASUREMENT_INTERVAL_MS;
    fw->consecutive_failures = 0;
    fw->measurement_in_progress = false;
    
    // Initialize subsystems
    reading_id_init(&fw->reading_id_gen, fw->plant_id);
    timestamp_init(&fw->timestamp_mgr);
    wifi_init(&fw->wifi_mgr);
    api_client_init(&fw->api_client);
    hardware_manager_init_default(&fw->hw_mgr);
    
    // Set Wi-Fi credentials from config
    wifi_set_credentials(&fw->wifi_mgr, WIFI_SSID, WIFI_PASSWORD);
    
    // Set Wi-Fi callbacks
    wifi_set_callbacks(&fw->wifi_mgr, on_wifi_connected, on_wifi_disconnected, on_wifi_failed);
    
    // Initialize hardware
    if (!fw->hw_mgr.init(&fw->hw_mgr)) {
#if DEVELOPMENT_MODE
        Serial.println("[FW] Hardware initialization failed");
#endif
        // Don't fail completely - allow development mode operation
    }
    
    // Attempt initial Wi-Fi connection
    wifi_connect(&fw->wifi_mgr);
    
    // Attempt NTP sync
    timestamp_sync_ntp(&fw->timestamp_mgr);
    
    fw->initialized = true;
    
#if DEVELOPMENT_MODE
    Serial.println("[FW] Vikāsa firmware initialized");
    Serial.printf("[FW] Plant ID: %s\n", fw->plant_id);
    Serial.printf("[FW] Session ID: %s\n", fw->session_id);
    Serial.printf("[FW] Operator ID: %s\n", fw->operator_id);
    Serial.printf("[FW] API URL: %s\n", fw->api_client.base_url);
    Serial.printf("[FW] Development mode: %s\n", DEVELOPMENT_MODE ? "ENABLED" : "DISABLED");
#endif
    
    return true;
}

// Main loop
void vikasa_loop(VikasaFirmware* fw) {
    if (!fw || !fw->initialized) return;
    
    uint32_t now_ms = millis();
    
    // Handle Wi-Fi maintenance
    wifi_loop(&fw->wifi_mgr);
    
    // Periodic NTP sync
    if (fw->timestamp_mgr.ntp_configured && 
        (!timestamp_is_synced(&fw->timestamp_mgr) ||
         now_ms - fw->timestamp_mgr.last_sync_ms > NTP_SYNC_INTERVAL_MS)) {
        timestamp_sync_ntp(&fw->timestamp_mgr);
    }
    
    // Periodic measurement
    if (fw->measurement_interval_ms > 0 && 
        !fw->measurement_in_progress &&
        now_ms - fw->last_measurement_ms >= fw->measurement_interval_ms) {
        vikasa_measure_once(fw);
    }
    
    // Check for max consecutive failures
    if (fw->consecutive_failures >= MAX_CONSECUTIVE_FAILURES) {
#if DEVELOPMENT_MODE
        Serial.printf("[FW] Max consecutive failures reached (%d), pausing measurements\n", 
                      MAX_CONSECUTIVE_FAILURES);
#endif
        // Could implement deep sleep or other recovery here
    }
}

// Trigger a single measurement cycle
bool vikasa_measure_once(VikasaFirmware* fw) {
    if (!fw || !fw->initialized) return false;
    if (fw->measurement_in_progress) return false;
    
    fw->measurement_in_progress = true;
    fw->last_measurement_ms = millis();
    
#if DEVELOPMENT_MODE || defined(VIKASA_SERIAL_DIAGNOSTICS)
    Serial.println("[FW] Starting measurement cycle...");
#endif

    // Flask rejects the explicit UNSYNCED marker, so defer the measurement
    // until a valid UTC timestamp is available.
    if (!timestamp_is_synced(&fw->timestamp_mgr)) {
        timestamp_sync_ntp(&fw->timestamp_mgr);
        if (!timestamp_is_synced(&fw->timestamp_mgr)) {
#if DEVELOPMENT_MODE || defined(VIKASA_SERIAL_DIAGNOSTICS)
            Serial.println("[FW] Measurement deferred: NTP time not synchronized");
#endif
            fw->measurement_in_progress = false;
            fw->consecutive_failures++;
            if (fw->on_error) {
                fw->on_error("Timestamp not synchronized; measurement deferred");
            }
            return false;
        }
    }
    
    // 1. Read all sensors
    SensorSuiteReading hw_reading = fw->hw_mgr.read_all(&fw->hw_mgr);
    
    if (!hw_reading.valid) {
        fw->measurement_in_progress = false;
        fw->consecutive_failures++;
        
        char error_msg[256];
        snprintf(error_msg, sizeof(error_msg), "Hardware read failed: %s", hw_reading.error_message);
        
        if (fw->on_error) fw->on_error(error_msg);
        
#if DEVELOPMENT_MODE || defined(VIKASA_SERIAL_DIAGNOSTICS)
        Serial.printf("[FW] Measurement failed: %s\n", error_msg);
#endif
        return false;
    }
    
    // 2. Build sensor reading payload
    SensorReading reading;
    init_sensor_reading(&reading);
    
    // Generate reading ID
    if (!reading_id_generate(&fw->reading_id_gen, reading.reading_id, sizeof(reading.reading_id))) {
        fw->measurement_in_progress = false;
        fw->consecutive_failures++;
        if (fw->on_error) fw->on_error("Failed to generate reading_id");
        return false;
    }
    
    // Set required identifiers
    strncpy(reading.plant_id, fw->plant_id, MAX_PLANT_ID_LEN);
    strncpy(reading.session_id, fw->session_id, MAX_SESSION_ID_LEN);
    strncpy(reading.operator_id, fw->operator_id, MAX_OPERATOR_ID_LEN);
    
    // Set timestamp
    bool ts_synced = false;
    timestamp_get_iso8601(&fw->timestamp_mgr, reading.timestamp, sizeof(reading.timestamp), &ts_synced);
    reading.timestamp_synced = ts_synced;
    
    // Set optional metadata
    if (strlen(fw->species) > 0) {
        set_species(&reading, fw->species);
    }
    
    // IMPORTANT: The ESP32 must NOT invent health labels
    // The ESP32 must NOT infer stress_type
    // The ESP32 must NOT calculate a health classification
    // These fields remain empty (null) unless explicitly set by operator
    
    // 3. Populate optical readings (raw ADC values only)
    // Raw readings are NOT reflectance - they are raw ADC counts
    if (hw_reading.red_raw.valid) set_red_raw(&reading, hw_reading.red_raw.adc_raw);
    if (hw_reading.nir_raw.valid) set_nir_raw(&reading, hw_reading.nir_raw.adc_raw);
    if (hw_reading.red_dark.valid) set_red_dark(&reading, hw_reading.red_dark.adc_raw);
    if (hw_reading.nir_dark.valid) set_nir_dark(&reading, hw_reading.nir_dark.adc_raw);
    if (hw_reading.red_reference.valid) set_red_reference(&reading, hw_reading.red_reference.adc_raw);
    if (hw_reading.nir_reference.valid) set_nir_reference(&reading, hw_reading.nir_reference.adc_raw);
    
    // 4. Populate calibrated reflectance (if available and valid)
    // CRITICAL: Only set if reflectance calculation is valid
    if (hw_reading.reflectance.valid) {
        set_red_reflectance(&reading, hw_reading.reflectance.red_reflectance_pct);
        set_nir_reflectance(&reading, hw_reading.reflectance.nir_reflectance_pct);
        // NDVI only if both reflectance values are present (enforced by setter)
        set_ndvi(&reading, hw_reading.reflectance.ndvi);
    }
    
    // 5. Populate environmental sensors
    if (hw_reading.dht22.valid) {
        set_temperature_c(&reading, hw_reading.dht22.temperature_c);
        set_humidity_pct(&reading, hw_reading.dht22.humidity_pct);
    }
    if (hw_reading.soil.valid) {
        set_soil_moisture_raw(&reading, hw_reading.soil.raw_adc);
        set_soil_moisture_pct(&reading, hw_reading.soil.moisture_pct);
    }
    if (hw_reading.ambient.valid) {
        set_ambient_light_raw(&reading, hw_reading.ambient.raw_adc);
    }
    
    // 6. Validate payload before sending
    ValidationResult vr = validate_sensor_reading(&reading);
    if (!vr.valid) {
        fw->measurement_in_progress = false;
        fw->consecutive_failures++;
        
        if (fw->on_error) fw->on_error(vr.error_message);
        
#if DEVELOPMENT_MODE || defined(VIKASA_SERIAL_DIAGNOSTICS)
        Serial.printf("[FW] Payload validation failed: %s\n", vr.error_message);
#endif
        free_sensor_reading(&reading);
        return false;
    }
    
    // 7. Send to API (if Wi-Fi connected)
    ApiResponseCode api_result = API_NOT_CONNECTED;
    
    if (wifi_is_connected(&fw->wifi_mgr)) {
        api_result = api_client_send_reading(&fw->api_client, &reading);
        
        if (api_result == API_SUCCESS) {
            fw->consecutive_failures = 0;
#if DEVELOPMENT_MODE
            Serial.printf("[FW] Measurement sent successfully: %s\n", reading.reading_id);
#endif
        } else if (api_result == API_DUPLICATE_ERROR) {
            // Duplicate reading_id - generate new one and retry once
#if DEVELOPMENT_MODE
            Serial.printf("[FW] Duplicate reading_id, regenerating...\n");
#endif
            reading_id_generate(&fw->reading_id_gen, reading.reading_id, sizeof(reading.reading_id));
            api_result = api_client_send_reading(&fw->api_client, &reading);
            
            if (api_result == API_SUCCESS) {
                fw->consecutive_failures = 0;
            } else {
                fw->consecutive_failures++;
            }
        } else if (api_result == API_VALIDATION_ERROR) {
            // Backend validation failed - payload issue
            fw->consecutive_failures++;
#if DEVELOPMENT_MODE
            Serial.printf("[FW] Backend validation error: %s\n", api_client_get_last_error(&fw->api_client));
#endif
        } else {
            // Network or server error
            fw->consecutive_failures++;
#if DEVELOPMENT_MODE
            Serial.printf("[FW] API error: %s\n", api_client_get_last_error(&fw->api_client));
#endif
        }
    } else {
#if DEVELOPMENT_MODE || defined(VIKASA_SERIAL_DIAGNOSTICS)
        Serial.println("[FW] Wi-Fi not connected, measurement not sent");
#endif
    }
    
    // 8. Callback
    if (fw->on_measurement_complete) {
        fw->on_measurement_complete(&reading, api_result);
    }
    
    // Cleanup
    free_sensor_reading(&reading);
    fw->measurement_in_progress = false;
    
    return (api_result == API_SUCCESS);
}

// Get firmware status as JSON
void vikasa_get_status_json(const VikasaFirmware* fw, char* buffer, size_t buffer_size) {
    if (!fw || !buffer || buffer_size == 0) return;
    
    char ip_buf[16];
    wifi_get_ip(&fw->wifi_mgr, ip_buf, sizeof(ip_buf));
    
    bool ts_synced = timestamp_is_synced(&fw->timestamp_mgr);
    char ts_buf[32];
    timestamp_get_iso8601(&fw->timestamp_mgr, ts_buf, sizeof(ts_buf), &ts_synced);
    
    snprintf(buffer, buffer_size,
        "{"
        "\"firmware_version\":\"%s\","
        "\"plant_id\":\"%s\","
        "\"session_id\":\"%s\","
        "\"operator_id\":\"%s\","
        "\"wifi_state\":\"%s\","
        "\"wifi_ip\":\"%s\","
        "\"wifi_rssi\":%d,"
        "\"timestamp_synced\":%s,"
        "\"timestamp\":\"%s\","
        "\"last_measurement_ms\":%lu,"
        "\"measurement_interval_ms\":%lu,"
        "\"consecutive_failures\":%d,"
        "\"api_configured\":%s,"
        "\"hardware_initialized\":%s,"
        "\"development_mode\":%s"
        "}",
        FIRMWARE_VERSION,
        fw->plant_id,
        fw->session_id,
        fw->operator_id,
        wifi_state_str(wifi_get_state(&fw->wifi_mgr)),
        ip_buf[0] ? ip_buf : "N/A",
        wifi_get_rssi(&fw->wifi_mgr),
        ts_synced ? "true" : "false",
        ts_buf,
        fw->last_measurement_ms,
        fw->measurement_interval_ms,
        fw->consecutive_failures,
        api_client_is_configured(&fw->api_client) ? "true" : "false",
        fw->hw_mgr.initialized ? "true" : "false",
        DEVELOPMENT_MODE ? "true" : "false"
    );
}

void vikasa_set_interval(VikasaFirmware* fw, uint32_t interval_ms) {
    if (fw) fw->measurement_interval_ms = interval_ms;
}

void vikasa_set_plant_id(VikasaFirmware* fw, const char* plant_id) {
    if (fw && plant_id && strlen(plant_id) <= MAX_PLANT_ID_LEN) {
        strncpy(fw->plant_id, plant_id, MAX_PLANT_ID_LEN);
        reading_id_init(&fw->reading_id_gen, fw->plant_id);
    }
}

void vikasa_set_session_id(VikasaFirmware* fw, const char* session_id) {
    if (fw && session_id && strlen(session_id) <= MAX_SESSION_ID_LEN) {
        strncpy(fw->session_id, session_id, MAX_SESSION_ID_LEN);
    }
}

void vikasa_set_operator_id(VikasaFirmware* fw, const char* operator_id) {
    if (fw && operator_id && strlen(operator_id) <= MAX_OPERATOR_ID_LEN) {
        strncpy(fw->operator_id, operator_id, MAX_OPERATOR_ID_LEN);
    }
}

void vikasa_set_species(VikasaFirmware* fw, const char* species) {
    if (fw && species && strlen(species) <= MAX_SPECIES_LEN) {
        strncpy(fw->species, species, MAX_SPECIES_LEN);
    }
}