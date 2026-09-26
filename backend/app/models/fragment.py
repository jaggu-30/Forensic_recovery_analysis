from sqlalchemy import (
    Column,
    Float,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)

from app.core.database import Base


class Fragment(Base):

    __tablename__ = "fragments"

    __table_args__ = (
        UniqueConstraint(
            "evidence_id",
            "fragment_id",
            name="uq_fragment_evidence_fragment",
        ),
    )

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    fragment_id = Column(
        String(100),
        index=True,
        nullable=False,
    )

    evidence_id = Column(
        String(100),
        ForeignKey("evidence.id"),
        index=True,
        nullable=False,
    )

    offset = Column(
        Integer,
        nullable=False,
    )

    size = Column(
        Integer,
        nullable=False,
    )

    end_offset = Column(
        Integer,
        nullable=False,
    )

    sha256 = Column(
        String(64),
        nullable=False,
    )

    entropy = Column(
        Float,
        nullable=False,
    )

    probable_type = Column(
        String(50),
        nullable=False,
    )

    classification = Column(
        String(100),
        nullable=False,
    )

    confidence = Column(
        Float,
        nullable=False,
    )