# 3D Print Models

This directory contains 3D-printable STL models for the Vikāsa hardware.

## Leaf_Mount.stl

**Purpose**: Mounting bracket for securing the sensor node to a plant leaf or stem for non-invasive optical measurements (red/NIR reflectance for NDVI calculation).

**File**: `Leaf_Mount.stl`
- Format: Binary STL
- Triangle count: 950
- File size: ~48 KB

**Design intent**: The mount positions the optical sensors (red 660nm LED, NIR 940nm LED, and photodetector) at a consistent distance and angle relative to the leaf surface for repeatable NDVI readings.

**Print notes**:
- No support material required (verify in slicer)
- Recommended material: PLA or PETG
- Orientation: Print flat on the build plate for best surface finish on the sensor-facing side

**Status**: Prototype design - not yet validated in field deployment. Dimensions and fit should be verified before printing for production use.

---

*This model corresponds to the preliminary hardware design documented in `../hardware/README.md`. The sensor arrangement and optical geometry are not final and require design review.*