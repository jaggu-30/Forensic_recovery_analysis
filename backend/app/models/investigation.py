from datetime import datetime
from uuid import uuid4

from sqlalchemy import Column, DateTime, String, Text

from app.core.database import Base


class Investigation(Base):
    __tablename__ = "investigations"

    id = Column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )

    name = Column(
        String(255),
        nullable=False,
    )

    description = Column(
        Text,
        nullable=True,
    )

    status = Column(
        String(50),
        nullable=False,
        default="CREATED",
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )