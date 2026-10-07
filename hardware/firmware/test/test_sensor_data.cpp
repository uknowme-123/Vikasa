// Vikāsa ESP32 Firmware - Unit Tests for Sensor Data Model
// Run with: pio test -e native-test

#include <Arduino.h>
#include <unity.h>
#include <string.h>
#include <stdio.h>
#include <math.h>

#include "sensor_data.h"

// Mock millis for timestamp tests
static uint32_t mock_millis_value = 1700000000000;

extern "C" uint32_t millis() {
    return mock_millis_value;
}

void setUp() {}
void tearDown() {}

void test_init_sensor_reading() {
    SensorReading reading;
    init_sensor_reading(&reading);
    
    TEST_ASSERT_EQUAL_STRING("", reading.reading_id);
    TEST_ASSERT_EQUAL_STRING("", reading.plant_id);
    TEST_ASSERT_EQUAL_STRING("", reading.session_id);
    TEST_ASSERT_EQUAL_STRING("", reading.operator_id);
    TEST_ASSERT_EQUAL_STRING("", reading.timestamp);
    TEST_ASSERT_EQUAL_STRING("", reading.species);
    TEST_ASSERT_EQUAL_STRING("", reading.stress_type);
    TEST_ASSERT_EQUAL_STRING("", reading.health_label);
    TEST_ASSERT_EQUAL_STRING("", reading.label_evidence);
    TEST_ASSERT_EQUAL_STRING("", reading.notes);
    
    TEST_ASSERT_NULL(reading.red_raw);
    TEST_ASSERT_NULL(reading.nir_raw);
    TEST_ASSERT_NULL(reading.red_reflectance);
    TEST_ASSERT_NULL(reading.nir_reflectance);
    TEST_ASSERT_NULL(reading.ndvi);
    
    TEST_ASSERT_FALSE(reading.timestamp_synced);
}

void test_setters_required_fields() {
    SensorReading reading;
    init_sensor_reading(&reading);
    
    strncpy(reading.reading_id, "VIKASA-TEST-001", MAX_READING_ID_LEN);
    strncpy(reading.plant_id, "PLANT-001", MAX_PLANT_ID_LEN);
    strncpy(reading.session_id, "SESSION-001", MAX_SESSION_ID_LEN);
    strncpy(reading.operator_id, "OPERATOR-001", MAX_OPERATOR_ID_LEN);
    strncpy(reading.timestamp, "2026-10-07T10:30:00Z", 31);
    
    TEST_ASSERT_EQUAL_STRING("VIKASA-TEST-001", reading.reading_id);
    TEST_ASSERT_EQUAL_STRING("PLANT-001", reading.plant_id);
    TEST_ASSERT_EQUAL_STRING("SESSION-001", reading.session_id);
    TEST_ASSERT_EQUAL_STRING("OPERATOR-001", reading.operator_id);
    TEST_ASSERT_EQUAL_STRING("2026-10-07T10:30:00Z", reading.timestamp);
}

void test_setters_optional_strings() {
    SensorReading reading;
    init_sensor_reading(&reading);
    
    set_species(&reading, "Solanum lycopersicum");
    set_stress_type(&reading, "drought");
    set_health_label(&reading, "moderate");
    set_label_evidence(&reading, "visual inspection");
    set_notes(&reading, "Test reading");
    
    TEST_ASSERT_EQUAL_STRING("Solanum lycopersicum", reading.species);
    TEST_ASSERT_EQUAL_STRING("drought", reading.stress_type);
    TEST_ASSERT_EQUAL_STRING("moderate", reading.health_label);
    TEST_ASSERT_EQUAL_STRING("visual inspection", reading.label_evidence);
    TEST_ASSERT_EQUAL_STRING("Test reading", reading.notes);
}

