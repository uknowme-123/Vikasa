# Hardware Setup

This document records the preliminary hardware plan for Vikāsa. It is intentionally written as a design note instead of a validated installation guide.

## Purpose

The system is intended to monitor plant stress with non-invasive reflectance measurements and environmental sensing. The hardware arrangement is still under definition, and all circuit details should be treated as provisional until reviewed.

## Planned hardware components

- Red and NIR reflectance sensing elements
- Environmental sensors for temperature, humidity, and light conditions
- ESP32 microcontroller for data collection and communication
- Supporting power regulation, signal conditioning, and protection circuitry
- Optional enclosure and mounting arrangement for field deployment

## Pending circuit details

The following hardware decisions are not yet confirmed:

- Exact sensor arrangement and spacing relative to the plant surface
- Optics and illumination strategy for red and NIR measurements
- Signal conditioning amplifier and filtering topology
- ADC input configuration and sampling cadence
- PCB layout constraints and electromagnetic noise considerations
- Power budget and battery or regulated supply arrangement
- Sensor waterproofing or environmental protection needs

This list should be considered a working design checklist rather than a tested hardware specification.

## Proposed installation concept

A typical deployment could contain:

```text
Plant / leaf target
    -> Optical sensing head
    -> Analog front-end
    -> ESP32 acquisition unit
    -> Wireless / wired data transfer
    -> Backend ingestion and cloud storage
```

## Environmental and mechanical considerations

- Sensor orientation and mounting geometry will affect repeatability.
- Ambient light conditions may influence the reflectance signal.
- Enclosure design should account for ventilation, condensation, and field durability.
- The final installation method depends on plant type, canopy density, and deployment location.

## Calibration planning

Calibration requirements are expected to include:

- Baseline reference measurements
- Drift checks across repeated sampling cycles
- Environmental compensation strategy
- Documentation of sensor alignment and mounting variance

A final calibration procedure must be defined after hardware selection and bench testing.

## Validation status

No hardware circuit has been validated as part of this repository. Any operational claim about wiring, performance, or reliability would be premature.
