// Vikāsa ESP32 Firmware - Unit Tests for Reading ID Generation
// Run with: pio test -e native-test

#include <Arduino.h>
#include <unity.h>
#include <string.h>
#include <stdio.h>

#include "reading_id.h"

// Mock millis() for deterministic testing
static uint32_t mock_millis_value = 1000000;

extern "C" uint32_t millis() {
    return mock_millis_value;
}

void setUp() {
    mock_millis_value = 1000000;
}

void tearDown() {}

void test_reading_id_init() {
    ReadingIdGenerator gen;
    reading_id_init(&gen, "PLANT-001");
    
    TEST_ASSERT_TRUE(gen.initialized);
    TEST_ASSERT_EQUAL_STRING("PLANT-001", gen.plant_id);
    TEST_ASSERT_EQUAL(0, gen.sequence_counter);
    TEST_ASSERT_EQUAL(0, gen.last_timestamp_ms);
}

void test_reading_id_generate_basic() {
    ReadingIdGenerator gen;
    reading_id_init(&gen, "PLANT-001");
    
    char buffer[READING_ID_MAX_LEN + 1];
    bool result = reading_id_generate(&gen, buffer, sizeof(buffer));
    
    TEST_ASSERT_TRUE(result);
    TEST_ASSERT_TRUE(strlen(buffer) > 0);
    TEST_ASSERT_TRUE(strlen(buffer) <= READING_ID_MAX_LEN);
    
    // Check format: VIKASA-PLANT-001-TIMESTAMP-SEQUENCE
    TEST_ASSERT_TRUE(strncmp(buffer, "VIKASA-PLANT-001-", 17) == 0);
}

void test_reading_id_sequence_increments() {
    ReadingIdGenerator gen;
    reading_id_init(&gen, "PLANT-001");
    
    char buffer1[READING_ID_MAX_LEN + 1];
    char buffer2[READING_ID_MAX_LEN + 1];
    
    reading_id_generate(&gen, buffer1, sizeof(buffer1));
    reading_id_generate(&gen, buffer2, sizeof(buffer2));
    
    TEST_ASSERT_NOT_EQUAL_STRING(buffer1, buffer2);
    TEST_ASSERT_EQUAL(2, gen.sequence_counter);
}

void test_reading_id_resets_sequence_on_new_timestamp() {
    ReadingIdGenerator gen;
    reading_id_init(&gen, "PLANT-001");
    
    char buffer1[READING_ID_MAX_LEN + 1];
    char buffer2[READING_ID_MAX_LEN + 1];
    
    reading_id_generate(&gen, buffer1, sizeof(buffer1));
    mock_millis_value += 1;  // New millisecond
    reading_id_generate(&gen, buffer2, sizeof(buffer2));
    
    // Sequence should reset to 1
    TEST_ASSERT_EQUAL(1, gen.sequence_counter);
}

void test_reading_id_format_matches_backend_pattern() {
    ReadingIdGenerator gen;
    reading_id_init(&gen, "PLANT-001");
    
    char buffer[READING_ID_MAX_LEN + 1];
    reading_id_generate(&gen, buffer, sizeof(buffer));
    
    // Backend pattern: ^[A-Z0-9-]{1,64}$
    for (size_t i = 0; i < strlen(buffer); i++) {
        char c = buffer[i];
        TEST_ASSERT_TRUE((c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '-');
    }
}

void test_reading_id_max_length() {
    ReadingIdGenerator gen;
    reading_id_init(&gen, "VERY-LONG-PLANT-IDENTIFIER-THAT-MIGHT-CAUSE-ISSUES");
    
    char buffer[READING_ID_MAX_LEN + 1];
    bool result = reading_id_generate(&gen, buffer, sizeof(buffer));
    
    // Should still succeed but truncate if needed
    TEST_ASSERT_TRUE(result);
    TEST_ASSERT_LESS_OR_EQUAL(READING_ID_MAX_LEN, strlen(buffer));
}

void test_reading_id_buffer_too_small() {
    ReadingIdGenerator gen;
    reading_id_init(&gen, "PLANT-001");
    
    char small_buffer[10];
    bool result = reading_id_generate(&gen, small_buffer, sizeof(small_buffer));
    
    TEST_ASSERT_FALSE(result);
}

void test_reading_id_null_generator() {
    char buffer[READING_ID_MAX_LEN + 1];
    bool result = reading_id_generate(NULL, buffer, sizeof(buffer));
    TEST_ASSERT_FALSE(result);
}

void test_reading_id_null_buffer() {
    ReadingIdGenerator gen;
    reading_id_init(&gen, "PLANT-001");
    
    bool result = reading_id_generate(&gen, NULL, 100);
    TEST_ASSERT_FALSE(result);
}

void test_reading_id_reset() {
    ReadingIdGenerator gen;
    reading_id_init(&gen, "PLANT-001");
    
    char buffer[READING_ID_MAX_LEN + 1];
    reading_id_generate(&gen, buffer, sizeof(buffer));
    reading_id_generate(&gen, buffer, sizeof(buffer));
    
    TEST_ASSERT_EQUAL(2, gen.sequence_counter);
    
    reading_id_reset(&gen);
    TEST_ASSERT_EQUAL(0, gen.sequence_counter);
    TEST_ASSERT_EQUAL(0, gen.last_timestamp_ms);
}

void test_reading_id_get_sequence() {
    ReadingIdGenerator gen;
    reading_id_init(&gen, "PLANT-001");
    
    TEST_ASSERT_EQUAL(0, reading_id_get_sequence(&gen));
    
    char buffer[READING_ID_MAX_LEN + 1];
    reading_id_generate(&gen, buffer, sizeof(buffer));
    TEST_ASSERT_EQUAL(1, reading_id_get_sequence(&gen));
    
    reading_id_generate(&gen, buffer, sizeof(buffer));
    TEST_ASSERT_EQUAL(2, reading_id_get_sequence(&gen));
}

int main() {
    UNITY_BEGIN();
    
    RUN_TEST(test_reading_id_init);
    RUN_TEST(test_reading_id_generate_basic);
    RUN_TEST(test_reading_id_sequence_increments);
    RUN_TEST(test_reading_id_resets_sequence_on_new_timestamp);
    RUN_TEST(test_reading_id_format_matches_backend_pattern);
    RUN_TEST(test_reading_id_max_length);
    RUN_TEST(test_reading_id_buffer_too_small);
    RUN_TEST(test_reading_id_null_generator);
    RUN_TEST(test_reading_id_null_buffer);
    RUN_TEST(test_reading_id_reset);
    RUN_TEST(test_reading_id_get_sequence);
    
    UNITY_END();
}