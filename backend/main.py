from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from uuid import uuid4
from typing import Dict
from datetime import datetime, timedelta
import html

app = FastAPI()

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store: {session_id: (link, expires_at)}
sessions: Dict[str, tuple] = {}
TTL_MINUTES = 10
MAX_LINK_SIZE = 1024  # 1KB

class SendRequest(BaseModel):
    session_id: str
    link: str

@app.post("/api/send")
def send_link(data: SendRequest):
    if not data.session_id or not data.link:
        raise HTTPException(status_code=400, detail="session_id and link required")
    if len(data.link) > MAX_LINK_SIZE:
        raise HTTPException(status_code=413, detail="Link too large")
    # XSS protection: escape link
    safe_link = html.escape(data.link)
    expires_at = datetime.utcnow() + timedelta(minutes=TTL_MINUTES)
    sessions[data.session_id] = (safe_link, expires_at)
    return {"ok": True}

@app.get("/api/receive/{session_id}")
def receive_link(session_id: str):
    # Clean expired sessions
    now = datetime.utcnow()
    expired = [sid for sid, (_, exp) in sessions.items() if exp < now]
    for sid in expired:
        del sessions[sid]
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Not found or expired")
    link, _ = sessions.pop(session_id)
    return {"link": link}
