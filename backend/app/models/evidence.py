from datetime import datetime
from uuid import uuid4

from sqlalchemy import (
    BigInteger,
    Column,
    DateTime,
    ForeignKey,
    String,
    Text,
)

from app.core.database import Base


class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )

    investigation_id = Column(
        String(36),
        ForeignKey("investigations.id"),
        nullable=False,
    )

    original_filename = Column(
        String(255),
        nullable=False,
    )

    stored_filename = Column(
        String(255),
        nullable=False,
    )

    file_path = Column(
        Text,
        nullable=False,
    )

    file_size = Column(
        BigInteger,
        nullable=False,
    )

    sha256 = Column(
        String(64),
        nullable=False,
        index=True,
    )

    mime_type = Column(
        String(255),
        nullable=True,
    )

    evidence_type = Column(
        String(100),
        nullable=True,
    )

    acquisition_time = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    status = Column(
        String(50),
        nullable=False,
        default="IMPORTED",
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )