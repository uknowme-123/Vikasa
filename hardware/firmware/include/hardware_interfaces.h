// Vikāsa ESP32 Firmware - Hardware Abstraction Interfaces
// Clean interfaces/placeholders for:
// - Red optical reading (BPW34 via ADS1115)
// - NIR optical reading (BPW34 via ADS1115)
// - Dark reading (LEDs off)
// - Reference reading (reference standard)
// - DHT22 (temperature/humidity)
// - Soil moisture (capacitive/resistive)
// - LDR (ambient light)
// - ADS1115 (16-bit ADC)
//
// IMPORTANT: 
// - BPW34 does NOT directly provide digital red/NIR measurement
// - Requires appropriate current-to-voltage/readout circuit (transimpedance amplifier)
// - ADS1115 measures voltage output from the analog front-end
// - Do NOT pretend BPW34 → digital value without proper AFE

#ifndef HARDWARE_INTERFACES_H
#define HARDWARE_INTERFACES_H

#include <Arduino.h>
#include "config.h"

// ============================================================================
// ADS1115 16-bit ADC Interface
// ============================================================================

// ADS1115 I2C address options
#define ADS1115_ADDR_GND 0x48
#define ADS1115_ADDR_VDD 0x49
#define ADS1115_ADDR_SDA 0x4A
#define ADS1115_ADDR_SCL 0x4B

// ADS1115 gain settings (full-scale range)
typedef enum {
    ADS1115_GAIN_6_144V  = 0x00,  // 2/3x gain
    ADS1115_GAIN_4_096V  = 0x02,  // 1x gain
    ADS1115_GAIN_2_048V  = 0x04,  // 2x gain
    ADS1115_GAIN_1_024V  = 0x06,  // 4x gain
    ADS1115_GAIN_0_512V  = 0x08,  // 8x gain
    ADS1115_GAIN_0_256V  = 0x0A   // 16x gain
} Ads1115Gain;

// ADS1115 data rates (samples per second)
typedef enum {
    ADS1115_DR_8SPS    = 0x00,
    ADS1115_DR_16SPS   = 0x01,
    ADS1115_DR_32SPS   = 0x02,
    ADS1115_DR_64SPS   = 0x03,
    ADS1115_DR_128SPS  = 0x04,
    ADS1115_DR_250SPS  = 0x05,
    ADS1115_DR_475SPS  = 0x06,
    ADS1115_DR_860SPS  = 0x07
} Ads1115DataRate;

// ADS1115 channel configuration
typedef enum {
    ADS1115_CHANNEL_0 = 0,  // AIN0
    ADS1115_CHANNEL_1 = 1,  // AIN1
    ADS1115_CHANNEL_2 = 2,  // AIN2
    ADS1115_CHANNEL_3 = 3,  // AIN3
    ADS1115_CHANNEL_DIFF_0_1 = 4,  // AIN0 - AIN1
    ADS1115_CHANNEL_DIFF_0_3 = 5,  // AIN0 - AIN3
    ADS1115_CHANNEL_DIFF_1_3 = 6,  // AIN1 - AIN3
    ADS1115_CHANNEL_DIFF_2_3 = 7   // AIN2 - AIN3
} Ads1115Channel;

// ADS1115 driver interface
struct Ads1115Driver {
    uint8_t i2c_address;
    Ads1115Gain gain;
    Ads1115DataRate data_rate;
    bool initialized;
    bool last_read_valid;
    
    // Function pointers for hardware-specific implementation
    bool (*init)(struct Ads1115Driver* drv, uint8_t address);
    bool (*set_gain)(struct Ads1115Driver* drv, Ads1115Gain gain);
    bool (*set_data_rate)(struct Ads1115Driver* drv, Ads1115DataRate rate);
    int16_t (*read_single_ended)(struct Ads1115Driver* drv, Ads1115Channel channel);
    int16_t (*read_differential)(struct Ads1115Driver* drv, Ads1115Channel channel);
    float (*read_voltage)(struct Ads1115Driver* drv, Ads1115Channel channel);
    void (*deinit)(struct Ads1115Driver* drv);
};

