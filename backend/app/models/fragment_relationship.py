from sqlalchemy import Column, Float, ForeignKey, Integer, String, Text

from app.core.database import Base


class FragmentRelationship(Base):
    __tablename__ = "fragment_relationships"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    evidence_id = Column(
        String(100),
        ForeignKey("evidence.id"),
        index=True,
        nullable=False,
    )

    source_fragment = Column(
        String(100),
        index=True,
        nullable=False,
    )

    target_fragment = Column(
        String(100),
        index=True,
        nullable=False,
    )

    relationship_type = Column(
        String(50),
        nullable=False,
    )

    score = Column(
        Float,
        nullable=False,
    )

    offset_gap = Column(
        Integer,
        nullable=False,
    )

    entropy_difference = Column(
        Float,
        nullable=False,
    )

    support = Column(
        Text,
        nullable=True,
    )