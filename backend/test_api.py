import pytest
from fastapi.testclient import TestClient
from main import app, MAX_LINK_SIZE
from uuid import uuid4

client = TestClient(app)

def test_send_and_receive():
    session_id = str(uuid4())
    link = "https://example.com"
    # Send
    resp = client.post("/api/send", json={"session_id": session_id, "link": link})
    assert resp.status_code == 200
    # Receive
    resp = client.get(f"/api/receive/{session_id}")
    assert resp.status_code == 200
    assert resp.json()["link"] == link
    # Second receive should 404
    resp = client.get(f"/api/receive/{session_id}")
    assert resp.status_code == 404

def test_link_too_large():
    session_id = str(uuid4())
    link = "a" * (MAX_LINK_SIZE + 1)
    resp = client.post("/api/send", json={"session_id": session_id, "link": link})
    assert resp.status_code == 413

def test_missing_fields():
    resp = client.post("/api/send", json={"session_id": "", "link": ""})
    assert resp.status_code == 400
