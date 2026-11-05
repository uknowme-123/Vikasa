# Vikāsa – Hardware Design

## 1. Hardware Components List

| Component | Purpose |
|-----------|---------|
| ESP32-C3 (PCB CUPID GLYPH C3) | Main microcontroller with Wi-Fi |
| BPW34 photodiodes (×2) | Detect reflected red and NIR light |
| Transimpedance amplifier (AFE) | Converts photodiode current to voltage |
| ADS1115 (16-bit ADC) | High-resolution measurement of optical signals |
| Red LED (660 nm) | Red illumination source |
| NIR LED (940 nm) | Near-infrared illumination source |
| DHT22 | Air temperature and humidity |
| Soil moisture sensor | Soil water content |
| LDR (light-dependent resistor) | Ambient light level |
| 3D-printed leaf mount | Holds sensors at a fixed distance and angle from the leaf |

## 2. Microcontroller

The **ESP32-C3** was chosen for its low cost, built-in Wi-Fi, low power consumption and Arduino/PlatformIO support. Board used: PCB CUPID GLYPH C3 (ESP32-C3-MINI-1-N4, 4 MB flash).

## 3. Optical Measurement Principle

Healthy leaves **absorb red light** (used in photosynthesis) and **strongly reflect near-infrared light**. Stressed leaves reflect more red and less NIR. NDVI captures this difference:

```
NDVI = (NIR reflectance − Red reflectance) / (NIR reflectance + Red reflectance)
```

- NDVI close to **+1** → healthy, dense vegetation
- NDVI close to **0** → stressed or sparse vegetation

**Measurement sequence:**
1. **Dark reading:** LEDs off, which measures sensor offset and stray light.
2. **Reference reading:** LEDs on with a white reference standard (e.g. Spectralon).
3. **Sample reading:** LEDs on with the leaf in place.

```
Reflectance (%) = (Sample − Dark) / (Reference − Dark) × 100
```

## 4. Pin Mapping

| Sensor / Signal | Interface | Pin / Channel |
|-----------------|-----------|---------------|
| Red optical (660 nm) | ADS1115 | AIN0 |
| NIR optical (940 nm) | ADS1115 | AIN1 |
| Red dark | ADS1115 | AIN2 |
| NIR dark | ADS1115 | AIN3 |
| DHT22 | GPIO | GPIO10 |
| Soil moisture | ESP32 ADC | GPIO2 |
| Ambient light (LDR) | ESP32 ADC | GPIO3 |
| Red LED | GPIO | GPIO6 |
| NIR LED | GPIO | GPIO7 |
| I²C SDA / SCL (ADS1115, address 0x48) | I²C @ 400 kHz | GPIO4 / GPIO5 |

**ADS1115 constraint:** it has only 4 single-ended channels, so reference readings reuse the sample channels (AIN0/AIN1) at different times. Soil moisture and ambient light are read through the ESP32's own ADC to avoid channel conflicts.

## 5. Circuit Design

**[Insert circuit diagram / schematic image here]**

Briefly describe:
- Photodiode → transimpedance amplifier → ADS1115 connection
- LED driver circuit (GPIO switched)
- Power supply arrangement

## 6. 3D-Printed Leaf Mount

- **File:** `Leaf_Mount.stl` (binary STL, 950 triangles, about 48 KB)
- **Purpose:** holds the red LED, NIR LED and photodetector at a consistent distance and angle from the leaf for repeatable readings.
- **Material:** PLA or PETG, printed flat with no supports needed.
- **Status:** prototype; not yet field-validated.

**[Insert photo or render of the leaf mount here]**

## 7. Calibration Requirements (Pending)

| Item | What is needed |
|------|----------------|
| Optical | Transimpedance gain values, dark offsets, reference standard (Spectralon) procedure |
| Soil moisture | Dry and wet ADC calibration points (currently placeholders 3000 / 1000) |
| Ambient light | Lux-per-ADC conversion factor |
| DHT22 | None (factory calibrated) |