void test_setters_optional_uint16() {
    SensorReading reading;
    init_sensor_reading(&reading);
    
    TEST_ASSERT_TRUE(set_red_raw(&reading, 2100));
    TEST_ASSERT_TRUE(set_nir_raw(&reading, 3200));
    TEST_ASSERT_TRUE(set_red_dark(&reading, 45));
    TEST_ASSERT_TRUE(set_nir_dark(&reading, 52));
    TEST_ASSERT_TRUE(set_red_reference(&reading, 3800));
    TEST_ASSERT_TRUE(set_nir_reference(&reading, 3950));
    TEST_ASSERT_TRUE(set_soil_moisture_raw(&reading, 1850));
    TEST_ASSERT_TRUE(set_ambient_light_raw(&reading, 2900));
    
    TEST_ASSERT_NOT_NULL(reading.red_raw);
    TEST_ASSERT_EQUAL(2100, *reading.red_raw);
    TEST_ASSERT_EQUAL(3200, *reading.nir_raw);
    TEST_ASSERT_EQUAL(45, *reading.red_dark);
    TEST_ASSERT_EQUAL(52, *reading.nir_dark);
    TEST_ASSERT_EQUAL(3800, *reading.red_reference);
    TEST_ASSERT_EQUAL(3950, *reading.nir_reference);
    TEST_ASSERT_EQUAL(1850, *reading.soil_moisture_raw);
    TEST_ASSERT_EQUAL(2900, *reading.ambient_light_raw);
}

void test_setters_optional_uint16_out_of_range() {
    SensorReading reading;
    init_sensor_reading(&reading);
    
    TEST_ASSERT_FALSE(set_red_raw(&reading, 70000));  // > 65535
    TEST_ASSERT_FALSE(set_nir_raw(&reading, 65536));
    TEST_ASSERT_NULL(reading.red_raw);
    TEST_ASSERT_NULL(reading.nir_raw);
}

void test_setters_optional_float() {
    SensorReading reading;
    init_sensor_reading(&reading);
    
    TEST_ASSERT_TRUE(set_red_reflectance(&reading, 54.2f));
    TEST_ASSERT_TRUE(set_nir_reflectance(&reading, 79.8f));
    TEST_ASSERT_TRUE(set_temperature_c(&reading, 24.5f));
    TEST_ASSERT_TRUE(set_humidity_pct(&reading, 62.3f));
    TEST_ASSERT_TRUE(set_soil_moisture_pct(&reading, 42.1f));
    
    TEST_ASSERT_NOT_NULL(reading.red_reflectance);
    TEST_ASSERT_FLOAT_WITHIN(0.01, 54.2f, *reading.red_reflectance);
    TEST_ASSERT_FLOAT_WITHIN(0.01, 79.8f, *reading.nir_reflectance);
    TEST_ASSERT_FLOAT_WITHIN(0.01, 24.5f, *reading.temperature_c);
    TEST_ASSERT_FLOAT_WITHIN(0.01, 62.3f, *reading.humidity_pct);
    TEST_ASSERT_FLOAT_WITHIN(0.01, 42.1f, *reading.soil_moisture_pct);
}

void test_setters_optional_float_out_of_range() {
    SensorReading reading;
    init_sensor_reading(&reading);
    
    TEST_ASSERT_FALSE(set_red_reflectance(&reading, -1.0f));
    TEST_ASSERT_FALSE(set_red_reflectance(&reading, 101.0f));
    TEST_ASSERT_FALSE(set_humidity_pct(&reading, -5.0f));
    TEST_ASSERT_FALSE(set_humidity_pct(&reading, 105.0f));
    TEST_ASSERT_FALSE(set_temperature_c(&reading, -100.0f));
    TEST_ASSERT_FALSE(set_temperature_c(&reading, 150.0f));
    TEST_ASSERT_FALSE(set_soil_moisture_pct(&reading, -1.0f));
    TEST_ASSERT_FALSE(set_soil_moisture_pct(&reading, 101.0f));
    
    // NaN and Inf
    TEST_ASSERT_FALSE(set_red_reflectance(&reading, NAN));
    TEST_ASSERT_FALSE(set_red_reflectance(&reading, INFINITY));
    TEST_ASSERT_FALSE(set_red_reflectance(&reading, -INFINITY));
}

void test_ndvi_requires_reflectance() {
    SensorReading reading;
    init_sensor_reading(&reading);
    
    // Should fail without reflectance
    TEST_ASSERT_FALSE(set_ndvi(&reading, 0.191f));
    TEST_ASSERT_NULL(reading.ndvi);
    
    // Should succeed with reflectance set
    set_red_reflectance(&reading, 54.2f);
    set_nir_reflectance(&reading, 79.8f);
    TEST_ASSERT_TRUE(set_ndvi(&reading, 0.191f));
    TEST_ASSERT_NOT_NULL(reading.ndvi);
    TEST_ASSERT_FLOAT_WITHIN(0.001, 0.191f, *reading.ndvi);
}

void test_ndvi_out_of_range() {
    SensorReading reading;
    init_sensor_reading(&reading);
    
    set_red_reflectance(&reading, 50.0f);
    set_nir_reflectance(&reading, 80.0f);
    
    TEST_ASSERT_FALSE(set_ndvi(&reading, -1.1f));
    TEST_ASSERT_FALSE(set_ndvi(&reading, 1.1f));
    TEST_ASSERT_FALSE(set_ndvi(&reading, NAN));
    TEST_ASSERT_FALSE(set_ndvi(&reading, INFINITY));
}

void test_validate_sensor_reading_valid() {
    SensorReading reading;
    init_sensor_reading(&reading);
    
    strncpy(reading.reading_id, "VIKASA-PLANT-001-1700000000000-001", MAX_READING_ID_LEN);
    strncpy(reading.plant_id, "PLANT-001", MAX_PLANT_ID_LEN);
    strncpy(reading.session_id, "SESSION-001", MAX_SESSION_ID_LEN);
    strncpy(reading.operator_id, "OPERATOR-001", MAX_OPERATOR_ID_LEN);
    strncpy(reading.timestamp, "2026-10-07T10:30:00Z", 31);
    
    ValidationResult vr = validate_sensor_reading(&reading);
    TEST_ASSERT_TRUE(vr.valid);
}

void test_validate_sensor_reading_missing_required() {
    SensorReading reading;
    init_sensor_reading(&reading);
    
    // Missing reading_id
    ValidationResult vr = validate_sensor_reading(&reading);
    TEST_ASSERT_FALSE(vr.valid);
    TEST_ASSERT_TRUE(strstr(vr.error_message, "reading_id") != NULL);
    
    strncpy(reading.reading_id, "VIKASA-TEST", MAX_READING_ID_LEN);
    vr = validate_sensor_reading(&reading);
    TEST_ASSERT_FALSE(vr.valid);
    TEST_ASSERT_TRUE(strstr(vr.error_message, "plant_id") != NULL);
}

void test_validate_sensor_reading_invalid_reading_id_format() {
    SensorReading reading;
    init_sensor_reading(&reading);
    
    strncpy(reading.reading_id, "invalid_id!", MAX_READING_ID_LEN);  // Contains lowercase and !
    strncpy(reading.plant_id, "PLANT-001", MAX_PLANT_ID_LEN);
    strncpy(reading.session_id, "SESSION-001", MAX_SESSION_ID_LEN);
    strncpy(reading.operator_id, "OPERATOR-001", MAX_OPERATOR_ID_LEN);
    strncpy(reading.timestamp, "2026-10-07T10:30:00Z", 31);
    
    ValidationResult vr = validate_sensor_reading(&reading);
    TEST_ASSERT_FALSE(vr.valid);
    TEST_ASSERT_TRUE(strstr(vr.error_message, "invalid characters") != NULL);
}

void test_validate_reflectance_both_required() {
    SensorReading reading;
    init_sensor_reading(&reading);
    
    strncpy(reading.reading_id, "VIKASA-TEST", MAX_READING_ID_LEN);
    strncpy(reading.plant_id, "PLANT-001", MAX_PLANT_ID_LEN);
    strncpy(reading.session_id, "SESSION-001", MAX_SESSION_ID_LEN);
    strncpy(reading.operator_id, "OPERATOR-001", MAX_OPERATOR_ID_LEN);
    strncpy(reading.timestamp, "2026-10-07T10:30:00Z", 31);
    
    // Only red_reflectance
    set_red_reflectance(&reading, 54.2f);
    ValidationResult vr = validate_sensor_reading(&reading);
    TEST_ASSERT_FALSE(vr.valid);
    TEST_ASSERT_TRUE(strstr(vr.error_message, "Both red_reflectance and nir_reflectance") != NULL);
    
    // Add nir_reflectance - should pass
    set_nir_reflectance(&reading, 79.8f);
    vr = validate_sensor_reading(&reading);
    TEST_ASSERT_TRUE(vr.valid);
}