// Initialize ADS1115 driver with default settings
void ads1115_init_default(Ads1115Driver* drv, uint8_t address = ADS1115_ADDR_GND);

// ============================================================================
// Optical Sensor Interface (Red/NIR BPW34 with AFE)
// ============================================================================

// Optical measurement types
typedef enum {
    OPTICAL_RED = 0,
    OPTICAL_NIR = 1,
    OPTICAL_RED_DARK = 2,
    OPTICAL_NIR_DARK = 3,
    OPTICAL_RED_REFERENCE = 4,
    OPTICAL_NIR_REFERENCE = 5
} OpticalChannel;

// Optical sensor reading result
struct OpticalReading {
    bool valid;
    uint16_t adc_raw;      // Raw ADC count (0-65535)
    float voltage;         // Voltage at ADC input (V)
    float current_nA;      // Estimated photodiode current (nA) - if calibration known
    OpticalChannel channel;
    uint32_t timestamp_ms;
    char error_message[64];
};

// Optical sensor driver interface
struct OpticalSensorDriver {
    Ads1115Driver* ads1115;
    
    // Channel mapping (configured per hardware)
    Ads1115Channel red_channel;
    Ads1115Channel nir_channel;
    Ads1115Channel red_dark_channel;
    Ads1115Channel nir_dark_channel;
    Ads1115Channel red_ref_channel;
    Ads1115Channel nir_ref_channel;
    
    // LED control pins (for active illumination)
    int red_led_pin;
    int nir_led_pin;
    bool leds_active_low;
    
    // Calibration coefficients (set during calibration)
    float red_transimpedance_gain;   // V/A for red channel AFE
    float nir_transimpedance_gain;   // V/A for NIR channel AFE
    float red_dark_offset;           // Dark current offset (ADC counts)
    float nir_dark_offset;           // Dark current offset (ADC counts)
    
    bool initialized;
    
    // Function pointers
    bool (*init)(struct OpticalSensorDriver* drv);
    OpticalReading (*read_channel)(struct OpticalSensorDriver* drv, OpticalChannel channel);
    bool (*set_leds)(struct OpticalSensorDriver* drv, bool red_on, bool nir_on);
    void (*deinit)(struct OpticalSensorDriver* drv);
    
    // High-level measurement sequence
    // Performs: dark → reference → sample for both channels
    bool (*measure_all)(struct OpticalSensorDriver* drv, 
                        OpticalReading* red_raw,
                        OpticalReading* nir_raw,
                        OpticalReading* red_dark,
                        OpticalReading* nir_dark,
                        OpticalReading* red_ref,
                        OpticalReading* nir_ref);
};

// Initialize optical sensor driver with default pin mapping
void optical_sensor_init_default(OpticalSensorDriver* drv, Ads1115Driver* ads);

// ============================================================================
// Reflectance Calculation (Calibration)
// ============================================================================

// Reflectance calculation result
struct ReflectanceResult {
    bool valid;
    float red_reflectance_pct;   // 0-100%
    float nir_reflectance_pct;   // 0-100%
    float ndvi;                  // -1 to 1 (only valid if both reflectance valid)
    char error_message[128];
};

// Calculate calibrated reflectance from raw readings
// CRITICAL: This implements the correct optical measurement rules:
// - red_raw is NOT reflectance
// - nir_raw is NOT reflectance  
// - Dark correction MUST use appropriate dark readings
// - Calibrated reflectance REQUIRES reference measurement
// - NDVI MUST be computed from calibrated reflectance ONLY
ReflectanceResult calculate_reflectance(
    const OpticalReading* red_raw,
    const OpticalReading* nir_raw,
    const OpticalReading* red_dark,
    const OpticalReading* nir_dark,
    const OpticalReading* red_reference,
    const OpticalReading* nir_reference
);

// ============================================================================
// DHT22 Temperature/Humidity Sensor
// ============================================================================

struct Dht22Reading {
    bool valid;
    float temperature_c;   // Celsius
    float humidity_pct;    // Relative humidity %
    uint32_t timestamp_ms;
    char error_message[64];
};

struct Dht22Driver {
    int pin;
    bool initialized;
    
