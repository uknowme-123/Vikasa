// Vikāsa ESP32 Firmware - Hardware Abstraction Implementation

#include "hardware_interfaces.h"
#include <Adafruit_ADS1X15.h>
#include <DHT.h>
#include <Wire.h>
#include <string.h>
#include <stdio.h>
#include <math.h>

#if DEVELOPMENT_MODE
#include <HardwareSerial.h>
#endif

static Adafruit_ADS1115 ads1115_device;
static DHT dht22_device(PIN_DHT22, DHT22);

// ============================================================================
// ADS1115 Implementation
// ============================================================================

static bool ads1115_init(Ads1115Driver* drv, uint8_t address) {
    if (!drv) return false;
    
    drv->i2c_address = address;
    drv->gain = ADS1115_GAIN_4_096V;
    drv->data_rate = ADS1115_DR_128SPS;
    drv->last_read_valid = false;

    if (!Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL)) return false;
    if (!ads1115_device.begin(address, &Wire)) return false;

    ads1115_device.setGain(GAIN_ONE);
    ads1115_device.setDataRate(RATE_ADS1115_128SPS);
    drv->initialized = true;
    
#if DEVELOPMENT_MODE
    Serial.printf("[ADS1115] Initialized at address 0x%02X\n", address);
#endif
    return true;
}

static bool ads1115_set_gain(Ads1115Driver* drv, Ads1115Gain gain) {
    if (!drv || !drv->initialized) return false;

    adsGain_t library_gain;
    switch (gain) {
        case ADS1115_GAIN_6_144V: library_gain = GAIN_TWOTHIRDS; break;
        case ADS1115_GAIN_4_096V: library_gain = GAIN_ONE; break;
        case ADS1115_GAIN_2_048V: library_gain = GAIN_TWO; break;
        case ADS1115_GAIN_1_024V: library_gain = GAIN_FOUR; break;
        case ADS1115_GAIN_0_512V: library_gain = GAIN_EIGHT; break;
        case ADS1115_GAIN_0_256V: library_gain = GAIN_SIXTEEN; break;
        default: return false;
    }

    ads1115_device.setGain(library_gain);
    drv->gain = gain;
    return true;
}

static bool ads1115_set_data_rate(Ads1115Driver* drv, Ads1115DataRate rate) {
    if (!drv || !drv->initialized) return false;
    if (rate < ADS1115_DR_8SPS || rate > ADS1115_DR_860SPS) return false;

    uint16_t library_rate;
    switch (rate) {
        case ADS1115_DR_8SPS: library_rate = RATE_ADS1115_8SPS; break;
        case ADS1115_DR_16SPS: library_rate = RATE_ADS1115_16SPS; break;
        case ADS1115_DR_32SPS: library_rate = RATE_ADS1115_32SPS; break;
        case ADS1115_DR_64SPS: library_rate = RATE_ADS1115_64SPS; break;
        case ADS1115_DR_128SPS: library_rate = RATE_ADS1115_128SPS; break;
        case ADS1115_DR_250SPS: library_rate = RATE_ADS1115_250SPS; break;
        case ADS1115_DR_475SPS: library_rate = RATE_ADS1115_475SPS; break;
        case ADS1115_DR_860SPS: library_rate = RATE_ADS1115_860SPS; break;
        default: return false;
    }

    ads1115_device.setDataRate(library_rate);
    drv->data_rate = rate;
    return true;
}

static int16_t ads1115_read_single_ended(Ads1115Driver* drv, Ads1115Channel channel) {
    if (!drv) return 0;
    drv->last_read_valid = false;
    if (!drv->initialized || channel < ADS1115_CHANNEL_0 || channel > ADS1115_CHANNEL_3) return 0;

    Wire.beginTransmission(drv->i2c_address);
    if (Wire.endTransmission() != 0) return 0;

    const int16_t raw = ads1115_device.readADC_SingleEnded(static_cast<uint8_t>(channel));
    if (raw < 0) return 0;

    drv->last_read_valid = true;
    return raw;
}

