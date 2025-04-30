
"""
Contract tests for API endpoints (example stub).
"""

import pytest

def test_healthcheck(client):
    """
    Example healthcheck endpoint test.
    """
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