    Dht22Reading (*read)(struct Dht22Driver* drv);
    bool (*init)(struct Dht22Driver* drv, int pin);
    void (*deinit)(struct Dht22Driver* drv);
};

void dht22_init_default(Dht22Driver* drv, int pin = PIN_DHT22);

// ============================================================================
// Soil Moisture Sensor (Capacitive/Resistive)
// ============================================================================

struct SoilMoistureReading {
    bool valid;
    uint16_t raw_adc;      // Raw ADC (0-65535)
    float moisture_pct;    // Calibrated percentage (0-100%) - if calibration known
    uint32_t timestamp_ms;
    char error_message[64];
};

struct SoilMoistureDriver {
    int adc_pin;           // ADC pin (or ADS1115 channel)
    Ads1115Driver* ads1115;  // Optional: use ADS1115 instead of built-in ADC
    Ads1115Channel ads_channel;
    bool use_ads1115;
    
    // Calibration points (determined empirically)
    uint16_t dry_raw;      // ADC value in dry air/soil
    uint16_t wet_raw;      // ADC value in water/saturated soil
    
    bool initialized;
    
    SoilMoistureReading (*read)(struct SoilMoistureDriver* drv);
    bool (*init)(struct SoilMoistureDriver* drv);
    void (*calibrate)(struct SoilMoistureDriver* drv, uint16_t dry, uint16_t wet);
    void (*deinit)(struct SoilMoistureDriver* drv);
};

void soil_moisture_init_default(SoilMoistureDriver* drv, int pin = PIN_SOIL_MOISTURE);

// ============================================================================
// Ambient Light Sensor (LDR)
// ============================================================================

struct AmbientLightReading {
    bool valid;
    uint16_t raw_adc;      // Raw ADC (0-65535)
    float lux;             // Estimated lux (if calibrated)
    uint32_t timestamp_ms;
    char error_message[64];
};

struct AmbientLightDriver {
    int adc_pin;           // ADC pin (or ADS1115 channel)
    Ads1115Driver* ads1115;
    Ads1115Channel ads_channel;
    bool use_ads1115;
    
    // Calibration
    float lux_per_adc;     // Calibration factor
    
    bool initialized;
    
    AmbientLightReading (*read)(struct AmbientLightDriver* drv);
    bool (*init)(struct AmbientLightDriver* drv);
    void (*deinit)(struct AmbientLightDriver* drv);
};

void ambient_light_init_default(AmbientLightDriver* drv, int pin = PIN_AMBIENT_LIGHT);

// ============================================================================
// Composite Hardware Manager
// ============================================================================

// Complete sensor suite reading
struct SensorSuiteReading {
    bool valid;
    
    // Optical
    OpticalReading red_raw;
    OpticalReading nir_raw;
    OpticalReading red_dark;
    OpticalReading nir_dark;
    OpticalReading red_reference;
    OpticalReading nir_reference;
    
    // Calculated reflectance
    ReflectanceResult reflectance;
    
    // Environmental
    Dht22Reading dht22;
    SoilMoistureReading soil;
    AmbientLightReading ambient;
    
    uint32_t timestamp_ms;
    char error_message[256];
};

// Hardware manager - coordinates all sensors
struct HardwareManager {
    Ads1115Driver ads1115;
    OpticalSensorDriver optical;
    Dht22Driver dht22;
    SoilMoistureDriver soil;
    AmbientLightDriver ambient;
    
    bool initialized;
    
    // Function pointers
    bool (*init)(struct HardwareManager* hm);
    SensorSuiteReading (*read_all)(struct HardwareManager* hm);
    void (*deinit)(struct HardwareManager* hm);
};

// Initialize hardware manager with default pin mapping
void hardware_manager_init_default(HardwareManager* hm);

// Development mode stub implementations (return test_only=true data)
#if DEVELOPMENT_MODE
OpticalReading optical_dev_read(OpticalChannel channel);
Dht22Reading dht22_dev_read();
SoilMoistureReading soil_dev_read();
AmbientLightReading ambient_dev_read();
SensorSuiteReading hardware_dev_read_all();
#endif

#endif // HARDWARE_INTERFACES_H