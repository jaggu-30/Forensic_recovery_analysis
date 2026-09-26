from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.investigations import router as investigation_router
from app.api.evidence import router as evidence_router
from app.api.analysis import router as analysis_router
from app.api.reconstruction import router as reconstruction_router
from app.api.ai_reconstruction import router as ai_reconstruction_router
from app.api.evidence_preview import router as evidence_preview_router

from app.models.evidence import Evidence
from app.core.database import get_db
from app.api.video_reconstruction import (
    router as video_reconstruction_router
)

app = FastAPI(
    title="RECOVERAI API",
    description=(
        "AI-Assisted Intelligent Data Recovery "
        "and Digital Evidence Reconstruction"
    ),
    version="0.1.0",
)


# ---------------------------------------------------------
# CORS
# ---------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------
# API ROUTERS
# ---------------------------------------------------------

app.include_router(
    investigation_router
)

app.include_router(
    evidence_router
)

app.include_router(
    analysis_router
)

app.include_router(
    reconstruction_router
)

app.include_router(
    ai_reconstruction_router
)

app.include_router(
    evidence_preview_router
)
app.include_router(
    video_reconstruction_router
)

# ---------------------------------------------------------
# ROOT
# ---------------------------------------------------------

@app.get("/")
def root():
    return {
        "name": "RECOVERAI",
        "description": (
            "AI-Assisted Intelligent Data Recovery "
            "and Digital Evidence Reconstruction"
        ),
        "status": "online",
        "version": "0.1.0",
        "services": {
            "investigation": "online",
            "evidence": "online",
            "analysis": "online",
            "reconstruction": "online",
            "ai_reconstruction": "online",
            "evidence_preview": "online",
        },
    }


# ---------------------------------------------------------
# HEALTH
# ---------------------------------------------------------

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "RECOVERAI",
    }