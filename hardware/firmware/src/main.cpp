// Vikāsa ESP32 Firmware - Main Entry Point
// Arduino sketch entry point

#include <Arduino.h>
#include "vikasa_firmware.h"

// Global firmware instance
VikasaFirmware g_firmware;

// Measurement complete callback
void on_measurement_complete(const SensorReading* reading, ApiResponseCode result) {
    // Could blink LED, log to serial, etc.
#if DEVELOPMENT_MODE
    Serial.printf("[MAIN] Measurement complete: %s, result=%d\n", 
                  reading ? reading->reading_id : "NULL", result);
#endif
}

// Error callback
void on_error(const char* message) {
#if DEVELOPMENT_MODE
    Serial.printf("[MAIN] Error: %s\n", message);
#endif
}

void setup() {
    // Initialize serial
    Serial.begin(115200);
    delay(1000);  // Allow serial monitor to connect
    
    Serial.println();
    Serial.println("=== Vikāsa ESP32 Firmware ===");
    Serial.printf("Version: %s\n", FIRMWARE_VERSION);
    Serial.printf("Build: %s\n", FIRMWARE_BUILD_DATE);
    Serial.printf("Development Mode: %s\n", DEVELOPMENT_MODE ? "ENABLED" : "DISABLED");
    
    // Initialize firmware
    if (!vikasa_init(&g_firmware)) {
        Serial.println("[FATAL] Firmware initialization failed!");
        while (1) {
            delay(1000);
        }
    }
    
    // Set callbacks
    g_firmware.on_measurement_complete = on_measurement_complete;
    g_firmware.on_error = on_error;
    
    // Print initial status
    char status_json[1024];
    vikasa_get_status_json(&g_firmware, status_json, sizeof(status_json));
    Serial.printf("[STATUS] %s\n", status_json);
    
    Serial.println("=== Setup complete ===");
}

void loop() {
    // Run firmware main loop
    vikasa_loop(&g_firmware);
    
    // Small delay to prevent watchdog issues
    delay(10);
    
    // Periodic status print (every 30 seconds in dev mode)
#if DEVELOPMENT_MODE
    static uint32_t last_status_print = 0;
    if (millis() - last_status_print > 30000) {
        char status_json[1024];
        vikasa_get_status_json(&g_firmware, status_json, sizeof(status_json));
        Serial.printf("[STATUS] %s\n", status_json);
        last_status_print = millis();
    }
#endif
}