"""API tests for the Flask reading endpoints."""

from datetime import datetime, timezone

import pytest

from backend.app import create_app


@pytest.fixture
def client():
    app = create_app()
    app.config.update(TESTING=True)
    with app.test_client() as test_client:
        yield test_client


def valid_payload(reading_id: str = "API-READING-001", plant_id: str = "PLANT-API-001"):
    return {
        "reading_id": reading_id,
        "plant_id": plant_id,
        "session_id": "SESSION-API-001",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "operator_id": "OPERATOR-API-001",
        "red_raw": 2100,
        "nir_raw": 3200,
    }


def test_health_and_existing_sensor_data_endpoint(client):
    health = client.get("/api/health")
    readings = client.get("/api/sensor-data")

    assert health.status_code == 200
    assert readings.status_code == 200
    assert readings.get_json()["success"] is True


def test_reading_aliases_create_latest_history_and_plant_status(client):
    response = client.post("/api/readings", json=valid_payload())
    assert response.status_code == 201
    assert response.get_json()["data"]["reading_id"] == "API-READING-001"

    latest = client.get("/api/readings/latest")
    history = client.get("/api/readings?limit=1")
    status = client.get("/api/plants/PLANT-API-001/status")

    assert latest.status_code == 200
    assert latest.get_json()["data"]["reading_id"] == "API-READING-001"
    assert history.status_code == 200
    assert history.get_json()["data"]["items"][0]["reading_id"] == "API-READING-001"
    assert status.status_code == 200
    assert status.get_json()["data"]["status_available"] is False


def test_invalid_payload_duplicate_and_missing_plant(client):
    invalid = client.post("/api/readings", json={})
    assert invalid.status_code == 400

    client.post("/api/readings", json=valid_payload())
    duplicate = client.post("/api/readings", json=valid_payload())
    missing_plant = client.get("/api/plants/UNKNOWN/status")

    assert duplicate.status_code == 409
    assert missing_plant.status_code == 404


@pytest.mark.parametrize("query", ["?limit=0", "?limit=bad", "?page=bad", "?page_size=0"])
def test_invalid_pagination_returns_bad_request(client, query):
    response = client.get(f"/api/readings{query}")
    assert response.status_code == 400


def test_ndvi_requires_calibrated_reflectance(client):
    payload = valid_payload()
    payload["ndvi"] = 0.2

    response = client.post("/api/readings", json=payload)

    assert response.status_code == 400
    assert response.get_json()["success"] is False


def test_plant_summaries_use_stored_readings_only(client):
    empty = client.get("/api/plants/summaries")
    assert empty.status_code == 200
    assert empty.get_json()["data"] == []

    client.post(
        "/api/readings",
        json=valid_payload("SUMMARY-001", "PLANT-SUMMARY-001"),
    )
    summary = client.get("/api/plants/summaries")

    assert summary.status_code == 200
    assert summary.get_json()["data"] == [
        {
            "plant_id": "PLANT-SUMMARY-001",
            "species": None,
            "latest_timestamp": summary.get_json()["data"][0]["latest_timestamp"],
            "health_label": None,
            "reading_count": 1,
        }
    ]


def test_system_status_does_not_claim_hardware_or_firebase(client):
    response = client.get("/api/system/status")
    data = response.get_json()["data"]

    assert response.status_code == 200
    assert data["api"] == "connected"
    assert data["storage_backend"] == "memory"
    assert data["esp32"] == "unknown"
    assert data["firebase"] == "unknown"


def test_alerts_are_truthful_empty_result(client):
    response = client.get("/api/alerts")
    data = response.get_json()["data"]

    assert response.status_code == 200
    assert data == {
        "alerts": [],
        "total": 0,
        "generated": False,
        "message": "Alert generation is not implemented.",
    }


def test_operations_endpoint_reports_storage_failure(client, monkeypatch):
    async def failing_health_check():
        raise RuntimeError("storage unavailable")

    monkeypatch.setattr(client.application.storage, "health_check", failing_health_check)
    response = client.get("/api/system/status")

    assert response.status_code == 503
    assert response.get_json()["error"]["error"] == "STORAGE_ERROR"