void test_validate_ndvi_requires_reflectance() {
    SensorReading reading;
    init_sensor_reading(&reading);
    
    strncpy(reading.reading_id, "VIKASA-TEST", MAX_READING_ID_LEN);
    strncpy(reading.plant_id, "PLANT-001", MAX_PLANT_ID_LEN);
    strncpy(reading.session_id, "SESSION-001", MAX_SESSION_ID_LEN);
    strncpy(reading.operator_id, "OPERATOR-001", MAX_OPERATOR_ID_LEN);
    strncpy(reading.timestamp, "2026-10-07T10:30:00Z", 31);
    
    // NDVI without reflectance
    set_ndvi(&reading, 0.191f);  // This will fail setter, but test validator directly
    reading.ndvi = (float*)malloc(sizeof(float));
    *reading.ndvi = 0.191f;
    
    ValidationResult vr = validate_sensor_reading(&reading);
    TEST_ASSERT_FALSE(vr.valid);
    TEST_ASSERT_TRUE(strstr(vr.error_message, "NDVI requires calibrated reflectance") != NULL);
    
    free(reading.ndvi);
    reading.ndvi = nullptr;
}

void test_serialize_sensor_reading_basic() {
    SensorReading reading;
    init_sensor_reading(&reading);
    
    strncpy(reading.reading_id, "VIKASA-PLANT-001-1700000000000-001", MAX_READING_ID_LEN);
    strncpy(reading.plant_id, "PLANT-001", MAX_PLANT_ID_LEN);
    strncpy(reading.session_id, "SESSION-001", MAX_SESSION_ID_LEN);
    strncpy(reading.operator_id, "OPERATOR-001", MAX_OPERATOR_ID_LEN);
    strncpy(reading.timestamp, "2026-10-07T10:30:00Z", 31);
    
    char buffer[MAX_JSON_PAYLOAD_SIZE];
    size_t len = serialize_sensor_reading(&reading, buffer, sizeof(buffer));
    
    TEST_ASSERT_GREATER_THAN(0, len);
    TEST_ASSERT_TRUE(strstr(buffer, "\"reading_id\":\"VIKASA-PLANT-001-1700000000000-001\"") != NULL);
    TEST_ASSERT_TRUE(strstr(buffer, "\"plant_id\":\"PLANT-001\"") != NULL);
    TEST_ASSERT_TRUE(strstr(buffer, "\"session_id\":\"SESSION-001\"") != NULL);
    TEST_ASSERT_TRUE(strstr(buffer, "\"operator_id\":\"OPERATOR-001\"") != NULL);
    TEST_ASSERT_TRUE(strstr(buffer, "\"timestamp\":\"2026-10-07T10:30:00Z\"") != NULL);
}

void test_serialize_sensor_reading_with_optional_fields() {
    SensorReading reading;
    init_sensor_reading(&reading);
    
    strncpy(reading.reading_id, "VIKASA-TEST", MAX_READING_ID_LEN);
    strncpy(reading.plant_id, "PLANT-001", MAX_PLANT_ID_LEN);
    strncpy(reading.session_id, "SESSION-001", MAX_SESSION_ID_LEN);
    strncpy(reading.operator_id, "OPERATOR-001", MAX_OPERATOR_ID_LEN);
    strncpy(reading.timestamp, "2026-10-07T10:30:00Z", 31);
    
    set_species(&reading, "Test Species");
    set_red_raw(&reading, 2100);
    set_red_reflectance(&reading, 54.2f);
    set_nir_reflectance(&reading, 79.8f);
    set_ndvi(&reading, 0.191f);
    
    char buffer[MAX_JSON_PAYLOAD_SIZE];
    size_t len = serialize_sensor_reading(&reading, buffer, sizeof(buffer));
    
    TEST_ASSERT_GREATER_THAN(0, len);
    TEST_ASSERT_TRUE(strstr(buffer, "\"species\":\"Test Species\"") != NULL);
    TEST_ASSERT_TRUE(strstr(buffer, "\"red_raw\":2100") != NULL);
    TEST_ASSERT_TRUE(strstr(buffer, "\"red_reflectance\":54.200") != NULL);
    TEST_ASSERT_TRUE(strstr(buffer, "\"nir_reflectance\":79.800") != NULL);
    TEST_ASSERT_TRUE(strstr(buffer, "\"ndvi\":0.191") != NULL);
}

