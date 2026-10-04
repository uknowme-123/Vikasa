# Firmware

This folder is reserved for the ESP32 firmware that will acquire sensor data, manage capture timing, and communicate with the backend or Firebase-connected services.

## Proposed responsibilities

- Sensor polling and data acquisition
- Basic preprocessing or filtering at the edge
- Packaging readings into a defined message format
- Wireless transmission to the backend or gateway layer
- Error, retry, and watchdog handling

## Planned structure

- `src/` — firmware implementation files
- `include/` — shared headers and configuration values
- `lib/` — third-party or local reusable modules
- `test/` — embedded tests and validation scaffolding

## Pending decisions

- Final sensor polling frequency
- Message protocol and payload schema
- Deep sleep or continuous operation mode
- Connectivity strategy and OTA approach
- Error recovery and offline buffering behavior

## Status

Firmware implementation has not started and no board-level validation is claimed here.