static int16_t ads1115_read_differential(Ads1115Driver* drv, Ads1115Channel channel) {
    (void)channel;
    if (drv) drv->last_read_valid = false;
    return 0;
}

static float ads1115_voltage_from_raw(int16_t raw) {
    return ads1115_device.computeVolts(raw);
}

static float ads1115_read_voltage(Ads1115Driver* drv, Ads1115Channel channel) {
    const int16_t raw = ads1115_read_single_ended(drv, channel);
    if (!drv || !drv->last_read_valid) return 0.0f;
    return ads1115_voltage_from_raw(raw);
}

static void ads1115_deinit(Ads1115Driver* drv) {
    if (drv) {
        drv->initialized = false;
        drv->last_read_valid = false;
        Wire.end();
    }
}

void ads1115_init_default(Ads1115Driver* drv, uint8_t address) {
    if (!drv) return;
    
    drv->i2c_address = address;
    drv->gain = ADS1115_GAIN_4_096V;
    drv->data_rate = ADS1115_DR_128SPS;
    drv->initialized = false;
    drv->last_read_valid = false;
    
    drv->init = ads1115_init;
    drv->set_gain = ads1115_set_gain;
    drv->set_data_rate = ads1115_set_data_rate;
    drv->read_single_ended = ads1115_read_single_ended;
    drv->read_differential = ads1115_read_differential;
    drv->read_voltage = ads1115_read_voltage;
    drv->deinit = ads1115_deinit;
}

// ============================================================================
// Optical Sensor Implementation
// ============================================================================

static bool optical_init(OpticalSensorDriver* drv) {
    if (!drv) return false;
    
    // Default channel mapping (ADS1115 has 4 channels: 0-3)
    // Reference measurements reuse sample channels but taken with reference standard
    drv->red_channel = ADS1115_CHANNEL_0;
    drv->nir_channel = ADS1115_CHANNEL_1;
    drv->red_dark_channel = ADS1115_CHANNEL_2;
    drv->nir_dark_channel = ADS1115_CHANNEL_3;
    drv->red_ref_channel = ADS1115_CHANNEL_0;  // Same as red, measured with reference
    drv->nir_ref_channel = ADS1115_CHANNEL_1;  // Same as nir, measured with reference
    
    drv->red_led_pin = PIN_RED_LED;
    drv->nir_led_pin = PIN_NIR_LED;
    drv->leds_active_low = false;

    pinMode(drv->red_led_pin, OUTPUT);
    pinMode(drv->nir_led_pin, OUTPUT);
    digitalWrite(drv->red_led_pin, LOW);
    digitalWrite(drv->nir_led_pin, LOW);
    
    // Default calibration (to be determined experimentally)
    drv->red_transimpedance_gain = 100000.0f;  // 100 kOhm
    drv->nir_transimpedance_gain = 100000.0f;  // 100 kOhm
    drv->red_dark_offset = 0.0f;
    drv->nir_dark_offset = 0.0f;
    
    drv->initialized = true;
    
#if DEVELOPMENT_MODE
    Serial.println("[OPTICAL] Initialized");
#endif
    return true;
}

static OpticalReading optical_read_channel(OpticalSensorDriver* drv, OpticalChannel channel) {
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
    
    const int16_t raw = drv->ads1115->read_single_ended(drv->ads1115, ads_channel);
    if (!drv->ads1115->last_read_valid) {
        strncpy(reading.error_message, "ADS1115 read failed", sizeof(reading.error_message) - 1);
        return reading;
    }
    const float voltage = ads1115_voltage_from_raw(raw);
    
    reading.adc_raw = (uint16_t)raw;
    reading.voltage = voltage;
    const float transimpedance_gain = channel == OPTICAL_NIR || channel == OPTICAL_NIR_DARK ||
                                      channel == OPTICAL_NIR_REFERENCE
                                          ? drv->nir_transimpedance_gain
                                          : drv->red_transimpedance_gain;
    reading.current_nA = (voltage / transimpedance_gain) * 1e9f;
    reading.valid = true;
    
#if DEVELOPMENT_MODE
    const char* ch_names[] = {"RED", "NIR", "RED_DARK", "NIR_DARK", "RED_REF", "NIR_REF"};
    Serial.printf("[OPTICAL] %s: raw=%u, voltage=%.4fV\n", ch_names[channel], reading.adc_raw, voltage);
#endif
    
    return reading;
}

