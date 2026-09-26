"""
NEXUS EDGE Backend API Tests
"""
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"
    assert data["service"] == "NEXUS EDGE"
    assert data["version"] == "0.1.0"
    assert data["privacy"] == "protected"


def test_system_diagnostics_endpoint():
    response = client.get("/api/v1/system")
    assert response.status_code == 200
    data = response.json()
    assert "system" in data
    assert "runtime" in data
    assert "acceleration" in data
    # Verify no fake NPU is claimed
    assert data["acceleration"]["npu"] == "Not detected"
    assert data["acceleration"]["tops_rating"] == "Unknown"


def test_context_endpoint():
    response = client.get("/api/v1/context")
    assert response.status_code == 200
    data = response.json()
    assert data["project"] == "NEXUS EDGE"
    assert data["status"] == "Ready"


def test_assistant_query_endpoint():
    response = client.post("/api/v1/assistant/query", json={"message": "What is current status?"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "NEXUS EDGE" in data["response"]
