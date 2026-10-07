// Vikāsa ESP32 Firmware - Hardware Abstraction Implementation
// Provides stub implementations for development mode
// Real hardware drivers to be implemented later

#include "hardware_interfaces.h"
#include <Wire.h>
#include <string.h>
#include <stdio.h>
#include <math.h>

#if DEVELOPMENT_MODE
#include <HardwareSerial.h>
#endif

// ============================================================================
// ADS1115 Stub Implementation
// ============================================================================

static bool ads1115_stub_init(Ads1115Driver* drv, uint8_t address) {
    if (!drv) return false;
    
    drv->i2c_address = address;
    drv->gain = ADS1115_GAIN_4_096V;
    drv->data_rate = ADS1115_DR_128SPS;
    drv->initialized = true;
    
#if DEVELOPMENT_MODE
    Serial.printf("[ADS1115] Stub initialized at address 0x%02X\n", address);
#endif
    return true;
}

static bool ads1115_stub_set_gain(Ads1115Driver* drv, Ads1115Gain gain) {
    if (!drv || !drv->initialized) return false;
    drv->gain = gain;
    return true;
}

static bool ads1115_stub_set_data_rate(Ads1115Driver* drv, Ads1115DataRate rate) {
    if (!drv || !drv->initialized) return false;
    drv->data_rate = rate;
    return true;
}

static int16_t ads1115_stub_read_single_ended(Ads1115Driver* drv, Ads1115Channel channel) {
    if (!drv || !drv->initialized) return 0;
    
#if DEVELOPMENT_MODE
    // Return deterministic test values based on channel (ADS1115 has 4 channels: 0-3)
    static const int16_t test_values[] = {
        2100,  // Channel 0: Red / Red Reference (measured at different times)
        3200,  // Channel 1: NIR / NIR Reference (measured at different times)
        45,    // Channel 2: Red Dark / Soil (shared)
        52     // Channel 3: NIR Dark / Ambient Light (shared)
    };
    
    if (channel <= ADS1115_CHANNEL_3) {
        return test_values[channel];
    }
    return 0;
#else
    return 0;
#endif
}

static int16_t ads1115_stub_read_differential(Ads1115Driver* drv, Ads1115Channel channel) {
    (void)drv; (void)channel;
    return 0;
}

static float ads1115_stub_read_voltage(Ads1115Driver* drv, Ads1115Channel channel) {
    if (!drv || !drv->initialized) return 0.0f;
    
    int16_t raw = ads1115_stub_read_single_ended(drv, channel);
    
    // Convert raw ADC to voltage based on gain
    float fsr = 4.096f;  // Default gain
    switch (drv->gain) {
        case ADS1115_GAIN_6_144V: fsr = 6.144f; break;
        case ADS1115_GAIN_4_096V: fsr = 4.096f; break;
        case ADS1115_GAIN_2_048V: fsr = 2.048f; break;
        case ADS1115_GAIN_1_024V: fsr = 1.024f; break;
        case ADS1115_GAIN_0_512V: fsr = 0.512f; break;
        case ADS1115_GAIN_0_256V: fsr = 0.256f; break;
    }
    
    return (raw * fsr) / 32768.0f;
}

static void ads1115_stub_deinit(Ads1115Driver* drv) {
    if (drv) drv->initialized = false;
}

void ads1115_init_default(Ads1115Driver* drv, uint8_t address) {
    if (!drv) return;
    
    drv->i2c_address = address;
    drv->gain = ADS1115_GAIN_4_096V;
    drv->data_rate = ADS1115_DR_128SPS;
    drv->initialized = false;
    
    drv->init = ads1115_stub_init;
    drv->set_gain = ads1115_stub_set_gain;
    drv->set_data_rate = ads1115_stub_set_data_rate;
    drv->read_single_ended = ads1115_stub_read_single_ended;
    drv->read_differential = ads1115_stub_read_differential;
    drv->read_voltage = ads1115_stub_read_voltage;
    drv->deinit = ads1115_stub_deinit;
}

// ============================================================================
// Optical Sensor Stub Implementation
// ============================================================================