static bool optical_set_leds(OpticalSensorDriver* drv, bool red_on, bool nir_on) {
    if (!drv || !drv->initialized) return false;

    digitalWrite(drv->red_led_pin, (red_on != drv->leds_active_low) ? HIGH : LOW);
    digitalWrite(drv->nir_led_pin, (nir_on != drv->leds_active_low) ? HIGH : LOW);

#if DEVELOPMENT_MODE
    Serial.printf("[OPTICAL] LEDs: Red=%s, NIR=%s\n", red_on ? "ON" : "OFF", nir_on ? "ON" : "OFF");
#endif
    return true;
}

static bool optical_measure_all(OpticalSensorDriver* drv,
                                     OpticalReading* red_raw,
                                     OpticalReading* nir_raw,
                                     OpticalReading* red_dark,
                                     OpticalReading* nir_dark,
                                     OpticalReading* red_ref,
                                     OpticalReading* nir_ref) {
    if (!drv || !drv->initialized) return false;
    
    // Sequence: Dark → Reference → Sample (with LEDs on)
    
    // 1. Dark readings (LEDs off)
    if (!drv->set_leds(drv, false, false)) return false;
    delay(10);  // Settling time
    
    if (red_dark) *red_dark = drv->read_channel(drv, OPTICAL_RED_DARK);
    if (nir_dark) *nir_dark = drv->read_channel(drv, OPTICAL_NIR_DARK);
    if ((red_dark && !red_dark->valid) || (nir_dark && !nir_dark->valid)) {
        drv->set_leds(drv, false, false);
        return false;
    }
    
    // 2. Reference readings (LEDs on, reference standard in place)
    if (!drv->set_leds(drv, true, true)) return false;
    delay(50);  // LED warm-up + settling
    
    if (red_ref) *red_ref = drv->read_channel(drv, OPTICAL_RED_REFERENCE);
    if (nir_ref) *nir_ref = drv->read_channel(drv, OPTICAL_NIR_REFERENCE);
    if ((red_ref && !red_ref->valid) || (nir_ref && !nir_ref->valid)) {
        drv->set_leds(drv, false, false);
        return false;
    }
    
    // 3. Sample readings (LEDs on, leaf in place)
    // In real implementation, this would require moving the reference standard
    // For stub, we use the same channels
    if (red_raw) *red_raw = drv->read_channel(drv, OPTICAL_RED);
    if (nir_raw) *nir_raw = drv->read_channel(drv, OPTICAL_NIR);
    
    // Turn off LEDs
    if (!drv->set_leds(drv, false, false)) return false;
    if ((red_raw && !red_raw->valid) || (nir_raw && !nir_raw->valid)) return false;
    
    return true;
}

static void optical_deinit(OpticalSensorDriver* drv) {
    if (drv) {
        drv->set_leds(drv, false, false);
        drv->initialized = false;
    }
}

