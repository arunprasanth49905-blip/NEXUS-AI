"""
NEXUS EDGE API Routes
Phase 1: Basic System Foundation
"""
from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime, timezone
from backend.app.core.config import settings
from backend.app.services.system_service import get_system_metrics

router = APIRouter()


class QueryRequest(BaseModel):
    message: str
    context_type: str = "general"


class QueryResponse(BaseModel):
    response: str
    status: str
    phase: str
    execution_mode: str
    timestamp: str


@router.get("/health", summary="Health check")
def health_check():
    """
    Returns the basic health status of the NEXUS EDGE local runtime service.
    """
    return {
        "status": "ready",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "phase": settings.PHASE,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "runtime_ready": True,
        "privacy": "protected",
    }


@router.get("/system", summary="System diagnostics")
def system_diagnostics():
    """
    Returns authentic system metrics and hardware diagnostics.
    """
    return get_system_metrics()


@router.get("/context", summary="Current working context")
def get_current_context():
    """
    Returns the active project context and local execution boundary.
    """
    return {
        "project": "NEXUS EDGE",
        "status": "Ready",
        "runtime": "Available",
        "privacy": "Protected",
        "boundary": "Local-first edge perimeter",
        "active_sources": 0,
        "phase": settings.PHASE,
    }


@router.post("/assistant/query", response_model=QueryResponse, summary="Query handler (Phase 1)")
def handle_assistant_query(query: QueryRequest):
    """
    Phase 1 Assistant UX endpoint.
    Provides truthful guidance on system context without fabricating generative LLM responses.
    """
    msg = query.message.strip().lower()
    
    if "status" in msg or "health" in msg:
        reply = (
            "NEXUS EDGE local service is fully operational. "
            "Status: Ready. Runtime: Available. Privacy boundary: Protected (local edge execution)."
        )
    elif "privacy" in msg or "data" in msg:
        reply = (
            "Your privacy is protected. NEXUS EDGE is engineered with a strict local-first boundary. "
            "Telemetry and external cloud relaying are disabled."
        )
    elif "phase" in msg or "roadmap" in msg:
        reply = (
            "Currently running Phase 1: Product Foundation & Application Shell. "
            "Edge AI Model Pipeline will be integrated in Phase 2. Multimodal perception in Phase 3."
        )
    else:
        reply = (
            f"Query acknowledged: \"{query.message}\". "
            "NEXUS EDGE is operating in Phase 1 (Product Foundation). "
            "The full local edge LLM reasoning engine will be activated in Phase 2."
        )

    return QueryResponse(
        response=reply,
        status="success",
        phase=settings.PHASE,
        execution_mode="local_edge_foundation",
        timestamp=datetime.now(timezone.utc).isoformat(),
    )