static bool optical_stub_init(OpticalSensorDriver* drv) {
    if (!drv) return false;
    
    // Default channel mapping (ADS1115 has 4 channels: 0-3)
    // Reference measurements reuse sample channels but taken with reference standard
    drv->red_channel = ADS1115_CHANNEL_0;
    drv->nir_channel = ADS1115_CHANNEL_1;
    drv->red_dark_channel = ADS1115_CHANNEL_2;
    drv->nir_dark_channel = ADS1115_CHANNEL_3;
    drv->red_ref_channel = ADS1115_CHANNEL_0;  // Same as red, measured with reference
    drv->nir_ref_channel = ADS1115_CHANNEL_1;  // Same as nir, measured with reference
    
    drv->red_led_pin = 18;
    drv->nir_led_pin = 19;
    drv->leds_active_low = false;
    
    // Default calibration (to be determined experimentally)
    drv->red_transimpedance_gain = 100000.0f;  // 100 kOhm
    drv->nir_transimpedance_gain = 100000.0f;  // 100 kOhm
    drv->red_dark_offset = 0.0f;
    drv->nir_dark_offset = 0.0f;
    
    drv->initialized = true;
    
#if DEVELOPMENT_MODE
    Serial.println("[OPTICAL] Stub initialized");
#endif
    return true;
}

static OpticalReading optical_stub_read_channel(OpticalSensorDriver* drv, OpticalChannel channel) {
    OpticalReading reading = {0};
    reading.channel = channel;
    reading.timestamp_ms = millis();
    reading.valid = false;
    
    if (!drv || !drv->initialized || !drv->ads1115 || !drv->ads1115->initialized) {
        strncpy(reading.error_message, "Driver not initialized", sizeof(reading.error_message) - 1);
        return reading;
    }
    
    Ads1115Channel ads_channel;
    switch (channel) {
        case OPTICAL_RED: ads_channel = drv->red_channel; break;
        case OPTICAL_NIR: ads_channel = drv->nir_channel; break;
        case OPTICAL_RED_DARK: ads_channel = drv->red_dark_channel; break;
        case OPTICAL_NIR_DARK: ads_channel = drv->nir_dark_channel; break;
        case OPTICAL_RED_REFERENCE: ads_channel = drv->red_ref_channel; break;
        case OPTICAL_NIR_REFERENCE: ads_channel = drv->nir_ref_channel; break;
        default:
            strncpy(reading.error_message, "Invalid channel", sizeof(reading.error_message) - 1);
            return reading;
    }
    
    int16_t raw = drv->ads1115->read_single_ended(drv->ads1115, ads_channel);
    float voltage = drv->ads1115->read_voltage(drv->ads1115, ads_channel);
    
    reading.adc_raw = (uint16_t)raw;
    reading.voltage = voltage;
    reading.current_nA = (voltage / drv->red_transimpedance_gain) * 1e9f;  // Rough estimate
    reading.valid = true;
    
#if DEVELOPMENT_MODE
    const char* ch_names[] = {"RED", "NIR", "RED_DARK", "NIR_DARK", "RED_REF", "NIR_REF"};
    Serial.printf("[OPTICAL] %s: raw=%u, voltage=%.4fV\n", ch_names[channel], reading.adc_raw, voltage);
#endif
    
    return reading;
}

static bool optical_stub_set_leds(OpticalSensorDriver* drv, bool red_on, bool nir_on) {
    if (!drv || !drv->initialized) return false;
    
#if DEVELOPMENT_MODE
    Serial.printf("[OPTICAL] LEDs: Red=%s, NIR=%s\n", red_on ? "ON" : "OFF", nir_on ? "ON" : "OFF");
#endif
    return true;
}

static bool optical_stub_measure_all(OpticalSensorDriver* drv,
                                     OpticalReading* red_raw,
                                     OpticalReading* nir_raw,
                                     OpticalReading* red_dark,
                                     OpticalReading* nir_dark,
                                     OpticalReading* red_ref,
                                     OpticalReading* nir_ref) {
    if (!drv || !drv->initialized) return false;
    
    // Sequence: Dark → Reference → Sample (with LEDs on)
    
    // 1. Dark readings (LEDs off)
    drv->set_leds(drv, false, false);
    delay(10);  // Settling time
    
    if (red_dark) *red_dark = drv->read_channel(drv, OPTICAL_RED_DARK);
    if (nir_dark) *nir_dark = drv->read_channel(drv, OPTICAL_NIR_DARK);
    
    // 2. Reference readings (LEDs on, reference standard in place)
    drv->set_leds(drv, true, true);
    delay(50);  // LED warm-up + settling
    
    if (red_ref) *red_ref = drv->read_channel(drv, OPTICAL_RED_REFERENCE);
    if (nir_ref) *nir_ref = drv->read_channel(drv, OPTICAL_NIR_REFERENCE);
    
    // 3. Sample readings (LEDs on, leaf in place)
    // In real implementation, this would require moving the reference standard
    // For stub, we use the same channels
    if (red_raw) *red_raw = drv->read_channel(drv, OPTICAL_RED);
    if (nir_raw) *nir_raw = drv->read_channel(drv, OPTICAL_NIR);
    
    // Turn off LEDs
    drv->set_leds(drv, false, false);
    
    return true;
}

static void optical_stub_deinit(OpticalSensorDriver* drv) {
    if (drv) {
        drv->set_leds(drv, false, false);
        drv->initialized = false;
    }
}

void optical_sensor_init_default(OpticalSensorDriver* drv, Ads1115Driver* ads) {
    if (!drv) return;
    
    drv->ads1115 = ads;
    drv->initialized = false;
    
    drv->init = optical_stub_init;
    drv->read_channel = optical_stub_read_channel;
    drv->set_leds = optical_stub_set_leds;
    drv->measure_all = optical_stub_measure_all;
    drv->deinit = optical_stub_deinit;
}

// ============================================================================
// Reflectance Calculation (The Correct Implementation)
// ============================================================================

ReflectanceResult calculate_reflectance(
    const OpticalReading* red_raw,
    const OpticalReading* nir_raw,
    const OpticalReading* red_dark,
    const OpticalReading* nir_dark,
    const OpticalReading* red_reference,
    const OpticalReading* nir_reference
) {
    ReflectanceResult result = {0};
    result.valid = false;
    
    // Validate all required readings are present and valid
    if (!red_raw || !red_raw->valid ||
        !nir_raw || !nir_raw->valid ||
        !red_dark || !red_dark->valid ||
        !nir_dark || !nir_dark->valid ||
        !red_reference || !red_reference->valid ||
        !nir_reference || !nir_reference->valid) {
        strncpy(result.error_message, "Missing or invalid required readings", sizeof(result.error_message) - 1);
        return result;
    }
    
    // Dark correction: subtract dark current from raw and reference
    float red_corrected = red_raw->adc_raw - red_dark->adc_raw;
    float nir_corrected = nir_raw->adc_raw - nir_dark->adc_raw;
    float red_ref_corrected = red_reference->adc_raw - red_dark->adc_raw;
    float nir_ref_corrected = nir_reference->adc_raw - nir_dark->adc_raw;
    
    // Check for valid corrected values (reference must be > sample for reflectance)
    if (red_ref_corrected <= 0 || nir_ref_corrected <= 0) {
        strncpy(result.error_message, "Invalid reference readings (must be > dark)", sizeof(result.error_message) - 1);
        return result;
    }
    
    if (red_corrected < 0) red_corrected = 0;
    if (nir_corrected < 0) nir_corrected = 0;
    
    // Calculate reflectance as percentage
    // Reflectance = (Sample - Dark) / (Reference - Dark) * 100%
    result.red_reflectance_pct = (red_corrected / red_ref_corrected) * 100.0f;
    result.nir_reflectance_pct = (nir_corrected / nir_ref_corrected) * 100.0f;
    
    // Clamp to valid range
    if (result.red_reflectance_pct > 100.0f) result.red_reflectance_pct = 100.0f;
    if (result.nir_reflectance_pct > 100.0f) result.nir_reflectance_pct = 100.0f;
    
    // Calculate NDVI from CALIBRATED reflectance only
    // NDVI = (NIR - Red) / (NIR + Red) where Red and NIR are reflectance percentages
    // Normalize to 0-1 range for NDVI formula
    float red_refl = result.red_reflectance_pct / 100.0f;
    float nir_refl = result.nir_reflectance_pct / 100.0f;
    
    float ndvi_denom = nir_refl + red_refl;
    if (ndvi_denom > 0) {
        result.ndvi = (nir_refl - red_refl) / ndvi_denom;
    } else {
        result.ndvi = 0.0f;
    }
    
    // Clamp NDVI
    if (result.ndvi > 1.0f) result.ndvi = 1.0f;
    if (result.ndvi < -1.0f) result.ndvi = -1.0f;
    
    result.valid = true;
    
#if DEVELOPMENT_MODE
    Serial.printf("[REFLECTANCE] Red=%.2f%%, NIR=%.2f%%, NDVI=%.3f\n",
                  result.red_reflectance_pct, result.nir_reflectance_pct, result.ndvi);
#endif
    
    return result;
}

// ============================================================================
// DHT22 Stub Implementation
// ============================================================================

static Dht22Reading dht22_stub_read(Dht22Driver* drv) {
    Dht22Reading reading = {0};
    reading.timestamp_ms = millis();
    reading.valid = false;
    
    if (!drv || !drv->initialized) {
        strncpy(reading.error_message, "Driver not initialized", sizeof(reading.error_message) - 1);
        return reading;
    }
    
#if DEVELOPMENT_MODE
    reading.temperature_c = 24.5f;
    reading.humidity_pct = 62.3f;
    reading.valid = true;
#else
    strncpy(reading.error_message, "Real driver not implemented", sizeof(reading.error_message) - 1);
#endif
    
    return reading;
}

static bool dht22_stub_init(Dht22Driver* drv, int pin) {
    if (!drv) return false;
    drv->pin = pin;
    drv->initialized = true;
#if DEVELOPMENT_MODE
    Serial.printf("[DHT22] Stub initialized on pin %d\n", pin);
#endif
    return true;
}

static void dht22_stub_deinit(Dht22Driver* drv) {
    if (drv) drv->initialized = false;
}

void dht22_init_default(Dht22Driver* drv, int pin) {
    if (!drv) return;
    
    drv->pin = pin;
    drv->initialized = false;
    
    drv->init = dht22_stub_init;
    drv->read = dht22_stub_read;
    drv->deinit = dht22_stub_deinit;
}

// ============================================================================
// Soil Moisture Stub Implementation
// ============================================================================

static SoilMoistureReading soil_stub_read(SoilMoistureDriver* drv) {
    SoilMoistureReading reading = {0};
    reading.timestamp_ms = millis();
    reading.valid = false;
    
    if (!drv || !drv->initialized) {
        strncpy(reading.error_message, "Driver not initialized", sizeof(reading.error_message) - 1);
        return reading;
    }
    
#if DEVELOPMENT_MODE
    reading.raw_adc = 1850;
    // Simple linear calibration
    if (drv->wet_raw > drv->dry_raw) {
        float range = drv->wet_raw - drv->dry_raw;
        reading.moisture_pct = 100.0f * (reading.raw_adc - drv->dry_raw) / range;
        if (reading.moisture_pct < 0) reading.moisture_pct = 0;
        if (reading.moisture_pct > 100) reading.moisture_pct = 100;
    }
    reading.valid = true;
#else
    strncpy(reading.error_message, "Real driver not implemented", sizeof(reading.error_message) - 1);
#endif
    
    return reading;
}

static bool soil_stub_init(SoilMoistureDriver* drv) {
    if (!drv) return false;
    drv->initialized = true;
    
    // Default calibration points (to be determined)
    drv->dry_raw = 3000;
    drv->wet_raw = 1000;
    
#if DEVELOPMENT_MODE
    Serial.printf("[SOIL] Stub initialized (dry=%u, wet=%u)\n", drv->dry_raw, drv->wet_raw);
#endif
    return true;
}

static void soil_stub_calibrate(SoilMoistureDriver* drv, uint16_t dry, uint16_t wet) {
    if (drv) {
        drv->dry_raw = dry;
        drv->wet_raw = wet;
    }
}

static void soil_stub_deinit(SoilMoistureDriver* drv) {
    if (drv) drv->initialized = false;
}

void soil_moisture_init_default(SoilMoistureDriver* drv, int pin) {
    if (!drv) return;
    
    drv->adc_pin = pin;
    drv->use_ads1115 = false;
    drv->initialized = false;
    
    drv->init = soil_stub_init;
    drv->read = soil_stub_read;
    drv->calibrate = soil_stub_calibrate;
    drv->deinit = soil_stub_deinit;
}

// ============================================================================
// Ambient Light Stub Implementation
// ============================================================================

static AmbientLightReading ambient_stub_read(AmbientLightDriver* drv) {
    AmbientLightReading reading = {0};
    reading.timestamp_ms = millis();
    reading.valid = false;
    
    if (!drv || !drv->initialized) {
        strncpy(reading.error_message, "Driver not initialized", sizeof(reading.error_message) - 1);
        return reading;
    }
    
#if DEVELOPMENT_MODE
    reading.raw_adc = 2900;
    if (drv->lux_per_adc > 0) {
        reading.lux = reading.raw_adc * drv->lux_per_adc;
    }
    reading.valid = true;
#else
    strncpy(reading.error_message, "Real driver not implemented", sizeof(reading.error_message) - 1);
#endif
    
    return reading;
}

static bool ambient_stub_init(AmbientLightDriver* drv) {
    if (!drv) return false;
    drv->initialized = true;
    drv->lux_per_adc = 1.0f;  // Placeholder
    
#if DEVELOPMENT_MODE
    Serial.println("[AMBIENT] Stub initialized");
#endif
    return true;
}

static void ambient_stub_deinit(AmbientLightDriver* drv) {
    if (drv) drv->initialized = false;
}

void ambient_light_init_default(AmbientLightDriver* drv, int pin) {
    if (!drv) return;
    
    drv->adc_pin = pin;
    drv->use_ads1115 = false;
    drv->initialized = false;
    
    drv->init = ambient_stub_init;
    drv->read = ambient_stub_read;
    drv->deinit = ambient_stub_deinit;
}

// ============================================================================
// Hardware Manager Implementation
// ============================================================================

static bool hw_mgr_stub_init(HardwareManager* hm) {
    if (!hm) return false;
    
    // Initialize all sub-drivers
    ads1115_init_default(&hm->ads1115, PIN_ADS1115_ADDR);
    if (!hm->ads1115.init(&hm->ads1115, hm->ads1115.i2c_address)) return false;
    
    optical_sensor_init_default(&hm->optical, &hm->ads1115);
    if (!hm->optical.init(&hm->optical)) return false;
    
    dht22_init_default(&hm->dht22, PIN_DHT22);
    if (!hm->dht22.init(&hm->dht22, hm->dht22.pin)) return false;
    
    soil_moisture_init_default(&hm->soil, PIN_SOIL_MOISTURE);
    if (!hm->soil.init(&hm->soil)) return false;
    
    ambient_light_init_default(&hm->ambient, PIN_AMBIENT_LIGHT);
    if (!hm->ambient.init(&hm->ambient)) return false;
    
    hm->initialized = true;
    
#if DEVELOPMENT_MODE
    Serial.println("[HW_MGR] All stub drivers initialized");
#endif
    return true;
}

static SensorSuiteReading hw_mgr_stub_read_all(HardwareManager* hm) {
    SensorSuiteReading reading = {0};
    reading.timestamp_ms = millis();
    reading.valid = false;
    
    if (!hm || !hm->initialized) {
        strncpy(reading.error_message, "Hardware manager not initialized", sizeof(reading.error_message) - 1);
        return reading;
    }
    
    // Read optical measurements (full sequence)
    if (!hm->optical.measure_all(&hm->optical,
                                 &reading.red_raw, &reading.nir_raw,
                                 &reading.red_dark, &reading.nir_dark,
                                 &reading.red_reference, &reading.nir_reference)) {
        strncpy(reading.error_message, "Optical measurement failed", sizeof(reading.error_message) - 1);
        return reading;
    }
    
    // Calculate reflectance
    reading.reflectance = calculate_reflectance(
        &reading.red_raw, &reading.nir_raw,
        &reading.red_dark, &reading.nir_dark,
        &reading.red_reference, &reading.nir_reference
    );
    
    if (!reading.reflectance.valid) {
        strncpy(reading.error_message, reading.reflectance.error_message, sizeof(reading.error_message) - 1);
        return reading;
    }
    
    // Read environmental sensors
    reading.dht22 = hm->dht22.read(&hm->dht22);
    reading.soil = hm->soil.read(&hm->soil);
    reading.ambient = hm->ambient.read(&hm->ambient);
    
    reading.valid = true;
    return reading;
}