void optical_sensor_init_default(OpticalSensorDriver* drv, Ads1115Driver* ads) {
    if (!drv) return;
    
    drv->ads1115 = ads;
    drv->initialized = false;
    
    drv->init = optical_init;
    drv->read_channel = optical_read_channel;
    drv->set_leds = optical_set_leds;
    drv->measure_all = optical_measure_all;
    drv->deinit = optical_deinit;
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
// DHT22 Implementation
// ============================================================================

static Dht22Reading dht22_read(Dht22Driver* drv) {
    Dht22Reading reading = {0};
    reading.timestamp_ms = millis();
    reading.valid = false;
    
    if (!drv || !drv->initialized) {
        strncpy(reading.error_message, "Driver not initialized", sizeof(reading.error_message) - 1);
        return reading;
    }
    
    reading.humidity_pct = dht22_device.readHumidity();
    reading.temperature_c = dht22_device.readTemperature();
    if (isnan(reading.humidity_pct) || isnan(reading.temperature_c) ||
        reading.humidity_pct < HUMIDITY_MIN || reading.humidity_pct > HUMIDITY_MAX ||
        reading.temperature_c < TEMP_MIN || reading.temperature_c > TEMP_MAX) {
        strncpy(reading.error_message, "DHT22 returned invalid data", sizeof(reading.error_message) - 1);
        return reading;
    }

    reading.valid = true;
    
    return reading;
}

static bool dht22_init(Dht22Driver* drv, int pin) {
    if (!drv || pin != PIN_DHT22) return false;
    drv->pin = pin;
    dht22_device.begin();
    drv->initialized = true;
#if DEVELOPMENT_MODE
    Serial.printf("[DHT22] Initialized on pin %d\n", pin);
#endif
    return true;
}

static void dht22_deinit(Dht22Driver* drv) {
    if (drv) drv->initialized = false;
}

void dht22_init_default(Dht22Driver* drv, int pin) {
    if (!drv) return;
    
    drv->pin = pin;
    drv->initialized = false;
    
    drv->init = dht22_init;
    drv->read = dht22_read;
    drv->deinit = dht22_deinit;
}

// ============================================================================
// Soil Moisture Implementation
// ============================================================================

static SoilMoistureReading soil_read(SoilMoistureDriver* drv) {
    SoilMoistureReading reading = {0};
    reading.timestamp_ms = millis();
    reading.valid = false;
    
    if (!drv || !drv->initialized) {
        strncpy(reading.error_message, "Driver not initialized", sizeof(reading.error_message) - 1);
        return reading;
    }
    
    if (drv->use_ads1115) {
        if (!drv->ads1115 || !drv->ads1115->read_single_ended) {
            strncpy(reading.error_message, "Soil ADS1115 is not configured", sizeof(reading.error_message) - 1);
            return reading;
        }
        const int16_t raw = drv->ads1115->read_single_ended(drv->ads1115, drv->ads_channel);
        if (!drv->ads1115->last_read_valid || raw < 0) {
            strncpy(reading.error_message, "Soil ADS1115 read failed", sizeof(reading.error_message) - 1);
            return reading;
        }
        reading.raw_adc = static_cast<uint16_t>(raw);
    } else {
        const int raw = analogRead(drv->adc_pin);
        if (raw < 0 || raw > 4095) {
            strncpy(reading.error_message, "Soil GPIO ADC read failed", sizeof(reading.error_message) - 1);
            return reading;
        }
        reading.raw_adc = static_cast<uint16_t>(raw);
    }

    if (drv->dry_raw == drv->wet_raw) {
        strncpy(reading.error_message, "Soil calibration points are identical", sizeof(reading.error_message) - 1);
        return reading;
    }

    const float calibrated = 100.0f * (reading.raw_adc - drv->dry_raw) /
                             (static_cast<float>(drv->wet_raw) - drv->dry_raw);
    reading.moisture_pct = fmaxf(0.0f, fminf(100.0f, calibrated));
    reading.valid = true;
    
    return reading;
}

static bool soil_init(SoilMoistureDriver* drv) {
    if (!drv) return false;
    if (drv->use_ads1115 && (!drv->ads1115 || !drv->ads1115->initialized)) return false;
    
    drv->dry_raw = 3000;
    drv->wet_raw = 1000;
    if (!drv->use_ads1115) pinMode(drv->adc_pin, INPUT);
    drv->initialized = true;
    
#if DEVELOPMENT_MODE
    Serial.printf("[SOIL] Initialized (dry=%u, wet=%u)\n", drv->dry_raw, drv->wet_raw);
#endif
    return true;
}

static void soil_calibrate(SoilMoistureDriver* drv, uint16_t dry, uint16_t wet) {
    if (drv) {
        drv->dry_raw = dry;
        drv->wet_raw = wet;
    }
}

static void soil_deinit(SoilMoistureDriver* drv) {
    if (drv) drv->initialized = false;
}

void soil_moisture_init_default(SoilMoistureDriver* drv, int pin) {
    if (!drv) return;
    
    drv->adc_pin = pin;
    drv->use_ads1115 = false;
    drv->initialized = false;
    
    drv->init = soil_init;
    drv->read = soil_read;
    drv->calibrate = soil_calibrate;
    drv->deinit = soil_deinit;
}

// ============================================================================
// Ambient Light Implementation
// ============================================================================

static AmbientLightReading ambient_read(AmbientLightDriver* drv) {
    AmbientLightReading reading = {0};
    reading.timestamp_ms = millis();
    reading.valid = false;
    
    if (!drv || !drv->initialized) {
        strncpy(reading.error_message, "Driver not initialized", sizeof(reading.error_message) - 1);
        return reading;
    }
    
    if (drv->use_ads1115) {
        if (!drv->ads1115 || !drv->ads1115->read_single_ended) {
            strncpy(reading.error_message, "Ambient-light ADS1115 is not configured", sizeof(reading.error_message) - 1);
            return reading;
        }
        const int16_t raw = drv->ads1115->read_single_ended(drv->ads1115, drv->ads_channel);
        if (!drv->ads1115->last_read_valid || raw < 0) {
            strncpy(reading.error_message, "Ambient-light ADS1115 read failed", sizeof(reading.error_message) - 1);
            return reading;
        }
        reading.raw_adc = static_cast<uint16_t>(raw);
    } else {
        const int raw = analogRead(drv->adc_pin);
        if (raw < 0 || raw > 4095) {
            strncpy(reading.error_message, "Ambient-light GPIO ADC read failed", sizeof(reading.error_message) - 1);
            return reading;
        }
        reading.raw_adc = static_cast<uint16_t>(raw);
    }

    if (drv->lux_per_adc > 0) {
        reading.lux = reading.raw_adc * drv->lux_per_adc;
    }
    reading.valid = true;
    
    return reading;
}

static bool ambient_init(AmbientLightDriver* drv) {
    if (!drv) return false;
    if (drv->use_ads1115 && (!drv->ads1115 || !drv->ads1115->initialized)) return false;
    drv->initialized = true;
    drv->lux_per_adc = 1.0f;
    if (!drv->use_ads1115) pinMode(drv->adc_pin, INPUT);
    
#if DEVELOPMENT_MODE
    Serial.println("[AMBIENT] Initialized");
#endif
    return true;
}

static void ambient_deinit(AmbientLightDriver* drv) {
    if (drv) drv->initialized = false;
}

void ambient_light_init_default(AmbientLightDriver* drv, int pin) {
    if (!drv) return;
    
    drv->adc_pin = pin;
    drv->use_ads1115 = false;
    drv->initialized = false;
    
    drv->init = ambient_init;
    drv->read = ambient_read;
    drv->deinit = ambient_deinit;
}

// ============================================================================
// Hardware Manager Implementation
// ============================================================================

static bool hw_mgr_init(HardwareManager* hm) {
    if (!hm) return false;
    
    ads1115_init_default(&hm->ads1115, PIN_ADS1115_ADDR);
    const bool ads_ready = hm->ads1115.init(&hm->ads1115, hm->ads1115.i2c_address) &&
                           hm->ads1115.set_gain(&hm->ads1115, ADS1115_GAIN) &&
                           hm->ads1115.set_data_rate(&hm->ads1115, ADS1115_DR_128SPS);
    
    optical_sensor_init_default(&hm->optical, &hm->ads1115);
    const bool optical_ready = hm->optical.init(&hm->optical);
    
    dht22_init_default(&hm->dht22, PIN_DHT22);
    const bool dht_ready = hm->dht22.init(&hm->dht22, hm->dht22.pin);
    
    soil_moisture_init_default(&hm->soil, PIN_SOIL_MOISTURE);
    const bool soil_ready = hm->soil.init(&hm->soil);
    
    ambient_light_init_default(&hm->ambient, PIN_AMBIENT_LIGHT);
    const bool ambient_ready = hm->ambient.init(&hm->ambient);
    
    hm->initialized = true;
    
#if DEVELOPMENT_MODE || defined(VIKASA_SERIAL_DIAGNOSTICS)
    Serial.printf("[HW_MGR] Init ADS=%s optical=%s DHT22=%s soil=%s ambient=%s\n",
                  ads_ready ? "OK" : "FAILED",
                  optical_ready ? "OK" : "FAILED",
                  dht_ready ? "OK" : "FAILED",
                  soil_ready ? "OK" : "FAILED",
                  ambient_ready ? "OK" : "FAILED");
#endif
    return true;
}

static SensorSuiteReading hw_mgr_read_all(HardwareManager* hm) {
    SensorSuiteReading reading = {0};
    reading.timestamp_ms = millis();
    reading.valid = false;
    
    if (!hm || !hm->initialized) {
        strncpy(reading.error_message, "Hardware manager not initialized", sizeof(reading.error_message) - 1);
        return reading;
    }
    
    const bool optical_read_ok = hm->optical.measure_all(
        &hm->optical,
        &reading.red_raw, &reading.nir_raw,
        &reading.red_dark, &reading.nir_dark,
        &reading.red_reference, &reading.nir_reference);
    
    reading.reflectance = calculate_reflectance(
        &reading.red_raw, &reading.nir_raw,
        &reading.red_dark, &reading.nir_dark,
        &reading.red_reference, &reading.nir_reference
    );

    // Environmental sensors are optional in the payload; retain their individual validity.
    if (hm->dht22.initialized) {
        reading.dht22 = hm->dht22.read(&hm->dht22);
    } else {
        strncpy(reading.dht22.error_message, "DHT22 initialization failed",
                sizeof(reading.dht22.error_message) - 1);
    }
    if (hm->soil.initialized) {
        reading.soil = hm->soil.read(&hm->soil);
    } else {
        strncpy(reading.soil.error_message, "Soil sensor initialization failed",
                sizeof(reading.soil.error_message) - 1);
    }
    if (hm->ambient.initialized) {
        reading.ambient = hm->ambient.read(&hm->ambient);
    } else {
        strncpy(reading.ambient.error_message, "Ambient-light initialization failed",
                sizeof(reading.ambient.error_message) - 1);
    }

    reading.valid = optical_read_ok || reading.red_raw.valid || reading.nir_raw.valid ||
                    reading.red_dark.valid || reading.nir_dark.valid ||
                    reading.red_reference.valid || reading.nir_reference.valid ||
                    reading.dht22.valid || reading.soil.valid || reading.ambient.valid;
    if (!reading.valid) {
        snprintf(reading.error_message, sizeof(reading.error_message),
                 "No valid sensor readings (optical: %s; DHT22: %s; soil: %s; ambient: %s)",
                 reading.reflectance.error_message,
                 reading.dht22.error_message,
                 reading.soil.error_message,
                 reading.ambient.error_message);
    }
    return reading;
}

static void hw_mgr_deinit(HardwareManager* hm) {
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
    
    hm->init = hw_mgr_init;
    hm->read_all = hw_mgr_read_all;
    hm->deinit = hw_mgr_deinit;
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