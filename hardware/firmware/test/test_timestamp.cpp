#include <Arduino.h>
#include <unity.h>

#include "timestamp.h"

void setUp() {}
void tearDown() {}

void test_rejects_unset_and_boot_epoch_times() {
    TEST_ASSERT_FALSE(timestamp_unix_is_plausible(0));
    TEST_ASSERT_FALSE(timestamp_unix_is_plausible(171));
    TEST_ASSERT_FALSE(timestamp_unix_is_plausible(1577836799));
}

void test_accepts_plausible_epoch_times() {
    TEST_ASSERT_TRUE(timestamp_unix_is_plausible(1577836800));
    TEST_ASSERT_TRUE(timestamp_unix_is_plausible(1791500000));
}

int main() {
    UNITY_BEGIN();
    RUN_TEST(test_rejects_unset_and_boot_epoch_times);
    RUN_TEST(test_accepts_plausible_epoch_times);
    return UNITY_END();
}
