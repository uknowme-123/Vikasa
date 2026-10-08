// Vikāsa ESP32 Firmware - Main Configuration Header
// This file defines the firmware configuration structure and defaults.
// Device-specific secrets should be in secrets.h (excluded from git).

#ifndef CONFIG_H
#define CONFIG_H

#include <Arduino.h>

// Firmware Version
#define FIRMWARE_VERSION "0.1.0"
#define FIRMWARE_BUILD_DATE __DATE__ " " __TIME__

// Include secrets if available (secrets.h is gitignored)
#if __has_include("secrets.h")
#include "secrets.h"
#elif __has_include("../config/secrets.h")
#include "../config/secrets.h"
#endif

// Configuration defaults (can be overridden by secrets.h)
#ifndef WIFI_SSID
#define WIFI_SSID ""
#endif

#ifndef WIFI_PASSWORD
#define WIFI_PASSWORD ""
#endif

#ifndef API_BASE_URL
// Override this with the LAN-reachable Flask host in secrets.h or a build flag.
#define API_BASE_URL "http://YOUR_API_HOST:5000/api"
#endif

#ifndef DEVICE_PLANT_ID
#define DEVICE_PLANT_ID "PLANT-UNKNOWN"
#endif

#ifndef DEVICE_SESSION_ID
#define DEVICE_SESSION_ID "SESSION-UNKNOWN"
#endif

#ifndef DEVICE_OPERATOR_ID
#define DEVICE_OPERATOR_ID "OPERATOR-UNKNOWN"
#endif

#ifndef WIFI_CONNECT_TIMEOUT_MS
#define WIFI_CONNECT_TIMEOUT_MS 15000
#endif

#ifndef WIFI_RECONNECT_INTERVAL_MS
#define WIFI_RECONNECT_INTERVAL_MS 30000
#endif

#ifndef HTTP_REQUEST_TIMEOUT_MS
#define HTTP_REQUEST_TIMEOUT_MS 10000
#endif

#ifndef HTTP_MAX_RETRIES
#define HTTP_MAX_RETRIES 3
#endif

#ifndef HTTP_RETRY_DELAY_MS
#define HTTP_RETRY_DELAY_MS 2000
#endif

#ifndef NTP_SERVER
#define NTP_SERVER "pool.ntp.org"
#endif

#ifndef NTP_TIMEZONE_OFFSET_SEC
#define NTP_TIMEZONE_OFFSET_SEC 0
#endif

#ifndef NTP_SYNC_INTERVAL_MS
#define NTP_SYNC_INTERVAL_MS 3600000
#endif

#ifndef DEVELOPMENT_MODE
#define DEVELOPMENT_MODE 0
#endif

// Payload limits
#define MAX_READING_ID_LEN 64
#define MAX_PLANT_ID_LEN 64
#define MAX_SESSION_ID_LEN 64
#define MAX_SPECIES_LEN 128
#define MAX_STRESS_TYPE_LEN 32
#define MAX_HEALTH_LABEL_LEN 32
#define MAX_LABEL_EVIDENCE_LEN 256
#define MAX_OPERATOR_ID_LEN 64
#define MAX_NOTES_LEN 512
#define MAX_JSON_PAYLOAD_SIZE 4096

// Sensor reading value limits (matching backend schema)
#define ADC_MAX_VALUE 65535
#define REFLECTANCE_MIN 0.0f
#define REFLECTANCE_MAX 100.0f
#define NDVI_MIN -1.0f
#define NDVI_MAX 1.0f
#define TEMP_MIN -50.0f
#define TEMP_MAX 100.0f
#define HUMIDITY_MIN 0.0f
#define HUMIDITY_MAX 100.0f
#define SOIL_MOISTURE_PCT_MIN 0.0f
#define SOIL_MOISTURE_PCT_MAX 100.0f

// Reading ID format: VIKASA-{PLANT_ID}-{TIMESTAMP_MS}-{SEQUENCE}
// Example: VIKASA-PLANT-001-1700000000000-001
#define READING_ID_PREFIX "VIKASA"
#define READING_ID_MAX_LEN 64

// Timestamp handling
#define TIMESTAMP_UNSYNCED_INDICATOR "UNSYNCED"
#define TIMESTAMP_FORMAT "%Y-%m-%dT%H:%M:%SZ"

// Hardware pin definitions for PCB CUPID GLYPH C3 (ESP32-C3-MINI-1-N4)
#define PIN_I2C_SDA 4
#define PIN_I2C_SCL 5
#define PIN_DHT22 10
#define PIN_SOIL_MOISTURE 2
#define PIN_AMBIENT_LIGHT 3
#define PIN_RED_LED 6
#define PIN_NIR_LED 7
#define PIN_ADS1115_ADDR 0x48

// ADS1115 channels for optical sensors (ADS1115 has 4 single-ended channels: 0-3)
// Reference measurements share channels with sample readings but are taken at different times
#define ADS1115_CHANNEL_RED 0
#define ADS1115_CHANNEL_NIR 1
#define ADS1115_CHANNEL_RED_DARK 2
#define ADS1115_CHANNEL_NIR_DARK 3
// Reference channels reuse sample channels (measured with reference standard in place)
#define ADS1115_CHANNEL_RED_REF ADS1115_CHANNEL_RED
#define ADS1115_CHANNEL_NIR_REF ADS1115_CHANNEL_NIR
// Soil and ambient light - can be on separate ADS1115 or ESP32 ADC
#define ADS1115_CHANNEL_SOIL 2  // Shared with RED_DARK - use mux or separate ADC
#define ADS1115_CHANNEL_LIGHT 3  // Shared with NIR_DARK - use mux or separate ADC

// ADC gain setting for ADS1115 (4.096V full-scale range)
#define ADS1115_GAIN ADS1115_GAIN_4_096V

// Logging
#define LOG_LEVEL_INFO 1
#define LOG_LEVEL_DEBUG 2
#define LOG_LEVEL_ERROR 3

#if DEVELOPMENT_MODE
#define CURRENT_LOG_LEVEL LOG_LEVEL_DEBUG
#else
#define CURRENT_LOG_LEVEL LOG_LEVEL_INFO
#endif

// Compile-time configuration validation
#if (WIFI_CONNECT_TIMEOUT_MS < 5000)
#error "WIFI_CONNECT_TIMEOUT_MS must be at least 5000ms"
#endif

#if (HTTP_MAX_RETRIES < 0 || HTTP_MAX_RETRIES > 10)
#error "HTTP_MAX_RETRIES must be between 0 and 10"
#endif

#if (HTTP_REQUEST_TIMEOUT_MS < 1000)
#error "HTTP_REQUEST_TIMEOUT_MS must be at least 1000ms"
#endif

#endif // CONFIG_H