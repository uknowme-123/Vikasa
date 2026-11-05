# Vikāsa – Roadmap & Conclusion

## 1. Release v0.1.0 Summary

Version 0.1.0 delivers a **working end-to-end software data pipeline**:
- ESP32-C3 firmware with sensor drivers, optical processing, NTP and retry logic
- Flask REST API with a 24-field validated schema and 57 passing tests
- Supabase, Firebase and in-memory storage backends
- React dashboard with 7 pages and live 10-second updates
- CI/CD on GitHub Actions
- 3D-printed leaf mount prototype

## 2. Future Roadmap

### Hardware
- Constant-current LED drivers for stable illumination
- Redesigned transimpedance amplifier with selectable gain
- Additional wavelengths (e.g. 730 nm, 850 nm) for more vegetation indices
- Better sensors: capacitive soil moisture, BH1750/TSL2591 light sensor, leaf temperature
- Custom PCB integrating all components
- Battery and solar power with deep-sleep mode
- Weatherproof (IP65) enclosure

### Firmware
- Calibration values stored in device memory (NVS)
- Local buffering of readings when Wi-Fi is down
- Exponential back-off for retries
- Over-the-air (OTA) firmware updates
- Low-power operation and battery monitoring

### Backend
- Authentication: API keys for devices, login for dashboard users
- Device registration and management
- Alert rules (e.g. low NDVI, dry soil, device offline) with Telegram/email notifications
- Data aggregation (daily averages, min/max)
- Database backup and retention policies

### Machine Learning
- Collect labeled hardware data
- Train a plant stress classification model
- Deploy the model on the ESP32 using TinyML

### Connectivity (optional)
- BLE for local setup
- LoRa/LoRaWAN for remote farms without Wi-Fi

## 3. Conclusion

Vikāsa demonstrates a complete, low-cost IoT pipeline for non-invasive plant health monitoring, from optical sensing on an ESP32-C3 to a live web dashboard. The software stack is functional and tested, with strict data-integrity rules that keep raw and calibrated measurements separate. The next phases focus on hardware calibration, real-world data collection and machine-learning-based stress detection, so the system can give early, actionable insights to farmers, greenhouses and researchers.

## 4. References

1. Rouse, J. W. et al. (1974). *Monitoring vegetation systems in the Great Plains with ERTS.* (NDVI)
2. Espressif Systems – ESP32-C3 Technical Reference Manual
3. Texas Instruments – ADS1115 Datasheet
4. Flask Documentation – https://flask.palletsprojects.com
5. React Documentation – https://react.dev
6. Supabase Documentation – https://supabase.com/docs
7. [Add any other papers or sources your team used]

## 5. License

This project is released under the **MIT License**.
