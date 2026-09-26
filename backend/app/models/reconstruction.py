from sqlalchemy import Column, Float, ForeignKey, Integer, String, Text

from app.core.database import Base


class ReconstructionCandidate(Base):
    __tablename__ = "reconstruction_candidates"

    id = Column(Integer, primary_key=True, index=True)

    evidence_id = Column(
        String(100),
        ForeignKey("evidence.id"),
        index=True,
        nullable=False,
    )

    candidate_id = Column(
        String(100),
        unique=True,
        index=True,
        nullable=False,
    )

    file_type = Column(
        String(50),
        nullable=False,
    )

    status = Column(
        String(100),
        nullable=False,
    )

    structural_confidence = Column(
        Float,
        nullable=False,
        default=0.0,
    )

    recovery_confidence = Column(
        Float,
        nullable=False,
        default=0.0,
    )

    verified_bytes = Column(
        Integer,
        nullable=False,
        default=0,
    )

    reconstructed_bytes = Column(
        Integer,
        nullable=False,
        default=0,
    )

    missing_bytes = Column(
        Integer,
        nullable=False,
        default=0,
    )

    notes = Column(
        Text,
        nullable=True,
    )