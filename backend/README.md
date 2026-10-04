# Backend

This folder contains the planned Flask-based backend for Vikāsa. It is organized to support API routes, business logic, schemas, utility helpers, and tests.

## Proposed responsibilities

- Receive sensor readings from the ESP32 or edge acquisition layer
- Validate and normalize incoming data
- Store and retrieve records for downstream analysis
- Coordinate Firebase synchronization
- Expose API endpoints for dashboard and alert operations

## Planned structure

- `app/` — application package
  - `routes/` — endpoint definitions
  - `services/` — reusable service logic
  - `schemas/` — request and response schema definitions
  - `utils/` — helper functions and shared utilities
- `tests/` — backend validation and API tests

## Pending implementation decisions

- Authentication and access model
- API versioning and route conventions
- Storage abstractions between Flask and Firebase
- Validation rules for sensor payloads
- Alert trigger and escalation logic

## Status

The backend is only scaffolded for future implementation. No API behavior or production logic is implemented here yet.