static void hw_mgr_stub_deinit(HardwareManager* hm) {
    if (!hm) return;
    
    hm->optical.deinit(&hm->optical);
    hm->dht22.deinit(&hm->dht22);
    hm->soil.deinit(&hm->soil);
    hm->ambient.deinit(&hm->ambient);
    hm->ads1115.deinit(&hm->ads1115);
    
    hm->initialized = false;
}

void hardware_manager_init_default(HardwareManager* hm) {
    if (!hm) return;
    
    memset(hm, 0, sizeof(HardwareManager));
    hm->initialized = false;
    
    hm->init = hw_mgr_stub_init;
    hm->read_all = hw_mgr_stub_read_all;
    hm->deinit = hw_mgr_stub_deinit;
}

// ============================================================================
// Development Mode Test Implementations
// ============================================================================

#if DEVELOPMENT_MODE

OpticalReading optical_dev_read(OpticalChannel channel) {
    OpticalReading r = {0};
    r.channel = channel;
    r.timestamp_ms = millis();
    r.valid = true;
    
    // Note: Reference channels reuse sample channels (measured at different times with reference standard)
    static const struct {
        uint16_t adc;
        float volt;
    } test_vals[] = {
        {2100, 0.262f},  // RED / RED_REF (same channel, different measurement)
        {3200, 0.399f},  // NIR / NIR_REF (same channel, different measurement)
        {45, 0.006f},    // RED_DARK
        {52, 0.006f},    // NIR_DARK
        {3800, 0.474f},  // RED_REF (when reference standard in place)
        {3950, 0.492f}   // NIR_REF (when reference standard in place)
    };
    
    // Map optical channel to test value index
    int idx = 0;
    switch (channel) {
        case OPTICAL_RED: idx = 0; break;
        case OPTICAL_NIR: idx = 1; break;
        case OPTICAL_RED_DARK: idx = 2; break;
        case OPTICAL_NIR_DARK: idx = 3; break;
        case OPTICAL_RED_REFERENCE: idx = 4; break;
        case OPTICAL_NIR_REFERENCE: idx = 5; break;
        default: idx = 0;
    }
    
    if (idx < 6) {
        r.adc_raw = test_vals[idx].adc;
        r.voltage = test_vals[idx].volt;
        r.current_nA = r.voltage / 100000.0f * 1e9f;
    }
    
    return r;
}

Dht22Reading dht22_dev_read() {
    Dht22Reading r = {0};
    r.timestamp_ms = millis();
    r.valid = true;
    r.temperature_c = 24.5f;
    r.humidity_pct = 62.3f;
    return r;
}

SoilMoistureReading soil_dev_read() {
    SoilMoistureReading r = {0};
    r.timestamp_ms = millis();
    r.valid = true;
    r.raw_adc = 1850;
    r.moisture_pct = 42.1f;
    return r;
}

AmbientLightReading ambient_dev_read() {
    AmbientLightReading r = {0};
    r.timestamp_ms = millis();
    r.valid = true;
    r.raw_adc = 2900;
    r.lux = 500.0f;
    return r;
}

SensorSuiteReading hardware_dev_read_all() {
    SensorSuiteReading r = {0};
    r.timestamp_ms = millis();
    r.valid = true;
    
    r.red_raw = optical_dev_read(OPTICAL_RED);
    r.nir_raw = optical_dev_read(OPTICAL_NIR);
    r.red_dark = optical_dev_read(OPTICAL_RED_DARK);
    r.nir_dark = optical_dev_read(OPTICAL_NIR_DARK);
    r.red_reference = optical_dev_read(OPTICAL_RED_REFERENCE);
    r.nir_reference = optical_dev_read(OPTICAL_NIR_REFERENCE);
    
    r.reflectance = calculate_reflectance(
        &r.red_raw, &r.nir_raw,
        &r.red_dark, &r.nir_dark,
        &r.red_reference, &r.nir_reference
    );
    
    r.dht22 = dht22_dev_read();
    r.soil = soil_dev_read();
    r.ambient = ambient_dev_read();
    
    return r;
}

#endif // DEVELOPMENT_MODE