void test_serialize_sensor_reading_development_mode() {
    SensorReading reading;
    init_sensor_reading(&reading);
    
    strncpy(reading.reading_id, "VIKASA-TEST", MAX_READING_ID_LEN);
    strncpy(reading.plant_id, "PLANT-001", MAX_PLANT_ID_LEN);
    strncpy(reading.session_id, "SESSION-001", MAX_SESSION_ID_LEN);
    strncpy(reading.operator_id, "OPERATOR-001", MAX_OPERATOR_ID_LEN);
    strncpy(reading.timestamp, "2026-10-07T10:30:00Z", 31);
    reading.test_only = true;
    
    char buffer[MAX_JSON_PAYLOAD_SIZE];
    size_t len = serialize_sensor_reading(&reading, buffer, sizeof(buffer));
    
    TEST_ASSERT_GREATER_THAN(0, len);
    TEST_ASSERT_TRUE(strstr(buffer, "\"test_only\":true") != NULL);
}

void test_free_sensor_reading() {
    SensorReading reading;
    init_sensor_reading(&reading);
    
    set_red_raw(&reading, 2100);
    set_red_reflectance(&reading, 54.2f);
    
    TEST_ASSERT_NOT_NULL(reading.red_raw);
    TEST_ASSERT_NOT_NULL(reading.red_reflectance);
    
    free_sensor_reading(&reading);
    
    TEST_ASSERT_NULL(reading.red_raw);
    TEST_ASSERT_NULL(reading.red_reflectance);
}

void test_is_timestamp_synced() {
    SensorReading reading;
    init_sensor_reading(&reading);
    
    TEST_ASSERT_FALSE(is_timestamp_synced(&reading));
    
    reading.timestamp_synced = true;
    strncpy(reading.timestamp, "2026-10-07T10:30:00Z", 31);
    TEST_ASSERT_TRUE(is_timestamp_synced(&reading));
    
    reading.timestamp_synced = true;
    strncpy(reading.timestamp, "UNSYNCED", 31);
    TEST_ASSERT_FALSE(is_timestamp_synced(&reading));
}

int main() {
    UNITY_BEGIN();
    
    RUN_TEST(test_init_sensor_reading);
    RUN_TEST(test_setters_required_fields);
    RUN_TEST(test_setters_optional_strings);
    RUN_TEST(test_setters_optional_uint16);
    RUN_TEST(test_setters_optional_uint16_out_of_range);
    RUN_TEST(test_setters_optional_float);
    RUN_TEST(test_setters_optional_float_out_of_range);
    RUN_TEST(test_ndvi_requires_reflectance);
    RUN_TEST(test_ndvi_out_of_range);
    RUN_TEST(test_validate_sensor_reading_valid);
    RUN_TEST(test_validate_sensor_reading_missing_required);
    RUN_TEST(test_validate_sensor_reading_invalid_reading_id_format);
    RUN_TEST(test_validate_reflectance_both_required);
    RUN_TEST(test_validate_ndvi_requires_reflectance);
    RUN_TEST(test_serialize_sensor_reading_basic);
    RUN_TEST(test_serialize_sensor_reading_with_optional_fields);
    RUN_TEST(test_serialize_sensor_reading_development_mode);
    RUN_TEST(test_free_sensor_reading);
    RUN_TEST(test_is_timestamp_synced);
    
    UNITY_END();
}