// Vikāsa Prototype Sensor Sketch
// This is a legacy prototype sketch for reference only.
// It demonstrates the sensor reading logic used before the PlatformIO firmware.
//
// IMPORTANT: This sketch uses hardcoded example values. For actual deployment,
// copy config/secrets.example.h to config/secrets.h and fill in your credentials.
// The main firmware in src/ uses the secrets.h pattern for configuration.
//
// Hardware: ESP32 with ADS1115, SH1106 OLED, DHT22, LDR, Soil moisture sensor
// Optical: Red LED (660nm) and NIR LED (940nm) for NDVI calculation

#include <WiFi.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SH110X.h>
#include <Adafruit_ADS1X15.h>
#include <DHT.h>
#include <math.h>
#include <HTTPClient.h>
#include <time.h>

// ==================================================
// CONFIGURATION - Use secrets.h for real deployments
// ==================================================
// #include "config/secrets.h"  // Uncomment and create secrets.h from secrets.example.h

// Example values (replace with your credentials in secrets.h)
#ifndef WIFI_SSID
#define WIFI_SSID "YOUR_WIFI_SSID"
#endif
#ifndef WIFI_PASSWORD
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
#endif
#ifndef API_URL
#define API_URL "http://YOUR_API_HOST:5000/api/sensor-data"
#endif
#ifndef PLANT_ID
#define PLANT_ID "PLANT-001"
#endif
#ifndef SESSION_ID
#define SESSION_ID "SESSION-001"
#endif
#ifndef OPERATOR_ID
#define OPERATOR_ID "OPERATOR-001"
#endif

unsigned long lastUploadMs = 0;
const unsigned long UPLOAD_INTERVAL_MS = 10000;

// Sensor thresholds (adjust based on calibration)
const int SOIL_MOISTURE_THRESHOLD = 3000;
const float NDVI_HEALTH_THRESHOLD = 0.03;

// ==================================================
// PIN CONFIGURATION
// ==================================================

#define LDR_PIN       A2
#define SOIL_PIN      A3

#define NIR_LED_PIN   D0
#define RED_LED_PIN   D1

#define DHT_PIN       D3
#define DHT_TYPE      DHT22

#define SDA_PIN       4
#define SCL_PIN       5

// ==================================================
// DEVICE ADDRESSES
// ==================================================

#define OLED_ADDR     0x3C
#define ADS_ADDR      0x48

Adafruit_SH1106G display(128, 64, &Wire, -1);
Adafruit_ADS1115 ads;
DHT dht(DHT_PIN, DHT_TYPE);

// ==================================================
// SENSOR VALUES
// ==================================================

int ldrRaw = 0;
int soilRaw = 0;
int redRaw = 0;
int nirRaw = 0;

float ndvi = NAN;
float temperature = NAN;
float humidity = NAN;

bool soilIsMoist = false;
bool plantIsHealthy = false;

// ==================================================
// WIFI CONNECTION
// ==================================================

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.print("Connecting to Wi-Fi");

  unsigned long startTime = millis();

  while (WiFi.status() != WL_CONNECTED &&
         millis() - startTime < 20000) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("Wi-Fi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("Wi-Fi connection failed.");
    Serial.println("Continuing offline.");
  }
}

// ==================================================
// ADS1115 AVERAGING
// ==================================================

int readADSaverage(uint8_t channel) {
  long total = 0;

  for (int i = 0; i < 10; i++) {
    total += ads.readADC_SingleEnded(channel);
    delay(5);
  }

  return (int)(total / 10);
}

// ==================================================
// SEPARATE RED AND NIR MEASUREMENTS
// ==================================================

void readOpticalSensors() {
  // Ensure both LEDs start OFF
  digitalWrite(RED_LED_PIN, LOW);
  digitalWrite(NIR_LED_PIN, LOW);
  delay(50);

  // Measure RED response with RED LED only
  digitalWrite(RED_LED_PIN, HIGH);
  delay(100);

  redRaw = readADSaverage(0);  // ADS1115 A0

  digitalWrite(RED_LED_PIN, LOW);
  delay(50);

  // Measure NIR response with NIR LED only
  digitalWrite(NIR_LED_PIN, HIGH);
  delay(100);

  nirRaw = readADSaverage(1);  // ADS1115 A1

  digitalWrite(NIR_LED_PIN, LOW);
  delay(50);
}

// ==================================================
// NDVI CALCULATION AND CLASSIFICATION
// ==================================================

void calculatePlantHealth() {
  // Reset status so an old result cannot remain
  plantIsHealthy = false;

  // ADS1115 single-ended readings should be non-negative.
  // The sum must be positive for the formula to be valid.
  long signalSum = (long)nirRaw + (long)redRaw;

  if (signalSum > 0) {
    ndvi = ((float)nirRaw - (float)redRaw)
           / (float)signalSum;
  } else {
    ndvi = NAN;
  }

  if (!isnan(ndvi)) {
    plantIsHealthy = (ndvi > NDVI_HEALTH_THRESHOLD);
  }

  // Print values from this measurement cycle
  Serial.print("RED=");
  Serial.print(redRaw);

  Serial.print(", NIR=");
  Serial.print(nirRaw);

  Serial.print(", CALCULATED_NDVI=");

  if (isnan(ndvi)) {
    Serial.print("INVALID");
  } else {
    Serial.print(ndvi, 4);
  }

  Serial.print(", PLANT_STATUS=");

  if (isnan(ndvi)) {
    Serial.println("UNKNOWN");
  } else {
    Serial.println(plantIsHealthy ? "HEALTHY" : "UNHEALTHY");
  }
}

// ==================================================
// OLED DISPLAY
// ==================================================

void showReadings() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SH110X_WHITE);
  display.setCursor(0, 0);

  display.println("Vikasa");

  display.print("LDR: ");
  display.println(ldrRaw);

  display.print("Soil: ");
  display.print(soilRaw);
  display.print(" ");
  display.println(soilIsMoist ? "MOIST" : "DRY");

  display.print("RED: ");
  display.println(redRaw);

  display.print("NIR: ");
  display.println(nirRaw);

  display.print("NDVI: ");

  if (isnan(ndvi)) {
    display.println("INVALID");
  } else {
    display.println(ndvi, 4);
  }

  display.print("Plant: ");

  if (isnan(ndvi)) {
    display.println("UNKNOWN");
  } else {
    display.println(
      plantIsHealthy ? "HEALTHY" : "UNHEALTHY"
    );
  }

  display.print("T:");

  if (isnan(temperature)) {
    display.print("--");
  } else {
    display.print(temperature, 1);
  }

  display.print("C H:");

  if (isnan(humidity)) {
    display.print("--");
  } else {
    display.print(humidity, 1);
  }

  display.println("%");

  display.display();
}

// ==================================================
// UPLOAD SENSOR DATA TO API
// ==================================================

void uploadSensorReading() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[API] Skipped: Wi-Fi disconnected");
    return;
  }

  time_t now = time(nullptr);

  if (now < 1700000000) {
    Serial.println("[API] Waiting for valid network time");
    return;
  }

  struct tm timeInfo;
  gmtime_r(&now, &timeInfo);

  char timestamp[25];
  char readingId[32];

  strftime(
    timestamp,
    sizeof(timestamp),
    "%Y-%m-%dT%H:%M:%SZ",
    &timeInfo
  );

  strftime(
    readingId,
    sizeof(readingId),
    "VIK-%Y%m%d-%H%M%S",
    &timeInfo
  );

  String json = "{";

  json += "\"reading_id\":\"";
  json += readingId;
  json += "\",";

  json += "\"plant_id\":\"";
  json += PLANT_ID;
  json += "\",";

  json += "\"session_id\":\"";
  json += SESSION_ID;
  json += "\",";

  json += "\"operator_id\":\"";
  json += OPERATOR_ID;
  json += "\",";

  json += "\"timestamp\":\"";
  json += timestamp;
  json += "\",";

  json += "\"ambient_light_raw\":";
  json += String(max(0, ldrRaw));
  json += ",";

  json += "\"soil_moisture_raw\":";
  json += String(max(0, soilRaw));
  json += ",";

  json += "\"red_raw\":";
  json += String(max(0, redRaw));
  json += ",";

  json += "\"nir_raw\":";
  json += String(max(0, nirRaw));
  json += ",";

  json += "\"temperature_c\":";
  json += isnan(temperature)
          ? String("null")
          : String(temperature, 2);
  json += ",";

  json += "\"humidity_pct\":";
  json += isnan(humidity)
          ? String("null")
          : String(humidity, 2);

  json += "}";

  HTTPClient http;
  http.setTimeout(5000);

  if (!http.begin(API_URL)) {
    Serial.println("[API] Could not initialize HTTP");
    return;
  }

  http.addHeader("Content-Type", "application/json");

  Serial.println("[API] Sending sensor reading...");
  Serial.println(json);

  int status = http.POST(json);

  Serial.print("[API] HTTP status: ");
  Serial.println(status);

  if (status > 0) {
    Serial.println(http.getString());
  } else {
    Serial.println(http.errorToString(status));
  }

  http.end();
}

// ==================================================
// SETUP
// ==================================================

void setup() {
  Serial.begin(115200);
  delay(300);

  // LEDs are now controlled independently
  pinMode(RED_LED_PIN, OUTPUT);
  pinMode(NIR_LED_PIN, OUTPUT);

  digitalWrite(RED_LED_PIN, LOW);
  digitalWrite(NIR_LED_PIN, LOW);

  pinMode(LDR_PIN, INPUT);
  pinMode(SOIL_PIN, INPUT);

  // I2C
  Wire.begin(SDA_PIN, SCL_PIN);
  Wire.setClock(400000);

  // OLED
  if (!display.begin(OLED_ADDR, true)) {
    Serial.println("ERROR: OLED initialization failed");

    while (true) {
      delay(10);
    }
  }

  // ADS1115
  if (!ads.begin(ADS_ADDR)) {
    Serial.println("ERROR: ADS1115 initialization failed");

    while (true) {
      delay(10);
    }
  }

  ads.setGain(GAIN_ONE);
  ads.setDataRate(RATE_ADS1115_860SPS);

  // DHT22
  dht.begin();

  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SH110X_WHITE);
  display.setCursor(0, 0);
  display.println("Vikasa");
  display.println("Starting sensors...");
  display.display();

  // Connect to Wi-Fi
  connectWiFi();

  if (WiFi.status() == WL_CONNECTED) {
    configTime(0, 0, "pool.ntp.org", "time.nist.gov");
    Serial.println("Requesting network time...");
  }

  display.clearDisplay();
  display.setCursor(0, 0);
  display.println("Vikasa");
  display.println(
    WiFi.status() == WL_CONNECTED
      ? "Wi-Fi connected"
      : "Wi-Fi offline"
  );
  display.display();

  delay(1500);
}

// ==================================================
// MAIN LOOP
// ==================================================

void loop() {
  // Read environmental sensors
  ldrRaw = analogRead(LDR_PIN);
  soilRaw = analogRead(SOIL_PIN);

  // Measure red and NIR separately
  readOpticalSensors();

  // Calculate NDVI using this cycle's readings
  calculatePlantHealth();

  // Read DHT22
  temperature = dht.readTemperature();
  humidity = dht.readHumidity();

  // Soil moisture threshold
  soilIsMoist = (soilRaw < SOIL_MOISTURE_THRESHOLD);

  // Display current readings
  showReadings();

  // Print environmental sensor readings
  Serial.print("LDR=");
  Serial.print(ldrRaw);

  Serial.print(", SOIL=");
  Serial.print(soilRaw);

  Serial.print(", SOIL_STATUS=");
  Serial.print(soilIsMoist ? "MOIST" : "DRY");

  Serial.print(", TEMP=");

  if (isnan(temperature)) {
    Serial.print("ERR");
  } else {
    Serial.print(temperature, 1);
  }

  Serial.print(", HUMIDITY=");

  if (isnan(humidity)) {
    Serial.println("ERR");
  } else {
    Serial.println(humidity, 1);
  }

  // Reconnect if Wi-Fi drops
  if (WiFi.status() != WL_CONNECTED) {
    WiFi.reconnect();
  }

  // Upload every 10 seconds
  if (millis() - lastUploadMs >= UPLOAD_INTERVAL_MS) {
    lastUploadMs = millis();
    uploadSensorReading();
  }

  delay(2000);
}